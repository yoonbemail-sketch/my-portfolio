# 엘리베이터 파킹 — 인사이트 wrap-up

아파트 뱅크에서 **빈 차를 어디에 둘지**를, **고정 시드 승객 스트림** 위에서 비교하는 포트폴리오 데모입니다.
목표: 레버를 분리하고 Batch로 측정하며, dispatch를 과도하게 튜닝하기 전에 멈춘다.

English: **[INSIGHTS.md](INSIGHTS.md)**

## Takeaways (먼저 읽기)

1. **만능 최적 파킹은 없다.** Evening ingress → 평균 대기는 Lobby/Demand가 강하고, Stay는 공차 이동은 싸지만 느리다. Morning egress는 축 커버(Spread/Demand)가 유리한 경우가 많다. 순위는 트래픽에 따라 바뀐다 — boarding 방식과 같다.
2. **파킹은 유휴가 있어야 한다.** **IdleFrac**(IDLE|PARKING car-ticks ÷ ticks×대수)를 쓴다. 높으면 parking-sensitive, 아주 낮으면 saturated → 다음 레버는 더 똑똑한 파킹이 아니라 **zoning**.
3. **파킹 ≠ 홀 배정.** Sticky nearest-car는 만차에 먼 콜이 묶인 채 IDLE이 놀 수 있다 (seed 42, E1이 `#76@16` 보유, E3/E4는 20층 IDLE). **Reassign**은 고아 콜은 풀지만 근시안이라 Batch N=100에서 Mid 평균 대기가 *나빠졌다* (빈 차가 상행 중인 차의 일을 뺏음).
4. **Policy 노브는 하나만 바꾸고 Batch N=100 before/after.** 산출물은 [`benchmarks/`](benchmarks/). 한 번 Replay로 최적화하지 말 것.

라이브: 포트폴리오 `/elevator/`. A/B 재현: `npm run batch:sticky` · `npm run batch:reassign`.

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
```

---

## 1. 파킹 vs zoning

파킹은 차가 유휴일 때만 효과가 있다. 같은 seed에서 arrival을 올리면 Compare-all 격차가 줄고 IdleFrac가 떨어진다 → “항상 붐비면 파킹이 아니라 존.”

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

## 스코프 동결

| In | Out (의도적) |
| --- | --- |
| 위 트리 + Batch A/B + Copy debug | idle-steal 튜닝, zoning 코드, office OD, 에너지, MDP 로비 대수 |

포트폴리오 내러티브에 필요할 때만 이어서 — 로컬 점수 쫓기용은 아님.
