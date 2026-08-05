# 엘리베이터 파킹 — 인사이트 wrap-up

아파트 뱅크에서 **빈 차를 어디에 둘지**를, **고정 시드 승객 스트림** 위에서 비교하는 포트폴리오 데모입니다.
목표: 레버를 분리하고 Batch로 측정하며, dispatch를 과도하게 튜닝하기 전에 멈춘다.

English: **[INSIGHTS.md](INSIGHTS.md)**

## Takeaways (먼저 읽기)

1. **만능 최적 파킹은 없다.** Evening ingress → Batch N=100에서 평균 대기는 **Lobby**가 1위, Stay는 공차는 싸지만 느리다. Morning egress → **Spread**가 1위(축 커버), Lobby는 꼴찌. 순위는 트래픽에 따라 뒤집힌다 — [`benchmarks/REGIME.md`](benchmarks/REGIME.md).
2. **파킹은 유휴가 있어야 한다.** **IdleFrac**(IDLE|PARKING car-ticks ÷ ticks×대수)를 쓴다. 높으면 parking-sensitive, 아주 낮으면 saturated → 다음 레버는 더 똑똑한 파킹이 아니라 **zoning**. High-arrival Batch(IdleFrac **5%**): Stay−best 대기 격차 **4.63 → 0.90**.
3. **파킹 ≠ 홀 배정.** Sticky nearest-car는 만차에 먼 콜이 묶인 채 IDLE이 놀 수 있다 (seed 42, E1이 `#76@16` 보유, E3/E4는 20층 IDLE). **Reassign**은 고아 콜은 풀지만 근시안이라 Batch N=100에서 Mid 평균 대기가 *나빠졌다* (빈 차가 상행 중인 차의 일을 뺏음).
4. **Policy 노브는 하나만 바꾸고 Batch N=100 before/after.** 산출물은 [`benchmarks/`](benchmarks/). 한 번 Replay로 최적화하지 말 것.

라이브: 포트폴리오 `/elevator/`. 재현: `npm run batch:sticky` · `npm run batch:reassign` · `npm run batch:morning` · `npm run batch:higharrival`.

---

## 인사이트 / 기능 트리

```text
Environment
  ├─ 아파트 OD (lobby↔home)
  ├─ 트래픽 노브 (peak / arrival / interfloor)
  └─ 고정 시나리오 시드 (공정한 재현)
        │
        ▼
Measurement
  ├─ Compare all (한 seed × 전략들)
  ├─ Batch N + CSV
  ├─ Rank-by (avg/max wait, empty, ticks)
  ├─ IdleFrac + 레짐 칩
  ├─ Copy debug 스냅샷
  └─ Rewind / Compare 설정 줄
        │
        ▼
IdleFrac 레짐 ──► parking-sensitive | mixed | saturated
        │                         │
        ▼                         ▼
Policy: Parking              Policy: Zoning (문서만)
  Stay·Lobby·Mid·Spread·Demand
  패널: Policy | Environment | Playback
                                  │
                                  ▼
                         (미구현 — 필요 시 다음)
        │
        └─ 직교 ──► Hall / service dispatch
                              ├─ SCAN (한 방향 끝까지)
                              ├─ 같은 방향 대기자 일괄 탑승
                              └─ 홀 배정: sticky | reassign
                                        │
                                        ▼
                                   Batch A/B 증거
                                   benchmarks/sticky|reassign-n100-seed42
                                   + regime: morning|higharrival
```

---

## 1. 파킹 vs zoning

파킹은 차가 유휴일 때만 효과가 있다. arrival을 올리고 뱅크를 바쁘게 유지하면 전략 격차가 줄고 IdleFrac가 떨어진다 → “항상 붐비면 파킹이 아니라 존.”

| 레짐 | IdleFrac | Stay−best avgWait 격차 | avgWait 1위 |
| --- | ---: | ---: | --- |
| Evening (arr 15%, target 80) | 54% | 4.63 | Lobby |
| Morning (arr 15%, target 80) | 50% | 4.16 | Spread |
| High arrival (arr 90%, target 200) | **5%** | **0.90** | Mid (거의 동률) |

전체 표: [`benchmarks/REGIME.md`](benchmarks/REGIME.md).

데모는 아직 **파킹만** 분리한다. Zoning은 문서상 다음 레버이지 코드에는 없다.

## 2. IdleFrac

`IdleFrac = (IDLE|PARKING car-ticks) / (ticks × elevators)` — 진단용이며 Rank-by 목표가 아니다.

| IdleFrac | 레짐 |
| --- | --- |
| ≥ 25% | parking-sensitive |
| 10–25% | mixed |
| &lt; 10% | saturated |

예: Stay / evening / seed 42 중반 → 유휴 ~62%, 고층에 주차 — parking-sensitive.

## 3. Sticky vs reassign (+ 서비스 규칙)

**서비스 층 (출시됨, Rank-by 목표 아님):** SCAN은 한 방향을 끝낸 뒤 반전한다. 도어가 열리면 그 층의 **같은 방향** 대기자는 모두 탈 수 있다. 파킹·배정 실험 전에 collective 동작이 말이 되게 한다.

**Sticky:** 도착 순간 한 번 배정. **Reassign:** 매 틱 대기 홀콜 배정을 지우고 다시 스코어.

Sticky 병리 (seed 42, Stay, evening, ~tick 650) — Copy debug로 포착:

```text
E1 MOVING ↑ load 4  pickup #76 @16→L1
E3 IDLE @20
E4 IDLE @20
```

더 가까운 IDLE이 sticky에서는 콜을 못 뺏는다. SCAN 때문에 반대 방향 탑승은 더 늦어진다.

Batch N=100, seeds 42…141, 기본 evening Environment ([COMPARE](benchmarks/COMPARE.md)):

| 전략 | Sticky 대기 | Reassign 대기 | Sticky max | Reassign max |
| --- | ---: | ---: | ---: | ---: |
| Lobby | 1.60 | 1.66 | 18.1 | 16.6 |
| Mid | 4.17 | **5.02** | 12.8 | 17.1 |
| Stay | 6.23 | 6.04 | 29.5 | **24.3** |

Reassign은 Stay 긴 꼬리(max)에 도움이 되고, Mid는 빈 중간층 차가 상행 차가 en-route로 태울 콜을 가로채 공차가 늘며 손해 본다. Cost는 거리·부하·가벼운 방향항이지 그룹 ETA가 아니다.

**여기서 멈춤:** idle-steal / 마진 변형은 하지 않음.

## 4. 전략 카탈로그 + Batch

베이스라인: Stay / Lobby / Mid / Spread / Demand. Batch N + Rank-by는 “*이* 레짐에서 누가 이기는가?”에 답한다 — 전역 최적 아님.

Policy / Environment / Playback 패널은 나중에 zoning을 넣을 자리를 남겨 둔다.

---

## Limitations (한계)

이것은 **합성 의사결정 랩**이지, 캘리브레이션된 엘리베이터 컨트롤러 연구가 아니다.

- 도착은 Bernoulli(틱당 최대 1명)이며 실제 빌딩 로그에 맞춘 것이 아니다.
- 시간은 이산 tick; dwell/capacity는 단순 노브다.
- 홀 비용은 거리·부하·가벼운 방향항 — **그룹 ETA / destination control 아님**.
- 실제 뱅크의 OD·도어타임·에너지 없음 → 순위를 **건물 정책 추천으로 쓰지 말 것**.
- Batch **winRate**는 tie를 각 전략에 세어 합이 100%를 넘을 수 있다.

연습 대상은 **레버 분리, 공정 A/B, 레짐 진단**. 실무라면 arrival/OD/dwell을 먼저 맞춘 뒤 같은 Batch 프레임을 재사용한다.

---

## Interview questions (면접 Q)

OA / 분석 면접용 짧은 답변 골격.

1. **왜 avg wait / max wait / empty travel를 나누나?**  
   단일 최적 없음 — evening 대기는 Lobby, 공차는 Stay, morning은 Spread. Rank-by로 레짐별 tradeoff를 드러낸다.

2. **reassign에서 Mid 평균 대기가 나빠진 이유?**  
   근시안 idle steal: 빈 중간층 차가 상행 차가 en-route로 처리할 콜을 가로챔. Evening N=100: Mid 4.17 → **5.02** ([COMPARE](benchmarks/COMPARE.md)). Stay max는 고아 콜 해소로 개선.

3. **IdleFrac가 아주 낮을 때 파킹을 더 튜닝할까?**  
   No. IdleFrac **5%** high-arrival Batch에서 Stay−best 격차는 **0.90** — 파킹은 거의 안 움직인다. 다음 레버는 **zoning**(문서만, 미구현).

4. **실제 빌딩 데이터가 있으면 뭘 먼저 맞출까?**  
   TOD별 OD·arrival intensity, 그다음 dwell·capacity utilization. Environment에 고정한 뒤 같은 seeded Batch / Compare로 정책 A/B.

5. **실무에서 이 시뮬을 어떻게 쓰나?**  
   “어떤 트래픽에서 어떤 idle-placement?”를 실험하는 하네스. 캘리브레이션·현장 지표 없이 벤더 컨트롤러를 바꾸라는 증거가 아니다.

---

## 스코프 동결

| In | Out (의도적) |
| --- | --- |
| 위 트리 + Batch A/B + 레짐 민감도 + Copy debug | idle-steal 튜닝, zoning 코드, office OD, 에너지, MDP 로비 대수 |

포트폴리오 내러티브에 필요할 때만 이어서 — 로컬 점수 쫓기용은 아님.
