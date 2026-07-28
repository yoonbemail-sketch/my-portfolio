# Operational insights — update tree

Living notes from running the apartment elevator parking demo.
Each node is a **lever or diagnostic** we learned, with one concrete example.

**Method.** Before changing a Policy lever (parking, hall dispatch, future zoning), run **Batch N=100** on the current settings, save CSV/summary under `benchmarks/`, then change one thing and re-batch with the same seeds. Compare mean wait / max / empty / IdleFrac — not vibes.

```text
Traffic / building (Environment)
        │
        ▼
   IdleFrac regime ─────────────────────────────┐
   parking-sensitive / mixed / saturated          │
        │                                         │
        ├─ high idle ──► Parking policy (Policy)  │
        │                 Stay·Lobby·Mid·Spread·Demand
        │                                         │
        └─ saturated ──► Zoning (future Policy)   │
                          odd/even · low/high     │
                                                  │
Hall-call dispatch (Policy, orthogonal) ◄─────────┘
   sticky nearest-car ──► reassign each tick
        │
        ▼
   Batch N / Rank-by  (measure which baseline wins *this* regime)
```

CLI: `node tools/run-batch.mjs --dispatch sticky|reassign --n 100 --seed 42 --out benchmarks/…`

---

## 1. Parking vs zoning

**Claim.** Parking only has room to act when cars spend time idle. Under saturation, cars rarely park — the useful lever shifts to **service zoning**.

**Example.** Same seed, evening ingress: raise **Arrival rate** and run **Compare all**. Strategy gaps in avg wait often shrink while IdleFrac falls — “when the bank is always busy, zone not park.”

**Shipped.** Insight in README / plan / blog; demo still isolates parking only.

**Next.** Odd/even or low/high banks under Policy.

---

## 2. IdleFrac (saturation diagnostic)

**Claim.**  
`IdleFrac = (IDLE|PARKING car-ticks) / (ticks × elevators)`.  
Not a ranking objective — a regime chip:

| IdleFrac | Regime | Hint |
| --- | --- | --- |
| ≥ 25% | `parking-sensitive` | Parking baselines can separate |
| 10–25% | `mixed` | Both levers may matter |
| &lt; 10% | `saturated` | Prefer zoning experiments |

**Example.** Default evening Stay, seed 42, mid-run Copy debug: `idleFrac: 62% (parking)` with two cars IDLE at 20 while others still serve — classic parking-sensitive bank.

**Shipped.** Live metric + Compare/Batch Idle % + CSV `idleFrac`; Rank-by stays avg/max wait, empty, ticks.

---

## 3. Sticky vs reassign hall-call dispatch

**Claim.** Hall calls use nearest-car cost **when the passenger appears**. Under **sticky**, that assignment never moves — a later closer IDLE does not steal the call. SCAN delays opposite-direction pickups until the assigned car finishes its current direction. **Reassign** clears waiting hall assignments each tick and rescores — parking (where idle cars wait) and dispatch are separate levers.

**Example — sticky pathology** (Copy debug, seed 42, Stay, evening, tick ~645–650):

```text
## Metrics
idleFrac: 62% (parking)
completed: 74 / 80

## Elevators
E1: MOVING @ 4–9 ↑ load 4/8
  riders: #77 L1→15, #78 L1→19, #79 L1→20, #80 L1→15
  pickup: #76 @16→L1          ← down call stuck on up-bound car
E3: IDLE @ 20 · load 0/8      ← closer to 16 than E1
E4: IDLE @ 20 · load 0/8

## Hall waiting
16 (1): #76→L1 arr=619
```

Cost *now* prefers E3/E4 (`|20−16|=4`) over E1, but `#76` was assigned at `arr=619` and never moved under sticky.

**Benchmark (before → after).** Same Environment: evening, arrival 15%, interfloor 10%, 20F / 4 cars / cap 8 / dwell 2 / target 80, seeds **42…141**, Rank-by avg wait.

| Strategy | Sticky mean wait | Reassign mean wait | Δ wait | Sticky max | Reassign max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lobby | 1.60 | 1.66 | +0.06 | 18.1 | 16.6 |
| Demand | 1.64 | 1.67 | +0.03 | 18.0 | 16.2 |
| Spread | 3.79 | 3.84 | +0.05 | 21.0 | 17.0 |
| Mid | 4.17 | 5.02 | **+0.85** | 12.8 | 17.1 |
| Stay | 6.23 | 6.04 | **−0.19** | 29.5 | **24.3** |

Artifacts: [`benchmarks/sticky-n100-seed42/`](benchmarks/sticky-n100-seed42/) · [`benchmarks/reassign-n100-seed42/`](benchmarks/reassign-n100-seed42/)

**Read.** On this evening / parking-sensitive regime, reassign is **not** a free lunch on mean wait (Lobby/Demand already good; Mid gets worse). Stay’s **max wait** drops (~29 → ~24) — sticky’s long-tail pickups get stolen. Always Batch-before / Batch-after when changing dispatch.

**Shipped.** Policy → **Hall dispatch** toggle (`sticky` | `reassign`); Batch/CSV include `hallDispatch`; headless CLI above.

---

## 4. Strategy catalog + Batch N

**Claim.** There is no universal best parking policy. Rankings depend on traffic regime — like boarding methods. Use **Batch N** (and Rank-by) to see which baseline wins *for this Environment*, not “the” optimum.

**Example.** Evening + moderate arrival (sticky baseline above): Lobby ≈ Demand win mean wait; Stay is last but cheapest empty travel. Morning egress often favors Spread / Demand-like coverage over Lobby. Rank-by **empty travel** can reorder winners.

**Shipped.** Catalog in docs; Batch N + CSV; Rank-by avg/max wait, empty, ticks; Policy vs Environment panel split.

---

## Chronological update log

| When (approx) | Node | What changed |
| --- | --- | --- |
| Traffic docs | Environment knobs | Documented peak / arrival / interfloor OD |
| Same-floor board | Dispatch | Board all same-direction waiters when doors open |
| Copy debug | Ops | Seed + settings + elev/hall snapshot for forensics |
| Parking vs zoning | Insight §1 | Document idle vs saturated levers |
| Strategy catalog + Batch | Insight §4 | Baselines table + Monte Carlo N seeds |
| Batch visual / Rank-by | Insight §4 | Readable ranking UI + objective toggle |
| IdleFrac + panels | Insight §2 | Live/Batch Idle % + Policy/Environment/Playback |
| Sticky assignment | Insight §3 | Document sticky nearest-car + snapshot example |
| Hall reassign + Batch A/B | Insight §3 | Policy toggle; sticky vs reassign N=100 artifacts; Batch-before method |
