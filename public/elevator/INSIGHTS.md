# Operational insights — update tree

Living notes from running the apartment elevator parking demo.
Each node is a **lever or diagnostic** we learned, with one concrete example.
Product code may lag; “Next” marks follow-on experiments.

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
Hall-call dispatch (orthogonal to parking) ◄──────┘
   sticky nearest-car ──► reassignment (future)
        │
        ▼
   Batch N / Rank-by  (measure which baseline wins *this* regime)
```

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

## 3. Sticky hall-call assignment

**Claim.** Hall calls use nearest-car cost **when the passenger appears**, then **stick**. A later closer IDLE does not steal the call. SCAN delays opposite-direction pickups until the assigned car finishes its current direction. Parking (where idle cars wait) and **call reassignment** are separate levers.

**Example** (Copy debug, seed 42, Stay, evening, tick 650):

```text
## Metrics
idleFrac: 62% (parking)
completed: 74 / 80

## Elevators
E1: MOVING @ 9 ↑ load 4/8
  riders: #77 L1→15, #78 L1→19, #79 L1→20, #80 L1→15
  pickup: #76 @16→L1          ← down call stuck on up-bound car
  stops: 15, 16, 19, 20
E2: MOVING @ 3 ↓ load 0/8
  pickup: #73 @2→L1
E3: IDLE @ 20 · load 0/8      ← closer to 16 than E1
E4: IDLE @ 20 · load 0/8

## Hall waiting
16 (1): #76→L1 arr=619
2 (1): #73→L1 arr=606
```

Cost *now* would prefer E3/E4 (`|20−16|=4`) over E1 (~20 with load + opposite-dir penalties), but `#76` was assigned at `arr=619` and never moved. E1 is still climbing; SCAN will not board the down call at 16 until upward stops clear.

**Shipped.** Documented only (behavior unchanged).

**Next.** Re-score unboarded assignments each tick so nearer IDLE can steal.

---

## 4. Strategy catalog + Batch N

**Claim.** There is no universal best parking policy. Rankings depend on traffic regime — like boarding methods. Use **Batch N** (and Rank-by) to see which baseline wins *for this Environment*, not “the” optimum.

**Example.** Evening + moderate arrival: Lobby often wins mean wait over Stay. Morning egress: Spread / Demand-like coverage often beats Lobby. Same Batch with Rank-by **empty travel** can reorder winners — objective choice is part of the experiment.

**Shipped.** Catalog in docs; Batch N + CSV; Rank-by avg/max wait, empty, ticks; Policy vs Environment panel split (zoning slot reserved under Policy).

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

Keep this file as the canonical tree; README and portfolio posts should summarize and link here when they grow.
