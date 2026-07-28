# Sticky vs reassign — Batch N=100 (seed 42…141)

Default evening Environment (arrival 15%, interfloor 10%, 20F / 4 / cap 8 / dwell 2 / target 80).

| Strategy | Sticky avgWait | Reassign avgWait | Δ | Sticky maxWait | Reassign maxWait |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lobby | 1.60 | 1.66 | +0.06 | 18.1 | 16.6 |
| Demand | 1.64 | 1.67 | +0.03 | 18.0 | 16.2 |
| Spread | 3.79 | 3.84 | +0.05 | 21.0 | 17.0 |
| Mid | 4.17 | 5.02 | +0.85 | 12.8 | 17.1 |
| Stay | 6.23 | 6.04 | −0.19 | 29.5 | 24.3 |

Folders: `sticky-n100-seed42/` · `reassign-n100-seed42/`  
Reproduce: `npm run batch:sticky` · `npm run batch:reassign`
