# Elevator parking — insight wrap-up

Portfolio demo of **where idle cars wait** in an apartment bank, on a **fixed seeded passenger stream**.
Goal: separate levers, measure with Batch, stop before over-tuning dispatch.

한국어: **[INSIGHTS.ko.md](INSIGHTS.ko.md)**

## Takeaways (read this first)

1. **No universal best parking policy.** Evening ingress → Lobby wins mean wait (Batch N=100); Stay is cheap on empty travel but slow. Morning egress → shaft coverage wins: **Optimized** (p-median) first, Spread best baseline; Lobby is last. Rankings flip with traffic — see [`benchmarks/REGIME.md`](benchmarks/REGIME.md).
2. **Parking needs idle time.** Use **IdleFrac** (IDLE|PARKING car-ticks ÷ ticks×cars). High → parking-sensitive; very low → saturated → next lever is **zoning**, not smarter parking. High-arrival Batch (IdleFrac **5%**): Stay−best wait gap shrinks from **4.63 → 0.90**.
3. **Parking ≠ hall dispatch.** Sticky nearest-car can leave IDLE cars unused while a loaded car holds a far call (seed 42, `#76@16` on E1 while E3/E4 IDLE@20). Full **reassign** fixes orphans but is myopic — Mid mean wait got *worse* on Batch N=100 (idle cars steal work from productive up-trips).
4. **Change one Policy knob; Batch N=100 before/after.** Artifacts under [`benchmarks/`](benchmarks/). Don’t optimize on a single replay.

Live demo: portfolio `/elevator/`. Reproduce: `npm run batch:sticky` · `npm run batch:reassign` · `npm run batch:morning` · `npm run batch:higharrival`.

---

## Insight / capability tree

```text
Environment
  ├─ Apartment OD (lobby↔home)
  ├─ Traffic knobs (peak / arrival / interfloor)
  └─ Fixed scenario seed (fair replay)
        │
        ▼
Measurement
  ├─ Compare all (one seed × strategies)
  ├─ Batch N + CSV
  ├─ Rank-by (avg/max wait, empty, ticks)
  ├─ IdleFrac + regime chip
  ├─ Copy debug snapshot
  └─ Rewind / Compare settings line
        │
        ▼
IdleFrac regime ──► parking-sensitive | mixed | saturated
        │                         │
        ▼                         ▼
Policy: Parking              Policy: Zoning (docs only)
  Stay·Lobby·Mid·Spread·Demand·Optimized (p-median)
  panel: Policy | Environment | Playback
                                  │
                                  ▼
                         (not built — next if needed)
        │
        └─ orthogonal ──► Hall / service dispatch
                              ├─ SCAN (finish direction)
                              ├─ Same-dir board-all on doors
                              └─ Hall assign: sticky | reassign
                                        │
                                        ▼
                                   Batch A/B evidence
                                   benchmarks/sticky|reassign-n100-seed42
                                   + regime: morning|higharrival
```

---

## 1. Parking vs zoning

Parking only acts when cars idle. Raise arrival (and keep the bank busy) → strategy gaps shrink and IdleFrac falls → “when always busy, zone not park.”

| Regime | IdleFrac | Stay−best avgWait gap | 1st by avgWait |
| --- | ---: | ---: | --- |
| Evening (arr 15%, target 80) | 54% | 4.63 | Lobby |
| Morning (arr 15%, target 80) | 50% | 4.83 | Optimized (Spread best baseline) |
| High arrival (arr 90%, target 200) | **5%** | **0.90** | Mid (≈ tied pack) |

Full table: [`benchmarks/REGIME.md`](benchmarks/REGIME.md).

Demo still isolates **parking** only. Zoning stays a documented next lever, not coded.

## 2. IdleFrac

`IdleFrac = (IDLE|PARKING car-ticks) / (ticks × elevators)` — diagnostic, not Rank-by objective.

| IdleFrac | Regime |
| --- | --- |
| ≥ 25% | parking-sensitive |
| 10–25% | mixed |
| &lt; 10% | saturated |

Example: Stay / evening / seed 42 mid-run → ~62% idle with cars parked high — parking-sensitive.

## 3. Sticky vs reassign (+ service rules)

**Service layer (shipped, not a Rank-by objective):** SCAN finishes one direction before reversing; when doors open, all same-direction waiters at that floor may board. These make collective behavior believable before parking/dispatch experiments.

**Sticky:** assign once at arrival. **Reassign:** clear waiting hall assignments each tick and rescore.

Sticky pathology (seed 42, Stay, evening, ~tick 650) — caught via Copy debug:

```text
E1 MOVING ↑ load 4  pickup #76 @16→L1
E3 IDLE @20
E4 IDLE @20
```

Closer IDLE never steals under sticky. SCAN delays opposite-direction boarding further.

Batch N=100, seeds 42…141, default evening Environment ([COMPARE](benchmarks/COMPARE.md)):

| Strategy | Sticky wait | Reassign wait | Sticky max | Reassign max |
| --- | ---: | ---: | ---: | ---: |
| Lobby | 1.60 | 1.66 | 18.1 | 16.6 |
| Mid | 4.17 | **5.02** | 12.8 | 17.1 |
| Stay | 6.23 | 6.04 | 29.5 | **24.3** |

Reassign helps Stay’s long tail; Mid loses because empty mid cars greedily steal calls that ascending cars would have served en route (more empty travel). Cost is distance + load + light direction terms — not group ETA.

**Stopped here:** no idle-steal / margin variants.

## 4. Strategy catalog + Batch

Baselines: Stay / Lobby / Mid / Spread / Demand. Batch N + Rank-by answers “who wins *this* regime?” — not a global optimum.

Policy vs Environment vs Playback panels keep future zoning in the right place without building it yet.

## 5. Optimized parking (p-median, Gurobi)

`tools/optimize_parking.py` solves a **p-median** model offline in gurobipy; the simulator looks the answer up at run time (`data/optimized-parking.json`).

**Model** — for each traffic period, height *F* and number of idle cars *k*:

```text
w_i   = P(next call originates at floor i)        — exactly pickOrigin():
        lobby share p (morning .10 / evening .90 / midday .45), rest uniform over 2..F
y_j   ∈ {0,1}  park a car at floor j
x_ij  ∈ [0,1]  origin i served by the car parked at j

min   Σ_i Σ_j  w_i · |i − j| · x_ij          expected floors from nearest parked car to the next call
s.t.  Σ_j x_ij = 1           ∀ i              every origin is covered
      x_ij ≤ y_j             ∀ i, j           only by an open parking floor
      Σ_j y_j = k                             k idle cars
```

Solved for all UI settings (3 periods × F 8–40 × k 1–8 = 792 MIPs, ~5 s); each matches an exact 1-D DP. Example, F=20, k=4: morning `[2, 7, 13, 18]`, evening `[1, 6, 11, 17]`, midday `[1, 7, 12, 18]`.

**Runtime rule:** k = cars currently IDLE|PARKING. Sort those cars and the k floors, match in order (min-travel matching on a line; no target swapping).

Batch N=100, seeds 42…141, sticky, 20F · 4 cars · arrival 15%:

| Period | Optimized avgWait | Best baseline | Optimized rank |
| --- | ---: | --- | ---: |
| Morning | **3.69** | Spread 4.36 | 1 |
| Midday | **2.74** | Spread 3.18 | 1 |
| Evening | 1.75 | Lobby 1.60 | 3 (best max wait 13.7 vs 18.1) |
| High arrival (90%) | 34.44 | Mid 34.43 | ≈ tie (saturated) |

Why evening loses: p-median optimizes distance to the **next** call only. With 90% lobby origins, Lobby stacks every idle car at L1 and absorbs *bursts*; p-median keeps one car there and spreads the rest for upper-floor coverage — better tail, slightly worse mean. A queueing-aware objective (or k-dependent lobby count, the MDP direction) is the next step. Optimized also spends the most empty travel — it rebalances whenever k changes.

Regenerate: `.venv/bin/python tools/optimize_parking.py` (writes the JSON plus a `.js` mirror so `index.html` still works over `file://`).

---

## Limitations

This is a **synthetic decision lab**, not a calibrated elevator controller study.

- Arrivals are Bernoulli (at most one passenger per tick), not fitted building logs.
- Time is discrete ticks; dwell/capacity are simplified knobs.
- Hall cost is distance + load + light direction terms — **not** group ETA / destination control.
- No empirical OD, door times, or energy from a real bank → do **not** treat rankings as a building recommendation.
- Batch **winRate** can sum above 100% because ties count for every tied strategy.

Use it to practice **lever separation, fair A/B, and regime diagnostics**. For real ops: calibrate arrival/OD/dwell first, then reuse the same Batch frame.

---

## Interview questions

Short answer spines for OA / analytics interviews.

1. **Why split objectives (avg wait / max wait / empty travel) instead of one score?**  
   No single optimum — Lobby wins evening wait, Stay wins empty travel, morning flips to shaft coverage (Optimized, then Spread). Rank-by exposes tradeoffs per regime instead of hiding them in a weighted mash.

2. **Why did Mid mean wait get worse under reassign?**  
   Myopic idle steal: empty mid cars grab calls that ascending cars would have served en route. Evening N=100: Mid avgWait 4.17 → **5.02** ([COMPARE](benchmarks/COMPARE.md)). Stay’s max wait improved (orphan fix).

3. **If IdleFrac is very low, should we keep tuning parking?**  
   No. High-arrival Batch at IdleFrac **5%** collapses Stay−best gap to **0.90** — parking barely moves the needle. Next lever is **zoning** (documented, not coded).

4. **What would you calibrate first with real building data?**  
   Time-of-day OD and arrival intensity, then dwell and capacity utilization. Freeze those into the Environment, keep the same seeded Batch / Compare frame for policy A/B.

5. **How would you use this at work?**  
   As an experiment harness for “which idle-placement policy under which traffic?” — not as proof to swap a vendor controller without calibration and field metrics.

---

## Scope freeze

| In | Out (on purpose) |
| --- | --- |
| Tree above + Batch A/B + regime sensitivity + Copy debug | idle-steal tuning, zoning code, office OD, energy, MDP lobby count |

Further work only if a portfolio narrative needs it — not for local score chasing.
