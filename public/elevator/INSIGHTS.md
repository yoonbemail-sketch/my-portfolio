# Elevator parking — insight wrap-up

Portfolio demo of **where idle cars wait** in an apartment bank, on a **fixed seeded passenger stream**.
Goal: separate levers, measure with Batch, stop before over-tuning dispatch.

## Takeaways (read this first)

1. **No universal best parking policy.** Evening ingress → Lobby/Demand win mean wait; Stay is cheap on empty travel but slow. Morning egress often prefers shaft coverage (Spread/Demand). Rankings flip with traffic — like boarding methods.
2. **Parking needs idle time.** Use **IdleFrac** (IDLE|PARKING car-ticks ÷ ticks×cars). High → parking-sensitive; very low → saturated → next lever is **zoning**, not smarter parking.
3. **Parking ≠ hall dispatch.** Sticky nearest-car can leave IDLE cars unused while a loaded car holds a far call (seed 42, `#76@16` on E1 while E3/E4 IDLE@20). Full **reassign** fixes orphans but is myopic — Mid mean wait got *worse* on Batch N=100 (idle cars steal work from productive up-trips).
4. **Change one Policy knob; Batch N=100 before/after.** Artifacts under [`benchmarks/`](benchmarks/). Don’t optimize on a single replay.

```text
Environment (OD, arrival, building)
        │
        ▼
   IdleFrac → parking-sensitive | mixed | saturated
        │                         │
        ▼                         ▼
   Parking policy            Zoning (not built)
   Stay·Lobby·Mid·Spread·Demand
        │
        └─ orthogonal → Hall dispatch (sticky | reassign)
                              │
                              ▼
                         Batch N / Rank-by
```

Live demo: portfolio `/elevator/`. Reproduce A/B: `npm run batch:sticky` · `npm run batch:reassign`.

---

## 1. Parking vs zoning

Parking only acts when cars idle. Raise arrival on the same seed → Compare-all gaps shrink and IdleFrac falls → “when always busy, zone not park.”

Demo still isolates **parking** only. Zoning stays a documented next lever, not coded.

## 2. IdleFrac

`IdleFrac = (IDLE|PARKING car-ticks) / (ticks × elevators)` — diagnostic, not Rank-by objective.

| IdleFrac | Regime |
| --- | --- |
| ≥ 25% | parking-sensitive |
| 10–25% | mixed |
| &lt; 10% | saturated |

Example: Stay / evening / seed 42 mid-run → ~62% idle with cars parked high — parking-sensitive.

## 3. Sticky vs reassign

**Sticky:** assign once at arrival. **Reassign:** clear waiting hall assignments each tick and rescore.

Sticky pathology (seed 42, Stay, evening, ~tick 650):

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

**Stopped here:** no idle-steal / margin variants. Portfolio story is complete without another dispatch mode.

## 4. Strategy catalog + Batch

Baselines: Stay / Lobby / Mid / Spread / Demand. Batch N + Rank-by (avg/max wait, empty, ticks) answers “who wins *this* regime?” — not a global optimum.

Policy vs Environment vs Playback panels keep future zoning in the right place without building it yet.

---

## Scope freeze

| In | Out (on purpose) |
| --- | --- |
| Parking catalog, IdleFrac, sticky/reassign, Batch A/B, Copy debug | idle-steal tuning, zoning code, office OD, energy, MDP lobby count |

Further work only if a portfolio narrative needs it — not for local score chasing.
