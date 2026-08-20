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

## The verdict — M1, and the only thing in the game that is ever judged

You take a **commission** off the board *before* you load — a brief with a person's
name on it, an enumerated list of clauses, and a fee. Afterwards it is judged clause
by clause, pass or fail, and **every failure names the position and the cause**:
*"two crawled. both on the cool bottom."* Then the **margin** — what happened, which
of your inputs was the margin, and how much change would have crossed it. Then what
the night cost, metered off the gas you actually burned.

> **⚠️ THE GAME NEVER SCORES A POT.** Not a star, not a percent, not a tier word.
> It scores fulfilment of a brief, attributed to a client with taste, and you keep
> every pot either way — including the ones that failed. If a future session adds a
> quality number to an object, it has broken the spine of the design (§4.4, §19.6).

The studio remembers, too. A member whose work keeps coming out badly stops leaving
it for you, and the only way you find out is that the damp room is emptier. There is
no reputation bar and nobody ever says *"that was not very kind."*

## Files
| | |
|---|---|
| `kiln/data.js` | every number in the game. Nothing outside it invents one. |
| `kiln/sim.js` | the firing. DOM-free, Node-importable, seeded, deterministic. |
| `kiln/pot.js` | the pot generator. One scalar thickness field drives the whole surface. |
| `kiln/verdict.js` | the brief, the margin, the tin. DOM-free, no rng, never scores an object. |
| `kiln/main.js` | phases, UI, save. The only file that touches the DOM. |
| `kiln/audio.js` | WebAudio, zero sound files. |
| `gate.html` | the render gate — 30 pots, one firing each, for the squint test. |

## Tests
```
node tests/soak.mjs 24      # determinism, the one-way door, kiln geography, distributions
node tests/verdict.mjs      # the brief, the margin, the tin — asserts the actual sentences
node tests/census.mjs       # event frequency. a DISTRIBUTION to read, not a pass/fail
node tests/calibrate.mjs    # re-derives the thermodynamic constants and cone thresholds
node tests/smoke.mjs        # drives the real UI in a browser (needs playwright)
```
A green check is not a balanced game. Read the distributions.

**Traps worth knowing before you touch this:**
- `tests/census.mjs` imports `pot.js`, which imports the bare specifier `three`. Node
  needs a shim: `node_modules/three/` re-exporting `../../lib/three.module.js`
  (gitignored, two files, recreate it if it's missing).
- Sweep strides must be **coprime** to the list length. `G[(i*3)%9]` visits three of
  nine glazes and makes four events look dead.
- Patch scripts must use a **function replacer** — `s.replace(from, () => to)`.
  `String.replace` expands `$'` in the *replacement*, and this codebase contains
  `'+$'`, which silently splices the whole file back into itself.
- `serve.mjs` takes a port argument. 8461 collides with `dont-touch` in the
  workspace launch config; this repo runs on **8462** there.

**Save key:** `kiln-save` · **Collectible:** the kiln god — finish a firing where nothing broke.

*one kiln. one night. twelve hours. nine people. — DBD*
