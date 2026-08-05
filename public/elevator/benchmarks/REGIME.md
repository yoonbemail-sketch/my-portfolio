# Regime sensitivity — Batch N=100 (sticky, seeds 42…141)

Parking rankings flip with traffic. Same bank (20F / 4 cars / cap 8 / dwell 2 / interfloor 10%), sticky hall dispatch.

| Regime | Settings | IdleFrac | 1st by avgWait | Lobby avgWait | Stay avgWait | Stay−best gap | Read |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Evening (default) | peak evening · arrival 15% · target 80 | 54% parking | **Lobby** 1.60 | 1.60 | 6.23 | 4.63 | Ingress → lobby parking wins wait |
| Morning | peak morning · arrival 15% · target 80 | 50% parking | **Spread** 4.36 | 8.97 | 8.52 | 4.16 | Egress → shaft coverage (Spread/Mid/Demand); Lobby last |
| High arrival | peak evening · arrival 90% · target 200 | **5% saturated** | Mid 34.43 | 35.20 | 35.33 | **0.90** | Strategy gaps collapse; parking barely matters |

Folders: `sticky-n100-seed42/` · `morning-n100-seed42/` · `higharrival-n100-seed42/`

Reproduce:

```bash
npm run batch:sticky
npm run batch:morning
npm run batch:higharrival
```

Notes:

- High-arrival uses `target 200` so the bank stays busy long enough for IdleFrac &lt; 10% (arrival 50% / target 80 stays *mixed*).
- winRate can sum above 100% because ties count for every tied strategy.
- Sticky vs reassign A/B remains evening-only — see [COMPARE.md](COMPARE.md).
