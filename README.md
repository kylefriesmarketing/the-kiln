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

## The notebook — M2, and how you actually learn this

There is no tutorial for the instruments. While the kiln runs you **log what you
believe it is doing** — the flame, the climb, the cone pack — and the game says
nothing back. No tick, no colour, no sound. Be right **three times in a row** and
that instrument settles: its page fills in permanently, in your own recorded
observations, and it is where the game finally admits why the pyrometer lies.
One wrong reading resets the run, so guessing costs more than learning to read it.

> That is Obra Dinn's confirm-in-threes. It teaches the instruments with no manual,
> makes confirmation a reward instead of a probe, forbids brute force, and produces
> the codex, the progression and the fairness record as a side effect.
> ⚠️ **Never surface whether a single reading was right.** `logReading()` deliberately
> does not return it, so the UI cannot leak it even by accident.

**Press n** for the notebook — instruments, the sixteen effects you have actually
seen, and every firing you have run.

### The lever
The verdict names your margin; the refire is the offer attached to it. Pots that came
out underfired, unreduced or dry can go **back in the next load** (a cracked one
cannot — you cannot un-dunt a pot). They carry their history, so a pot that took on
the third go says so in its provenance. Three at most, and they take up shelves that
new work wanted: a second chance costs production, like everything else here.

## The reveal — M3, five beats

§9 calls this the most important twenty minutes in the game, so it is staged:

1. **the tick** — the kiln cooling out loud in the dark. A passive cool is a real
   ~2.5 minutes; **wait** skips forward exactly one colour band at a time, so the
   skip is a choice about what is worth looking at.
2. **crack the door** — one brick out, and all you get is **colour temperature**:
   yellow-white, orange, cherry red, dull red, black. That is the bit potters read
   first, and on the way *down* the pyrometer is finally answering the right
   question, so the number and the colour agree for once.
3. **open** — everything at once, still warm, none of it in your hands. You get the
   shape and the heat and the shelf it sat on, and **no glaze and no events** —
   which is what makes beat 4 worth doing slowly.
4. **unload, one at a time, by hand** — each pot its own beat.
5. **the flagged piece last** — where you packed your hope decides when you see it.

> ⚠️ The cooling gate is not a designer teasing you; it is dunting prevention, you
> agree with it, and that is why the wait works (§9.1). **Never add a skip-to-results
> button.** `FIRE.cool.paceSimMin` is the gate — it was once effectively absent (9
> sim-minutes per 80ms tick meant a full cool elapsed in *eight seconds*), and
> `tests/reveal.mjs` now fails if it ever collapses again.

## Files
| | |
|---|---|
| `kiln/data.js` | every number in the game. Nothing outside it invents one. |
| `kiln/sim.js` | the firing. DOM-free, Node-importable, seeded, deterministic. |
| `kiln/pot.js` | the pot generator. One scalar thickness field drives the whole surface. |
| `kiln/verdict.js` | the brief, the margin, the tin. DOM-free, no rng, never scores an object. |
| `kiln/notebook.js` | confirm-in-threes, and which pots may go back in. DOM-free, no rng. |
| `kiln/main.js` | phases, UI, save. The only file that touches the DOM. |
| `kiln/audio.js` | WebAudio, zero sound files. |
| `gate.html` | the render gate — 30 pots, one firing each, for the squint test. |

## The front door, and saying what is going on

The title screen states the game in three steps — load it / fire it blind / open it —
and a returning player sees their firings, their shelf and their tin before they
press anything. During the firing each demand window shows its position in the night
(**3 of 8**), the technical demand, AND the same thing said the way a person would
say it: *"CLOSE THE DAMPER. starve the fire of air so it pulls oxygen out of the clay
instead. this is the one you cannot do late."*

> ⚠️ **The palette is measured, not eyeballed.** The original put  at **2.95:1**
> against the background and used it 24 times, mostly at 10.5px — it failed WCAG for
> body text and it was the most common text colour in the game; borders sat at 1.34:1,
> so the structure read as a flat void. Every text colour now clears 4.5:1 on both
> backgrounds (swept live: 61 elements, 0 failures). The room is still dim, still warm,
> and the fire is still the brightest thing on screen (§15) — it is just legible.
> **If you change a colour, re-measure it.**

## Being taught it

There is no tutorial overlay and no tooltips (§10). Instead **Ruthie tells you one
thing per screen, once**, the first time you get there — she runs the tuesday class
and she gave you this job. Dismiss a note and it stays dismissed.

**Press ? at any time** for *how a firing goes* — the whole night in order, the three
controls, what reduction is, why the pyrometer lies, the one-way door, and the fault
table. That page is the consultable reference the research ranks first; it is also on
the title screen.

## Tests
```
node tests/soak.mjs 24      # determinism, the one-way door, kiln geography, distributions
node tests/verdict.mjs      # the brief, the margin, the tin — asserts the actual sentences
node tests/notebook.mjs     # confirm-in-threes, the silence, and the refire lever
node tests/reveal.mjs       # colour temperature, and that the cooling gate is a real wait
node tests/census.mjs       # event frequency. a DISTRIBUTION to read, not a pass/fail
node tests/calibrate.mjs    # re-derives the thermodynamic constants and cone thresholds
node tests/smoke.mjs        # drives the real UI in a browser (needs playwright)
```
A green check is not a balanced game. Read the distributions.

**Known and deliberate:** the bible says the kiln cools for longer than it fired.
In SIM time it does not (~4.7 cooling hours against a ~21 hour firing) because the
cooling rate feeds `p.coolRate`, which decides crystal and hare's fur formation —
retuning it silently would move the surface generator. The REAL-time wait is the
part the player experiences and that is tuned. Change it with a census, not a hunch.

**⚠️ THE POTS MUST NEVER DEPEND ON A GPU.** They are the entire payoff (§4.6, §8).
- The unload canvas is **absolutely positioned inside `#potbox`** and must stay that
  way. A canvas carries an intrinsic size — its width/height attributes, which
  `setSize` writes as `clientWidth × devicePixelRatio` — and an *in-flow flex item*
  can feed that back into layout and grow without bound. That produced a black screen
  that "just gets wider and wider" and a locked tab. **Never put `flex` on `#potcv`.**
- `resize()` measures the BOX, clamps to sane bounds, and is idempotent. Measuring the
  canvas means measuring the very thing you are about to resize.
- `nextPot()` computes the pot with `firePot()` FIRST and only then asks a renderer to
  draw it. It used to read the pot back out of `mesh.userData`, so any 3D failure took
  the name, the events and the provenance down with it.
- `drawPotFlat()` in `pot.js` draws the same pot in 2D with no WebGL at all — same seed,
  same profile, same ramp, same events. It is the fallback when a context is lost or
  missing, and it is what the shelf uses for every thumbnail. Verified by killing the
  context with `WEBGL_lose_context` on pot one: all nine still appear, the unload still
  advances, and the firing still reaches its verdict.

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
