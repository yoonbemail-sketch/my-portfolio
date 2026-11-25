# Regime sensitivity — Batch N=100 (sticky, seeds 42…141)

Parking rankings flip with traffic. Same bank (20F / 4 cars / cap 8 / dwell 2 / interfloor 10%), sticky hall dispatch.

| Regime | Settings | IdleFrac | 1st by avgWait | Lobby avgWait | Stay avgWait | Stay−best gap | Read |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Evening (default) | peak evening · arrival 15% · target 80 | 54% parking | **Lobby** 1.60 | 1.60 | 6.23 | 4.63 | Ingress → lobby parking wins wait (Optimized 3rd, 1.75) |
| Morning | peak morning · arrival 15% · target 80 | 50% parking | **Optimized** 3.69 | 8.97 | 8.52 | 4.83 | Egress → shaft coverage; p-median beats the best baseline (Spread 4.36); Lobby last |
| Midday | peak midday · arrival 15% · target 80 | 48% parking | **Optimized** 2.74 | 4.44 | 3.76 | 1.03 | Mixed origins → Optimized, then Spread 3.18; Lobby last |
| High arrival | peak evening · arrival 90% · target 200 | **5% saturated** | Mid 34.43 | 35.20 | 35.33 | **0.90** | Strategy gaps collapse; parking barely matters (Optimized 34.44 ≈ tie) |

Folders: `sticky-n100-seed42/` · `morning-n100-seed42/` · `midday-n100-seed42/` · `higharrival-n100-seed42/`

Reproduce:

```bash
npm run batch:sticky
npm run batch:morning
npm run batch:midday
npm run batch:higharrival
```

Notes:

- High-arrival uses `target 200` so the bank stays busy long enough for IdleFrac &lt; 10% (arrival 50% / target 80 stays *mixed*).
- Includes **Optimized** (p-median, `tools/optimize_parking.py`). Adding it lowered other strategies' winRate; their avgWait/maxWait rows are unchanged.
- The simple view's answer card quotes the evening, morning and midday rows (best vs Stay avgWait).
- winRate can sum above 100% because ties count for every tied strategy.
- Sticky vs reassign A/B remains evening-only — see [COMPARE.md](COMPARE.md).
