# best-game-01-2

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/jmjuve/best-game-01-2/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/jmjuve/best-game-01-2/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Stormwright — Weatherwright of the Vale: a novel weather-steering game. Draw wind lanes to steer rain, storm, snow and ember clouds over your fields, feed your crops, strike blight with lightning, and meet every season's harvest quota.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=vt2v2aqg&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

# ⛈ Stormwright — Weatherwright of the Vale

A complete, original browser game built for the make.fun **best-game-01**
bounty ("Make the best game"). You are the weatherwright of a small valley:
draw wind lanes across the sky to steer clouds over your fields, feed your
crops, strike blight with lightning, and meet every season's harvest quota
before the clock runs out.

## How to play

- **Draw wind** — drag across the sky. Clouds inside a lane follow it.
  Wind costs ink; ink regenerates.
- **Feed the fields** — rain waters, ember light ripens, snow kills blight,
  storm clouds water and charge lightning.
- **Harvest** — click a ripe crop (✦) for gold. Fast harvests chain a combo.
- **Strike** — click a storm cloud (⚡) to smite blight with lightning.
- **Survive the seasons** — meet the quota before the clock runs out, draft
  one of three charms between seasons, and finish all 6 seasons for the
  best grade (S–D).

## Controls

| Input | Action |
| --- | --- |
| Drag (mouse) | Draw a wind lane |
| Click | Harvest a ripe crop / strike from a storm cloud |
| Space / Enter | Start, restart |
| P / Esc | Pause |
| M | Mute |
| L | Strike from the nearest storm cloud |
| 1 / 2 / 3 | Pick a charm on the draft screen |
| ← / → | Choose difficulty on the title screen |

## Systems

- **4 cloud types** (rain, storm, snow, ember) with a visible forecast queue
- **4 crops** (wheat, pumpkin, berry, moonmelon) with water, sun and growth
- **Blight** that wakes on dry crops and spreads to neighbours
- **12 charms** drafted one per season, persistent for the whole run
- **3 difficulties** (Gentle Breeze, Steady Gale, Tempest)
- **10 feats**, grades S–D, combo scoring, best score and a hall of runs
  saved locally
- **Synthesised sound** (Web Audio, no audio files): wind, rain, thunder,
  harvest chimes and a valley pad

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

No build step, no network requests: `game/` is plain static files and
`game/index.html` plays offline.

## Screenshots

`screenshots/` holds four renders of the game's own code in a browser:
title, play, charm draft and ending (`?shot=start|play|draft|end&seed=7`).

## License

MIT — see `LICENSE`.
