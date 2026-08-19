# THE KILN
### a gas reduction firing · one night · everybody's work is in there
*a DIRTY BOY DEVS game*

> you can't see in. you can't undo. and it isn't only your work in there.

You fire the kiln at a small community pottery. Nine people share the studio and
firing is your job. You load everybody's work onto nine named shelves — where a piece
goes decides what it becomes — brick up the door, and then steer twelve hours of fire
you cannot see by three knobs, a spyhole, a stack of bending cones, and the sound the
kiln makes. Then it cools, which takes longer than the firing did. Then you open it.

**Play:** double-click `PLAY-THE-KILN.bat` (or `node serve.mjs`) → http://localhost:8461

## Controls
- **gas · primary air · the damper** — click a detent. Every change takes 15–30 sim
  minutes to show up, so you are always steering the kiln of twenty minutes ago.
  The orange ghost on a control is where your last adjustment is still travelling.
- **speed** — 1× / 30× / 120× / 600×. It drops to 1× the moment the kiln wants something.
- **m** — mute.

## Reading it
- **the spyhole** — long, orange, licking = reducing. short, blue, bushy = oxidising.
  green-tinted = neutral. This is the real instrument.
- **the cone packs** — cones measure *heat work*, the integral of time and temperature.
  The left pack tells you when to start reduction; the right pack tells you when you're done.
- **the pyrometer** — reads temperature, not heat work. It will lie to you and the
  notebook will eventually explain why.

## The one-way door
> *"If you begin reducing later than 06, you may have missed reduction and will not get any."*

That's real, it's in the game, and nothing reopens it.

## Files
| | |
|---|---|
| `kiln/data.js` | every number in the game. Nothing outside it invents one. |
| `kiln/sim.js` | the firing. DOM-free, Node-importable, seeded, deterministic. |
| `kiln/pot.js` | the pot generator. One scalar thickness field drives the whole surface. |
| `kiln/main.js` | phases, UI, save. The only file that touches the DOM. |
| `kiln/audio.js` | WebAudio, zero sound files. |
| `gate.html` | the render gate — 30 pots, one firing each, for the squint test. |

## Tests
```
node tests/soak.mjs 24      # determinism, the one-way door, kiln geography, distributions
node tests/calibrate.mjs    # re-derives the thermodynamic constants and cone thresholds
node tests/smoke.mjs        # drives the real UI in a browser, fails on any console error
```
A green check is not a balanced game. Read the distributions.

**Save key:** `kiln-save` · **Collectible:** the kiln god — finish a firing where nothing broke.

*one kiln. one night. twelve hours. nine people. — DBD*
