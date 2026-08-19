# THE KILN — RENDER GATE RESULT
### §24 step 1 · 2026-08-18 · **PASS**

The bible's own words: *"the largest untested assumption in this document is that a
browser-scale three.js pot renderer can produce the structural, event-based surface
variation Trap 3 requires… I'd prototype exactly that — thirty thumbnails, squint test —
**before** building any of the firing sim. If the pots can't be told apart, nothing else
in this document matters."*

So that got built first. Thirty pots, one firing each, seeds `1 + n·7919`.

## The verdict

**The bar was >8 visually distinct piles from across the room. I count 15–18.**

Open `shot-squint.png`, lean back, and sort them yourself — that's the actual test and
it's yours to fail me on. The piles I get: deep green · pale crazed blue-grey · black
tenmoku · deep red · terracotta · amber/gold · sage · crystal-starburst · carbon-shadowed
shino · pooled plates · beige.

**The naming works too**, which was the other half of §8. These are real generated names
from real firing logs:

> *lidded jar · chun · crystals down the belly, flashed down the flame side, broken to the rings to the rim*
> *tea bowl · ash · ash fly down the flame side, broken to the rings to the rim*
> *vase · shino · crawled down the belly*
> *yunomi · chun · dunted down the belly, crazed down the belly, pooled at the foot*

That's a thing you'd describe to somebody. "Bowl, glaze quality 78" is not.

## What's actually working

- **One scalar field runs the whole surface.** `thickness(u,v)`. Break, run, pool, crawl
  and the throwing-ring colour variation all fall out of it, which is why it looks like
  glaze and not like a texture. Colour comes from a per-glaze thickness ramp; normal and
  roughness maps are Sobel'd off the same field, so a drip is *physically* raised.
- **Events are causally attached.** Crystals only on rutile/chun with a slow cool. Carbon
  trap only on shino in reduction. Crawl only on a thick coat in a cold position. Nothing
  is decorative.
- **The copper flip is in.** Copper red fired below 0.42 reduction comes out as oribe
  green, and vice versa. Same element, opposite result, and the label says COPPER FLIPPED.
- **Position is chemistry.** Every label carries the shelf it sat on — `coolbottom`,
  `flamelane`, `flueshelf` — and the crawls really do cluster on the cold shelves.

## Three bugs the gate caught, all fixed, all worth remembering

1. **The barber pole.** Ring displacement was applied to the profile *before* curvature was
   computed, so every ring crest registered as a knife edge and got full break treatment.
   Result: every pot striped, the stripes oscillating across the entire colour ramp, every
   pot averaging to tan, every surface event drowned. **Curvature is now computed on the
   clean profile and rings go on afterward.** A throwing ring is an undulation, not an edge.
   Warning left in `data.js` next to `ringAmp`.
2. **See-through bowls.** A lathe of the outer wall alone is a shell — look down into a bowl
   and you see the floor through it. Profile now runs up the outside, over the rim, back
   down the inside, and closes at the axis. This is also what gives `pool` a well to gather
   in, so it fixed a rendering bug and a design gap at once.
3. **Plates shot off their cells.** Framing on height alone, when a plate is three times
   wider than it is tall. Camera now fits on both, and elevates over squat forms.

## Four honest weaknesses to carry into Phase 0

1. **The beige pile is still the biggest.** Liner clear, shino and matte rutile all land in
   the same tan at thumbnail size — about six of thirty. Their ramps need pulling apart.
   This is the one thing standing between "passes" and "passes comfortably."
2. **`run` is too rare and too quiet.** It needs `applied > 0.72` *and* `flow > 0.75`, so it
   fired maybe twice in thirty. Per §8 a drip is *the visible fingerprint of a decision you
   made blind* — it should be one of the most common and most dramatic events, not one of
   the rarest. Loosen the trigger, raise the amplitude, and let a bad one reach the shelf.
3. **Hare's fur and oil spot never appeared at all.** Both are gated on tenmoku plus a
   narrow cool-rate window; only two tenmoku came up and neither qualified. Widen, or accept
   they're genuinely rare and make sure the notebook teaches how to *chase* them.
4. **Forms skew to cylinders.** Bottles and plates read strongly; yunomi/mug/jar crowd each
   other. Either push the profiles further apart or accept it — a studio does make a lot of
   cups.

## What this does and doesn't prove

**Proves:** the generator is not oatmeal. The surface tech is achievable in a browser with
canvas textures and a Sobel normal map — no shaders required yet. Names are memorable.
Causation is legible.

**Does not prove:** anything about the firing sim, the instruments, the demand schedule, or
the reveal. Those are steps 2–10. This was only the gate before the gate.

## Run it

```
node shot.mjs                  # renders both sheets headless
# or serve index.html and open:
#   /?seed=500                 # a different thirty
#   /?squint=1                 # the squint sheet
```
`kiln/data.js` holds every number. `kiln/pot.js` is the generator — deterministic, seeded
LCG, no `Math.random` in the field build.

---
*if these don't sort into more than eight piles from across the room, the game is oatmeal.
they do. — DBD*
