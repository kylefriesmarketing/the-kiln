// THE KILN — all tuning lives here, from the first commit. (§19.2)
// Nothing outside this file invents a number.

export const FORMS = {
  teabowl:  { name:'tea bowl',   h:0.95, ctl:[[0.34,0],[0.34,0.05],[0.30,0.07],[0.46,0.22],[0.62,0.48],[0.70,0.78],[0.72,0.96],[0.70,1.0]], open:true,  rings:9  },
  yunomi:   { name:'yunomi',     h:1.15, ctl:[[0.30,0],[0.30,0.05],[0.27,0.08],[0.40,0.20],[0.44,0.55],[0.46,0.88],[0.48,1.0]],             open:true,  rings:14 },
  mug:      { name:'mug',        h:1.20, ctl:[[0.34,0],[0.34,0.05],[0.32,0.08],[0.42,0.18],[0.44,0.6],[0.44,0.92],[0.46,1.0]],              open:true,  rings:13 },
  widebowl: { name:'wide bowl',  h:0.70, ctl:[[0.30,0],[0.30,0.05],[0.28,0.08],[0.52,0.22],[0.82,0.55],[1.02,0.85],[1.08,1.0]],             open:true,  rings:8  },
  plate:    { name:'plate',      h:0.42, ctl:[[0.36,0],[0.36,0.04],[0.34,0.07],[0.72,0.20],[1.06,0.52],[1.24,0.86],[1.30,1.0]],             open:true,  rings:6  },
  bottle:   { name:'tall bottle',h:1.70, ctl:[[0.30,0],[0.30,0.04],[0.28,0.06],[0.52,0.18],[0.62,0.38],[0.54,0.56],[0.26,0.72],[0.20,0.88],[0.28,0.97],[0.26,1.0]], open:false, rings:18 },
  jar:      { name:'lidded jar', h:1.25, ctl:[[0.30,0],[0.30,0.05],[0.28,0.07],[0.50,0.18],[0.62,0.42],[0.60,0.66],[0.44,0.82],[0.42,0.92],[0.46,1.0]], open:false, rings:15 },
  vase:     { name:'vase',       h:1.55, ctl:[[0.26,0],[0.26,0.05],[0.24,0.08],[0.34,0.22],[0.42,0.52],[0.50,0.80],[0.62,0.97],[0.60,1.0]], open:true,  rings:16 },
};

// A glaze is a THICKNESS RAMP, not a colour. Everything — break, run, pool,
// crawl — falls out of thickness, which is why it's physically honest. (§8)
// stops: [thickness 0..1, [r,g,b] 0..255]
export const GLAZES = {
  tenmoku: { name:'tenmoku', gloss:0.92, base:0.52, flow:0.85, sat:1.0,
    ramp:[[0.00,[168,104,58]],[0.18,[142,74,38]],[0.34,[96,44,26]],[0.52,[44,26,20]],[0.75,[22,16,15]],[1.00,[14,11,11]]] },
  celadon: { name:'celadon', gloss:0.95, base:0.34, flow:0.55, sat:0.85,
    ramp:[[0.00,[214,208,186]],[0.20,[186,200,178]],[0.42,[150,186,166]],[0.65,[108,164,150]],[1.00,[74,134,128]]] },
  copperred:{ name:'copper red', gloss:0.90, base:0.46, flow:0.70, sat:1.0,
    ramp:[[0.00,[206,182,158]],[0.14,[178,118,96]],[0.30,[164,52,40]],[0.52,[124,20,22]],[0.74,[86,14,20]],[1.00,[52,12,18]]] },
  oribe:   { name:'oribe', gloss:0.96, base:0.50, flow:0.80, sat:1.0,
    ramp:[[0.00,[190,196,150]],[0.18,[142,178,96]],[0.38,[86,148,62]],[0.60,[42,112,50]],[1.00,[20,72,44]]] },
  // ⚠️ shino/rutile/clear used to share a tan and made ONE beige pile at thumbnail
  // size — 6 of 30 at the render gate. They are pulled apart on purpose now:
  // shino = orange, rutile = olive-drab matte, clear = terracotta. Do not re-converge them.
  // ⚠️ shino's base is NOT a colour knob — it drives crawl, which is shino's whole
  // identity (§7.1) and the bible's example commission clause. Fix colour in the RAMP.
  shino:   { name:'shino', gloss:0.55, base:0.62, flow:0.28, sat:0.95,
    ramp:[[0.00,[178,76,30]],[0.15,[212,126,52]],[0.34,[232,172,102]],[0.58,[238,212,172]],[1.00,[244,232,214]]] },
  chun:    { name:'chun', gloss:0.94, base:0.55, flow:0.62, sat:0.95,
    ramp:[[0.00,[130,116,102]],[0.18,[126,132,132]],[0.38,[136,158,172]],[0.60,[164,192,208]],[1.00,[196,216,228]]] },
  ash:     { name:'ash', gloss:0.97, base:0.40, flow:1.00, sat:1.0,
    ramp:[[0.00,[176,146,102]],[0.20,[168,132,66]],[0.42,[142,110,44]],[0.66,[104,88,40]],[1.00,[62,60,34]]] },
  rutile:  { name:'matte rutile', gloss:0.22, base:0.58, flow:0.35, sat:0.86,
    ramp:[[0.00,[214,198,152]],[0.22,[192,176,112]],[0.46,[152,142,94]],[0.70,[112,108,80]],[1.00,[74,78,64]]] },
  // liner clear shows the BODY. A pot in clear should read as fired clay, not as beige glaze.
  clear:   { name:'liner clear', gloss:0.93, base:0.30, flow:0.45, sat:0.78,
    ramp:[[0.00,[202,152,112]],[0.30,[178,124,86]],[0.60,[150,99,66]],[1.00,[118,74,50]]] },
};

// The nine named positions. Position is chemistry. (§5.4)
// ⚠️ `hint` is what the shelf says about itself on the load screen, and it must
// be TRUE OF THE NUMBERS BESIDE IT. Before this there was a threshold ladder in
// main.js that collapsed THREE of the nine shelves onto the identical string
// "good atmosphere." — so a third of the kiln was not a distinct choice at all,
// which is fatal on the one screen the bible says carries most of the decision
// weight (§5.4). One line each, naming the mechanism that shelf actually drives:
// heat, red (atmosphere), flow (glaze running and pooling — pot.js:103), ash and
// flash (marks the flame leaves — pot.js:122).
export const POSITIONS = {
  flamelane:  { name:'flame lane',   heat:+1.0, red:+1.0, flow:+0.25, flash:0.9,  ash:0.7,
                hint:'hottest shelf, heaviest reduction, and the flame marks what sits here.' },
  frontmid:   { name:'front middle', heat:+0.6, red:+0.7, flow:+0.12, flash:0.35, ash:0.3,
                hint:'hot and reducing without the flame quite touching. where a red is safe.' },
  fronttop:   { name:'front top',    heat:+0.7, red:+0.3, flow:+0.10, flash:0.15, ash:0.15,
                hint:'as hot as the front, but the atmosphere is thinner up here.' },
  middle:     { name:'middle',       heat: 0.0, red: 0.0, flow: 0.00, flash:0.05, ash:0.1,
                hint:'even. honest. unspectacular. nothing here will surprise you.' },
  backmid:    { name:'back middle',  heat:-0.2, red:+0.5, flow:-0.05, flash:0.05, ash:0.2,
                hint:'reducing AND a shade cooler — the one pairing this kiln is short of.' },
  backtop:    { name:'back top',     heat:+0.5, red:-1.0, flow:+0.08, flash:0.05, ash:0.05,
                hint:'hot, but the flame never reaches. it oxidises up here.' },
  coolbottom: { name:'cool bottom',  heat:-1.0, red:-0.3, flow:-0.35, flash:0.0,  ash:0.05,
                hint:'runs cool. glaze stays where you put it, and thin coats crawl.' },
  deadcorner: { name:'dead corner',  heat:-1.4, red:-0.6, flow:-0.50, flash:0.0,  ash:0.0,
                hint:'cold and still. nothing likes it here.' },
  flueshelf:  { name:'flue shelf',   heat:-0.1, red:+0.2, flow:-0.10, flash:0.1,  ash:0.9,
                hint:'everything the fire carries goes out past this shelf, and some of it lands.' },
};

// Sixteen named surface events. Each has a position on the pot and an intensity. (§8)
export const EVENTS = [
  'break','run','pool','harefur','oilspot','carbontrap','crawl','craze',
  'flashing','ashfly','kilnkiss','pinhole','blister','crystal','shadow','dunt',
];

export const EVENT_NAMES = {
  break:'broken to the rings', run:'a run', pool:'pooled', harefur:"hare's fur",
  oilspot:'oil spot', carbontrap:'carbon trapped', crawl:'crawled', craze:'crazed',
  flashing:'flashed', ashfly:'ash fly', kilnkiss:'a kiln kiss', pinhole:'pinholed',
  blister:'blistered', crystal:'crystals', shadow:"a neighbour's shadow", dunt:'dunted',
};

export const ZONE_NAMES = { rim:'to the rim', shoulder:'at the shoulder', belly:'down the belly', foot:'at the foot', flame:'down the flame side', lee:'on the lee side' };

export const TUNE = {
  texW: 512, texH: 512,
  gravity: 0.58,      // how much thickness gathers downward
  curveThin: 1.10,    // how much a sharp edge thins the glaze (this IS "break")
  // ⚠️ ringAmp above ~0.02 turns every pot into a barber pole: the stripes oscillate
  // across the WHOLE colour ramp, every pot averages to tan, and every surface event
  // drowns. Measured at the render gate, 2026-08-18. Do not raise it.
  ringAmp: 0.010,     // throwing-ring thickness modulation
  ringGeo: 0.0030,    // throwing-ring geometry displacement
  mottle: 0.070,
  contrastLo: 0.10,   // thickness → ramp remap. widens the ramp traverse.
  contrastHi: 0.92,
  // ⚠️ was 0.72, which fired maybe twice in thirty at the render gate. §8 calls a drip
  // "the visible fingerprint of a decision you made blind" — it should be COMMON.
  runThreshold: 0.58, // thickness above which a run can start
};

// ---------------------------------------------------------------------------
// THE FIRE. §5–6. Three controls, twelve hours, eight demand windows.
// ---------------------------------------------------------------------------
export const FIRE = {
  tick: 1.0,              // sim minutes per step
  ambient: 68,            // °F
  thermalMass: 55,       // how sluggish the kiln is. bigger = slower.
  calorific: 34.0,        // heat per unit of well-burned fuel
  shellLoss: 0.0197,      // radiative: ∝ ((T-ambient)/1000)^3.2. derived, not guessed.
  shellPow: 3.2,
  fluLossBase: 0.55,      // heat carried out the chimney at damper 0
  fluLossPerNotch: 0.60,  // ...and per notch of damper opened

  gasMax: 12, airMax: 8, damperMax: 10,
  // ⚠️ CONTROL LAG IS THE SKILL (§5.3). "Allow 15–30 minutes for kiln adjustments
  // to show effects." These are the time constants, in sim minutes, for each
  // control's effective value to chase its set value. Do not shorten them to make
  // the game feel responsive — responsiveness is the thing we are removing.
  // ⚠️⚠️ MEASURED, AND IT WAS THE WHOLE PROBLEM (Kyle, 2026-08-19: "doesn't make
  // any sense... too complicated... less of a fun game").
  // loop() used to step ONE SIM-MINUTE PER ANIMATION FRAME, so at "1×" the sim ran
  // 60 sim-minutes per real second: the ENTIRE 21-hour firing was over in 21
  // SECONDS, body reduction — the one-way door, the most consequential decision in
  // the game — lasted HALF A SECOND, and the 26-sim-minute damper lag was 0.43s,
  // i.e. invisible. The bible's whole design (a 30–45 minute attended firing, eight
  // windows you steer, a lag that makes it a prediction problem) did not exist in
  // the shipped game. It was a blur nobody could perceive, let alone act on.
  //
  // pace is now SIM-MINUTES PER REAL SECOND and the loop is frame-rate independent
  // (it used to run at half speed on a 30fps machine, which was a second bug).
  pace: { attend: 2, brisk: 14, fast: 45 },

  // ⚠️ §5.3 calls control lag "the deepest, cheapest source of skill in the design"
  // and it is right — but at 2 sim-min/sec the old values are a 7–13 SECOND dead
  // zone, and Kyle's call (2026-08-19) was for a kiln that answers you. These are
  // 2–3.5 real seconds: long enough that you are still steering the kiln of a
  // moment ago, short enough that you can feel it move. Do not take them to zero.
  lag: { gas: 4, air: 5, damper: 7 },

  stoich: 1.35,           // air units needed per unit of gas for a clean burn
  airPerNotch: 1.45,      // primary air contribution
  airPerDamper: 0.55,     // damper pulls secondary air
  // combustion efficiency vs air ratio: peaks at ~1.02, falls off both sides.
  // rich (ratio<1) = reduction. lean (ratio>1) = oxidation + heat up the flue.
  // ⚠️ effWidthLo governs how expensive reduction is. Too narrow and the kiln
  // physically cannot reach cone 10 in reduction — it stalls every time and the
  // game is unwinnable. Derived against a 2400F plateau at gas 12 / atm 0.4.
  effPeak: 1.02, effWidthLo: 0.95, effWidthHi: 0.85,

  // heat work (§6.3): cones integrate time AND temperature. This is why the
  // pyrometer lies — the same peak reached slower is more heat work.
  hwT0: 1500, hwA: 168,
  // heat-work thresholds per cone. calibrated against a 150°F/hr reference ramp.
  // Derived from a reference ramp at real Orton cone temperatures (tests/calibrate.mjs),
  // EXCEPT cone 11, which is deliberately pushed out from its physical 241→265 spacing.
  // Real cone 10 and 11 are 16°F apart, which leaves ~9 minutes between "done" and
  // "overfired" — no soak survives that, and the harness overfired 21 of 24 firings.
  // Game spacing beats Orton spacing here. This is a decision, not a mistake.
  cones: { '012': 2.5, '010': 3.9, '08': 6.0, '06': 11.1, '04': 22.3, '1': 59,
           '6': 123, '8': 164, '9': 184, '10': 241, '11': 330 },

  // the eight demand windows (§6.1). `at` is the trigger; `hold` is sim minutes.
  windows: [
    { id:'candle',   name:'candle',            at:{t:0},              hold:120, want:{gas:[1,3],  damper:[6,10]}, miss:'ware went in damp — blowouts',
      plain:'low and open. you are drying the pots, and if you rush this the water in them turns to steam and they burst.' },
    { id:'climb',    name:'the climb',         at:{t:120},            hold:150, want:{rate:[190,430]},            miss:'climbed too hard through quartz inversion',
      plain:'now bring the heat up steadily. gas up, damper still fairly open. too fast here and pots crack hours later.' },
    { id:'bodyred',  name:'BODY REDUCTION',    at:{cone:'012'},       hold:30,  want:{atm:[0.35,0.85]},           miss:'no body reduction',
      plain:'⚠ CLOSE THE DAMPER. starve the fire of air so it pulls oxygen out of the clay instead. this is the one you cannot do late.' },
    { id:'reox',     name:'reoxidise & climb', at:{cone:'08'},        hold:90,  want:{atm:[-1,0.12]},             miss:'stayed rich — carbon coring',
      plain:'open it back up and burn clean for a while. keep climbing. staying rich this whole time just makes soot.' },
    { id:'glazered', name:'glaze reduction',   at:{cone:'6'},         hold:120, want:{atm:[0.30,0.95]},           miss:'glazes never reduced',
      plain:'back into reduction — this is the long one, and it is what makes copper go red and celadon go green.' },
    { id:'approach', name:'the approach',      at:{cone:'9'},         hold:25,  want:{atm:[-0.1,0.35]},           miss:'stalled short of cone 10',
      plain:'ease back toward neutral and push for cone 10. if it stalls here, try LESS gas — that is not a typo.' },
    { id:'soak',     name:'the soak',          at:{cone:'10'},        hold:25,  want:{rate:[-18,18]},             miss:'no soak — surfaces stayed dry',
      plain:'hold it steady. stop climbing. time at heat is what actually melts a glaze, and this is where surfaces are made.' },
    { id:'shutdown', name:'clean-up & shut',   at:{cone:'10',off:25}, hold:20,  want:{atm:[-1,0.10]},             miss:'shut down dirty',
      plain:'a short clean burn to settle the glazes, then shut the gas off and close the damper tight.' },
  ],
  // ⚠️ THE ONE-WAY DOOR (§6.2). Real, sourced, irreversible.
  // "If you begin reducing later than 06, you may have missed reduction and will not get any."
  reductionDeadlineCone: '06',

  // ⚠️ paceSimMin is THE COOLING GATE (§18: ~5 min, skippable to a floor; §9.1: the
  // anticipation IS the reward and the wait is enforced by a mechanic the player
  // agrees with). It was effectively absent: the pump ran 9 sim-minutes per 80ms,
  // so a 2200°F kiln reached 400°F in EIGHT SECONDS of real time and there was
  // nothing to sit with at all. At 0.16 a passive cool is ~2.5 real minutes.
  // Deliberately half the bible's 5, pending Kyle's playtest — a browser session
  // is not a kiln shed. Raise it toward 5 if the wait reads as too cheap.
  cool: { targetOpenF: 400, ratePerNotch: 0.42, base: 0.55, duntF: 1063, duntF2: 439,
          paceSimMin: 0.16 },

  // conditions rolled and SHOWN before the door is bricked up (§4.2)
  conditions: {
    kiln:  [['cold','cold, damp brick',-0.16],['normal','cold but dry',0],['warm','still warm from tuesday',+0.13]],
    draw:  [['slack','the flue is slack today',-0.22],['normal','drawing normal',0],['hard','drawing hard',+0.24]],
    fuel:  [['low','the low tank nobody replaced',-0.20],['half','half a tank',-0.05],['full','a full tank',0]],
  },
};

// ---------------------------------------------------------------------------
// THE VERDICT (M1). §4.4, §12.2, §12.3.
// ⚠️ THE GAME NEVER SCORES A POT (§19.6). Not a star, not a percent, not a tier
// word. It scores FULFILMENT OF A BRIEF, clause by clause, attributed to a person
// with taste. Everything in this block judges a commission. Nothing in it — ever —
// judges an object. If you find yourself adding a quality number, read §4.4 again.
// ---------------------------------------------------------------------------

// Clients have CONFLICTING taste, so a rejection is always attributable to a
// person and never to a universal standard. "too bright for what she wanted" is
// survivable. "quality: 2/5" is not.
export const CLIENTS = {
  okonkwo:  { n:'m. okonkwo',   of:'for the restaurant',    taste:'wants twelve of a thing and twelve of them the same.' },
  vasquez:  { n:'jo vasquez',   of:'for the sunday stall',  taste:'sells to people who pick things up. wants a surface that rewards it.' },
  ruthie:   { n:'ruthie',       of:'for the tuesday class', taste:'wants to be able to point at it and say: that. do that.' },
  hollis:   { n:'the hollises', of:'for the wedding',       taste:'a set. they will use it every sunday for forty years.' },
  ines:     { n:'ines',         of:'for the binder',        taste:'does not want it pretty. wants it repeatable.' },
  teashop:  { n:'the tea shop', of:'on the corner',         taste:'green tea, white walls, and a bowl you can see the tea through.' },
  marg:     { n:'marguerite',   of:'a favour',              taste:'will not say what she wants. you know what she wants.' },
  walt:     { n:'walt',         of:'for his daughter',      taste:'has never once asked for anything. this is the first time.' },
};

// A commission is EXTERNAL, ENUMERATED, and ACCEPTED BEFORE THE FIRING.
//   want    — what makes one of YOUR pieces a candidate for the brief
//   need    — how many candidates must satisfy the clauses
//   clauses — judged one at a time, pass/fail, each failure naming position + cause
// Clause kinds: count · cone · event · noevent · anyevent · sound · reduced · noflip
//               · sameglaze · sameform
// ⚠️ Every `event` clause must name an effect the generator can actually produce.
// Check tests/census.mjs before writing a brief around a 0.6% event.
export const COMMISSIONS = [
  { id:'okonkwo_bowls', client:'okonkwo', fee:210, need:2,
    title:'two bowls, iron, breaking at the rim',
    brief:'two wide bowls. cone 10. an iron glaze that breaks to rust where it runs thin over the rim. nothing crawled — they go in a dish pit, not a cabinet.',
    want:{ form:'widebowl', glaze:'tenmoku' },
    clauses:[ {k:'count'}, {k:'cone',v:'10'}, {k:'event',v:'break'}, {k:'noevent',v:'crawl'}, {k:'sound'} ] },

  { id:'teashop_celadon', client:'teashop', fee:180, need:2,
    title:'celadon, thin, and you can see through it',
    brief:'two tea bowls in celadon. cone 10 and properly reduced — the yellow-green one you brought last time was not what we meant. crazing is fine. crazing is expected.',
    want:{ form:'teabowl', glaze:'celadon' },
    clauses:[ {k:'count'}, {k:'cone',v:'10'}, {k:'reduced'}, {k:'sound'} ] },

  { id:'hollis_set', client:'hollis', fee:240, need:3,
    title:'three mugs that match',
    brief:'three mugs. the same glaze on all three, and they should look like they came out of the same kiln, because they will. no cracks. they are going to use these.',
    want:{ form:'mug' },
    clauses:[ {k:'count'}, {k:'sameglaze'}, {k:'sound'}, {k:'noevent',v:'dunt'} ] },

  { id:'vasquez_surface', client:'vasquez', fee:165, need:2,
    title:'something worth picking up',
    brief:'two pieces, your choice of form. i do not care what colour. i care that when somebody turns it over in their hands there is something happening on it. give me a run, or a pool, or that streaked thing you did.',
    want:{},
    clauses:[ {k:'count'}, {k:'anyevent',v:['run','pool','harefur','crystal','carbontrap','ashfly']}, {k:'sound'} ] },

  { id:'ruthie_demo', client:'ruthie', fee:120, need:1,
    title:'one pot for the tuesday class',
    brief:'one piece. i want to hold it up and say: this is what reduction does. so it needs to have actually been reduced, and it needs to be sound, and it needs to be obvious.',
    want:{},
    clauses:[ {k:'count'}, {k:'reduced'}, {k:'sound'}, {k:'cone',v:'9'} ] },

  { id:'ines_repeat', client:'ines', fee:150, need:2,
    title:'two the same, for the binder',
    brief:'two pieces, same form, same glaze, both sound, both to cone 10. i am not testing you. i am testing the kiln, and you are the variable i cannot control.',
    want:{},
    clauses:[ {k:'count'}, {k:'sameform'}, {k:'sameglaze'}, {k:'cone',v:'10'}, {k:'sound'} ] },

  { id:'marg_copper', client:'marg', fee:260, need:1,
    title:'a bottle. red.',
    brief:'one tall bottle in copper red. red. not green. you know the difference and so do i, and if it comes out green we will both know exactly when it happened.',
    want:{ form:'bottle', glaze:'copperred' },
    clauses:[ {k:'count'}, {k:'noflip'}, {k:'cone',v:'10'}, {k:'sound'} ] },

  { id:'walt_plate', client:'walt', fee:140, need:1,
    title:'one plate, for his daughter',
    brief:'one plate. walt did not specify a glaze and would not if you asked. it should not be cracked. that is the whole brief and he will be embarrassed that he made it.',
    want:{ form:'plate' },
    clauses:[ {k:'count'}, {k:'sound'}, {k:'noevent',v:'dunt'} ] },

  { id:'vasquez_shino', client:'vasquez', fee:195, need:2,
    title:'two in shino, carbon and all',
    brief:'shino. two pieces. i want the orange, and i want the grey shadow where the carbon got trapped — that is the one people ask about. crawling is fine, it sells.',
    want:{ glaze:'shino' },
    clauses:[ {k:'count'}, {k:'event',v:'carbontrap'}, {k:'reduced'}, {k:'sound'} ] },

  { id:'teashop_oribe', client:'teashop', fee:200, need:2,
    title:'two green. properly green.',
    brief:'two pieces in oribe. the bright transparent green, which means oxidation, which means the top back shelf and a clean burn at the end. brown-red is not green.',
    want:{ glaze:'oribe' },
    clauses:[ {k:'count'}, {k:'noflip'}, {k:'cone',v:'10'}, {k:'sound'} ] },

  { id:'okonkwo_service', client:'okonkwo', fee:230, need:3,
    title:'three plates for service',
    brief:'three plates. same glaze. they stack, they get hit, they go in a machine. i do not want a single pinhole and i do not want anything that came out of the cold shelf.',
    want:{ form:'plate' },
    clauses:[ {k:'count'}, {k:'sameglaze'}, {k:'noevent',v:'pinhole'}, {k:'noevent',v:'crawl'}, {k:'sound'} ] },

  { id:'ruthie_ash', client:'ruthie', fee:175, need:1,
    title:'let the fire do something',
    brief:'one piece, in ash, somewhere the flame actually touches it. i want the class to see what the kiln does on its own when you put a pot in its way.',
    want:{ glaze:'ash' },
    clauses:[ {k:'count'}, {k:'anyevent',v:['ashfly','flashing','run']}, {k:'sound'} ] },

  { id:'ines_crystal', client:'ines', fee:255, need:1,
    title:'crystals, and slowly',
    brief:'one piece in rutile or chun, cooled slow enough to grow crystals. shut the damper and leave it alone. if you open that kiln early i will know before you tell me.',
    want:{},
    clauses:[ {k:'count'}, {k:'event',v:'crystal'}, {k:'sound'}, {k:'noevent',v:'dunt'} ] },

  { id:'marg_tenmoku', client:'marg', fee:270, need:1,
    title:"hare's fur, if you can get it",
    brief:'tenmoku, cooled right, and if the iron pulls into streaks down the wall then that is the one i want. if it does not, keep it, and we will both pretend i never asked.',
    want:{ glaze:'tenmoku' },
    clauses:[ {k:'count'}, {k:'event',v:'harefur'}, {k:'cone',v:'10'}, {k:'sound'} ] },
];

// §12.3 — money is small and it is NEVER the score. It buys materials and repairs
// and nothing else. No storefront, no second kiln, no upgrade tree (§19.9).
// Gas is metered from the sim's own fuel accumulator, never estimated.
export const ECON = {
  gasPerUnit: 0.0135,   // $ per gas-minute burned. calibrated against a real firing.
  clayPerPiece: 4,      // what a piece of your own costs you in clay and glaze
  memberFee: 9,         // members pay to have their work in your kiln, by the piece
  startMoney: 60,
};

// §12.1 — the members remember. This is NOT a reputation bar and it is never shown
// as a number. The consequence is that the damp room is fuller or emptier, and
// somebody says something. Nobody ever says "that was not very kind."
export const MOOD = {
  min:-4, max:4,
  good:+1,           // came out sound and did what their glaze should do
  bad:-1,            // dunted, crawled to bits, or badly underfired
  ruined:-2,         // it dunted, and it was the piece they cared about
  thickHand:0.26,    // Desmond's extra glaze thickness. his pieces crawl and run.
};

// ---------------------------------------------------------------------------
// TEACHING. §10, and Kyle's playtest note of 2026-08-19 ("there needs to be more
// of a tutorial").
// ⚠️ §10 bans tutorials and tooltips, citing Nauticrawl — but it bans them in
// favour of DIEGETIC teaching plus a persistent consultable reference, and it is
// equally explicit that Nauticrawl's refusal to ever confirm anything is why it
// stayed a cult game: "take the diegetic teaching, reject the refusal to confirm."
// So nobody here is taught by a floating tooltip. Ruthie teaches you, because she
// runs the tuesday class and she gave you this job, and §13's arc ends with you
// teaching someone else — which only lands if it started with someone teaching you.
// Each note appears ONCE, the first time you reach that screen, and lives behind
// the ? key forever after.
export const GUIDE = {
  cond: { who:'Ruthie',
    t:`everything that is luck tonight is on this screen, and it is on it now, before you
       have decided anything. cold brick climbs slower. a flue drawing hard pulls your heat
       up the chimney. read them, then load for them — that is the whole job.` },

  board: { who:'Ruthie',
    t:`take a commission or take none. if you take one it gets judged line by line and
       somebody's name is on the judging, so it is their taste and not a mark out of ten.
       either way you keep every pot that comes out. that is not a consolation, it is the rule.` },

  load: { who:'Ruthie',
    t:`where a piece sits decides what it becomes. the flame lane is hottest and reduces
       hardest — copper and shino love it. the cool bottom runs forty degrees cold and will
       crawl a thick glaze right off the clay. the dead corner is where work goes to be
       disappointing. your own three you can change: click the form, click the glaze.
       and flag one piece before you brick up — it comes out last, when it counts.` },

  fire: { who:'Ruthie',
    t:`three knobs, and the big picture is the spyhole. move something and watch it — the
       flame answers you in a couple of seconds, and underneath it there is a line telling
       you in plain words what it is doing. close the damper and it lengthens and goes
       orange: that is reduction, and it is the thing that makes the colours.
       the box on the right says what the kiln wants right now. the cones read heat work,
       the pyrometer reads temperature, and they are not the same thing.
       one more: if cone 06 goes down before you have begun reducing, there is no reduction
       tonight. not less. none. nothing you do afterwards reopens it.` },

  cool: { who:'Ruthie',
    t:`now you wait, and it takes longer than the firing did. you cannot open a hot kiln —
       under about four hundred degrees or you will crack every piece in there on the way
       through the inversions. the game will let you do it. it will be your fault.` },

  unload: { who:'Ruthie',
    t:`one at a time, by hand, the way the shelves came out. the name underneath is built from
       what actually happened to it in there — every mark on it has a cause and the cause is
       usually something you did.` },

  verdict: { who:'Ruthie',
    t:`the brief gets marked, the pot never does. underneath that is the margin: what came
       closest, which of your inputs it turned on, and how much more would have carried it.
       read that part. it is the only place the kiln explains itself.` },
};

// The persistent, consultable reference — Papers Please's rulebook, which the research
// ranks first among the four teaching patterns. Reachable from the title and from ? at
// any time, so knowledge lives in the player instead of behind an unlock.
export const PRIMER = [
  { h:'the night, in order',
    t:`candle low and open until the ware is dry · climb steadily to cone 012 · CLOSE THE
       DAMPER and hold body reduction twenty to thirty minutes · open back up and burn clean
       to cone 6 · back into reduction for the glazes · neutral through cone 9 · soak at cone
       10 · twenty minutes clean, then off, then shut the damper.` },
  { h:'the three controls',
    t:`GAS is fuel — more heat, and more unburned fuel if the air cannot keep up. AIR is
       combustion and turbulence, and turbulence is what reduces the BOTTOM of the kiln.
       THE DAMPER is back pressure: closing it holds the fire and the atmosphere in, opening
       it sends your heat up the chimney. the damper is the strongest and the most dangerous.` },
  { h:'reduction, which is the point',
    t:`a rich fire — more fuel than air — is starved of oxygen, so it pulls oxygen back out of
       the glaze itself. that is reduction, and it is what makes copper go blood red instead of
       green, celadon go blue-green instead of yellow, iron go black and break to rust.
       you read it at the spyhole: long, soft, licking orange is reducing. short, blue and
       bushy is clean. green-tinted is neutral.` },
  { h:'cones, and why the pyrometer lies',
    t:`a cone bends from heat WORK — temperature multiplied by time. so the same peak reached
       slowly is more work than the same peak reached fast, and a pot fired quickly to cone 10's
       temperature comes out underfired anyway. steer by the cones. the pyrometer is a hint.` },
  { h:'the one-way door',
    t:`if you have not begun reducing by the time cone 06 goes down, you will get no reduction
       in that firing at all. it is not a penalty, it is an oxidation firing: copper comes out
       green, celadon yellowish, shino white and flat. everything is sound. nothing is what
       anybody asked for. the log will say exactly when it happened.` },
  { h:'what goes wrong, and what it means',
    t:`COLD BOTTOM — damper too open, or too much primary air. GLAZE RUN — laid on too thick;
       leave the foot bare. CRAWLING — thick glaze on a cold shelf. STALL near the top —
       counter-intuitively, too MUCH gas: the excess draft carries heat away, so cut it back.
       DUNTING — cooled too fast, or you opened it hot.` },
];

// ---------------------------------------------------------------------------
// THE NOTEBOOK (M2). §10.
// No tutorial, no tooltips — you LOG WHAT YOU BELIEVE while the kiln is running,
// and the notebook confirms nothing until you have been right three times running.
// That is Obra Dinn's confirm-in-threes, and it does four jobs at once: it teaches
// the instruments with no manual, it makes confirmation a reward instead of a probe,
// it forbids brute-force guessing (a wrong reading resets the run), and it produces
// the codex, the progression and the fairness artefact as a side effect.
//
// ⚠️ READINGS ARE NEVER CONFIRMED INDIVIDUALLY. The UI must never say "correct" —
// it records, and stays silent, until the third one lands and the page opens. If a
// future session adds a per-reading tick, it has thrown away the whole mechanism.
// ---------------------------------------------------------------------------
export const INSTRUMENTS = {
  flame: {
    name:'the flame', at:'the spyhole',
    ask:'what is the fire doing?',
    // read off S.atm. bands match the sim's own: reduction begins at 0.30 (redRun),
    // and over-reduction throws black smoke above 0.85 with the gas up.
    read:'atm',
    opts:[
      { k:'ox',      label:'oxidising',    hint:'short, blue, bushy', max:0.08 },
      { k:'neutral', label:'neutral',      hint:'green-tinted',       max:0.30 },
      { k:'red',     label:'reducing',     hint:'long, soft, licking orange', max:0.85 },
      { k:'heavy',   label:'over-reduced', hint:'smoking, and you should have seen it coming', max:99 },
    ],
  },
  climb: {
    name:'the climb', at:'the pyrometer',
    ask:'where is the heat going?',
    read:'rate',
    opts:[
      { k:'falling', label:'falling',       hint:'losing ground',            max:-30 },
      { k:'holding', label:'holding',       hint:'flat — a soak, or a stall', max:60 },
      { k:'steady',  label:'climbing',      hint:'the honest working rate',   max:260 },
      { k:'hard',    label:'climbing hard', hint:'fast enough to shock the ware', max:1e9 },
    ],
  },
  cones: {
    name:'the cone pack', at:'the lower spyhole',
    ask:'how much work has the fire done?',
    // ⚠️ the whole point of this instrument: cones read HEAT WORK, the integral of
    // time and temperature. Getting this one confirmed is what teaches that the
    // pyrometer is not telling you what you think it is telling you.
    read:'hw',
    opts:[
      { k:'none',   label:'nothing down yet',  hint:'still drying',                cone:'012' },
      { k:'low',    label:'the low cones',     hint:'012 through 06 — reduction country', cone:'06' },
      { k:'middle', label:'climbing through',  hint:'past the low pack, short of 6', cone:'6' },
      { k:'close',  label:'closing on cone 10',hint:'6, 8, 9 going over',           cone:'10' },
      { k:'past',   label:'cone 10 or past it',hint:'done, or overfiring',          cone:null },
    ],
  },
};

// What fills in, permanently, in your own hand, when an instrument confirms.
// This is where the pyrometer lesson finally lands — after YOU diagnosed it.
export const NOTEBOOK_PAGES = {
  flame: [
    `a rich fire has more fuel than air, so it takes its oxygen back out of the glaze. that is reduction, and it is the only reason any of this is worth doing.`,
    `read it at the peep, not on a dial. long, soft, licking orange means the kiln is hungry. short blue and bushy means it is burning clean. green-tinted sits between them.`,
    `black smoke at the chimney is not more reduction, it is waste — carbon in the clay, dull dead glazes, and gas you paid for going out of the stack.`,
  ],
  climb: [
    `about 150°F an hour through the middle is the honest working rate. faster and the quartz inversion at 1063° will crack ware you will not see fail for another eight hours.`,
    `flat is not always a stall. at the top it is a soak, and a soak is heat work, which is the thing you are actually buying.`,
    `⚠️ a real stall near the top is usually TOO MUCH GAS, not too little. the excess draft carries the heat out of the stack faster than it arrives. cut the gas back and it climbs again. this one is backwards and it will catch you twice.`,
  ],
  cones: [
    `a cone measures HEAT WORK — temperature multiplied by the time you spent there — and bends when it has had enough of both.`,
    `⚠️ so the pyrometer lies. not by being broken: by answering a different question. a kiln taken fast to cone 10's temperature has not done cone 10's work, and the pots come out dry and underdeveloped with the needle reading exactly right.`,
    `steer by the pack. the low pack tells you when to close the damper. the top pack tells you when to stop.`,
  ],
};

// §4.5 — THE COUNTERFACTUAL'S LEVER. A near-miss you can act on is a lesson; a
// near-miss you can only feel is a slot machine. Most of these outcomes are
// genuinely refirable in real ceramics, so the offer is real: put it back in the
// next load and try the adjustment the card just named.
export const REFIRE = {
  // what can go back in. a cracked pot cannot be un-cracked — that one is finished.
  reasons: {
    underfired: 'came out short of cone 10. more heat work would still take.',
    dull:       'never reduced. the colour is in there, it just was not asked for.',
    dry:        'no soak — the surface never had time to melt properly.',
  },
  maxCarried: 3,     // you cannot bank a whole shelf of second chances
};

// ---------------------------------------------------------------------------
// THE REVEAL (M3). §9 — "the single most important twenty minutes in the game,
// and it is engineered beat by beat."
//
// The five beats: 1 the tick · 2 crack the door · 3 open · 4 unload by hand ·
// 5 the flagged piece last. Four and five shipped in Phase 0; one, two and three
// are here. The unboxing research is unambiguous that the dopamine is in the
// ANTICIPATION rather than the receipt, and the peak-end rule means the most
// intense moment and the CONCLUSION disproportionately set the memory.
//
// ⚠️ The cooling gate is not a designer teasing the player. It is dunting
// prevention, the player agrees with it, and that is exactly why the wait works
// (§9.1). Do not add a "skip to results" button. The waiting IS the mechanic.
// ---------------------------------------------------------------------------

// BEAT 2 — colour temperature, which is the one bit of information a potter
// actually reads first, and the only thing a cracked door gives you.
// Real incandescence: a kiln tells you its temperature by what colour it is,
// and at the cooling stage temperature is finally the RIGHT question — so the
// pyrometer, which lies about heat work all firing, is honest here for once.
export const GLOW = [
  { max:  850, key:'black',   col:'#241d19', lit:0.00, name:'black',              line:'nothing. no light at all through the peep — you could put your hand near the door.' },
  { max: 1080, key:'faint',   col:'#5a1608', lit:0.18, name:'the faintest red',   line:'a red you only see because the shed is dark. it would be invisible in daylight.' },
  { max: 1350, key:'dull',    col:'#8c1f06', lit:0.34, name:'dull red',           line:'dull red, and sullen with it. this is where the cristobalite inversion lives — no draughts.' },
  { max: 1650, key:'cherry',  col:'#c33c07', lit:0.55, name:'cherry red',         line:'cherry red. the old books measure by this and they are not wrong to.' },
  { max: 1900, key:'orange',  col:'#e8720d', lit:0.74, name:'orange',             line:'orange, and moving. still far too hot to be thinking about the door.' },
  { max: 2150, key:'bright',  col:'#ffa22a', lit:0.88, name:'bright orange',      line:'bright orange. everything in there is still soft enough to care about.' },
  { max: 9999, key:'white',   col:'#ffd98f', lit:1.00, name:'yellow-white',       line:'yellow-white and you cannot look straight at it. that is a working kiln, not a cooling one.' },
];

// BEAT 1 — the tick. What the room is doing while you wait, keyed to temperature.
// The kiln cools for longer than it fired, and the game lets you sit with that.
export const COOLING = [
  { max:  420, t:'cool enough. whatever happened in there has finished happening.' },
  { max:  700, t:'the ticking has spread out to one every few seconds. it is nearly over and it is nearly safe.' },
  { max: 1100, t:'past the quartz inversion. the ticking is slower now, and further apart, and further away.' },
  { max: 1500, t:'the brick is talking to itself. every tick is something in there letting go of a little more heat.' },
  { max: 1900, t:'it ticks as it comes down — sharp, irregular, somewhere behind the door.' },
  { max: 9999, t:'still roaring quietly to itself with the burners off. nothing to do but let it.' },
];

// BEAT 3 — you open it, and everything is there at once and none of it is in
// your hands yet. Still too warm to read a surface: you get the shape and the
// heat and nothing else, which is the whole point of making beat 4 slow.
export const OPENING = {
  head:  'the door is off',
  sub:   'everything at once, still warm, none of it in your hands.',
  line:  'you can see all of it and none of it properly. take them out one at a time — the one you flagged comes out last, which is either a reward or a punishment and you will not know which until it does.',
  noflag:'you flagged nothing this firing, so they come out in the order you stacked them.',
};

// ---------------------------------------------------------------------------
// THE KILN'S OWN HISTORY (M4). §5.5.
// "Real kilns develop character. Yours does too, persistently, across the whole
// save." The bible is explicit that this is also THE ANSWER TO "why fire it a
// second time" (§21 trap 5): a kiln with a history is a different kiln, so
// firing #6 is not firing #2 with different colours.
//
// ⚠️ Every number here is a SIM INPUT, not randomness. Same kiln state + same
// seed = the same firing, byte for byte. Wear is something you CAUSED and can
// read on the load screen before you commit — it never ambushes you (§19.3, §19.5).
// ---------------------------------------------------------------------------
export const WEAR = {
  // glaze runs onto a shelf and never fully comes off. glazed brick reflects heat,
  // so a shelf you have run glaze onto gets HOTTER — a hot spot becomes hotter.
  glazePerRun: 1,
  glazeHeat: 0.075,        // added POSITIONS.heat per point of glaze
  glazeMax: 4,

  // shelves warp from repeated work at the top of the range. a warped shelf
  // cannot take a tall piece — it will not sit flat and it will go over.
  // ⚠️ MEASURED. This was 0.94 × cone 10, which 71% of shelves cross in any decent
  // firing — every shelf warped every night and the kiln refused all tall work
  // within three firings. Warping is for genuine OVERfiring: at 1.35 × cone 11
  // it is 11% of shelves per firing, so a shelf goes out of true roughly every
  // nine firings and needs three of those to stop taking tall pieces.
  warpAtCone11: 1.35,      // multiple of cone 11 heat work that warps a shelf
  warpMax: 4,
  warpBlocksTall: 3,       // warp at or above this refuses tall forms
  tallForms: ['bottle','vase','jar'],

  // after a hard reduction the flue draws differently for a firing or two. soot.
  fluePerHardRed: -0.10,   // added to the draw condition's effect
  flueHardRedMin: 150,     // sim-minutes of reduction that counts as "hard"
  flueDecay: 0.5,          // how much of it survives into the next firing
  flueFloor: -0.24,

  // what it costs to put a shelf right again
  shelfCost: 38,
};

// §6.4 — BUYING CERTAINTY. Two ways to convert uncertainty into knowledge, both
// costly, both real potter's technique. "That's the trade: information costs
// production."
export const CERTAINTY = {
  // run the burners ten minutes before you load. costs fuel and half an hour, and
  // tells you tonight's kiln PRECISELY instead of approximately.
  trial: { cost: 22, label: 'run the burners ten minutes' },
  // a test tile takes a shelf a pot could have had, and can be pulled through the
  // spyhole mid-firing with long tongs for one real, unambiguous observation.
  tile:  { cost: 3, max: 3 },
};

// ---------------------------------------------------------------------------
// THE RARE TIER (M5). §8.
// "A small hand-authored rare tier exists that no combination of parameters
// produces — landmarks in the generative space... They are NOT LUCKY; they are
// the reward for a specific, hard, discoverable combination."
//
// ⚠️ READ THAT TWICE. Every rare below is a DETERMINISTIC conjunction of things
// you did: the glaze, how thick you laid it on, which shelf you chose, how hard
// you reduced, how slowly you let it down. No rng anywhere. A player who works
// out the combination can produce it ON PURPOSE, every time — that is the whole
// point, and it is what separates a landmark from a jackpot.
// ⚠️ Do NOT make these rarer by adding a dice roll. If one feels too common,
// tighten its conditions.
// ---------------------------------------------------------------------------
export const RARES = [
  { id:'oxblood', name:'oxblood',
    of:'copper red, held hard and stopped exactly',
    note:'copper reduced deep and hard, taken to cone 10 and stopped there. one cone further and it burns out.',
    tint:[168,20,26],
    when:(p,S)=> p.glazeKey==='copperred' && !p.copperFlip
              && p.reduction>=0.95 && p.heatwork>=0.95 && p.heatwork<=1.18
              && ['frontmid','flamelane','backmid'].includes(p.posKey) },

  { id:'truefur', name:"hare's fur, the whole way down",
    of:'iron pulled into streaks from rim to foot',
    note:'tenmoku laid on thick, taken hot, and let down slowly enough for the iron to draw itself into threads.',
    tint:[196,142,86],
    when:(p,S)=> p.effGlaze==='tenmoku' && p.events.some(e=>e.k==='harefur')
              && p.coolRate<=0.22 && p.heatwork>=0.95 && p.applied>=0.55 },

  { id:'oilspot', name:'oil spot',
    of:'silver droplets suspended in black',
    note:'iron saturate, thick, very hot, and cooled slower than anyone has patience for.',
    tint:[214,214,206],
    when:(p,S)=> p.effGlaze==='tenmoku' && p.events.some(e=>e.k==='oilspot')
              && p.coolRate<=0.18 && p.applied>=0.62 },

  { id:'firemarked', name:'the shino that kept its orange',
    of:'carbon trapped early, orange held to the end',
    note:'shino, reduced early while the body was still open, on a shelf cool enough to hold the carbon in.',
    tint:[226,116,44],
    // ⚠️ this one was 16 of 28 landmarks in a measured sweep — its conditions had
    // collapsed to "shino on a cool shelf", because reduction is already ≥0.95 in
    // 86% of real firings. A trap needs the coat to be THICK and the shelf properly
    // cold, or it is not a landmark, it is just what shino does.
    when:(p,S)=> p.effGlaze==='shino' && p.events.some(e=>e.k==='carbontrap')
              && p.reduction>=0.95 && p.applied>=0.62
              && ['coolbottom','deadcorner'].includes(p.posKey) },

  { id:'chunblue', name:'chun, broken blue',
    of:'opalescent blue standing over a dark body',
    note:'chun laid on thick and cooled slowly. thin chun is nothing at all; this is the other end of that.',
    tint:[142,178,214],
    when:(p,S)=> p.effGlaze==='chun' && p.applied>=0.70 && p.coolRate<=0.26 && p.heatwork>=0.92 },

  { id:'ashsigned', name:'signed by the fire',
    of:'ash run down the flame side and pooled where it stopped',
    note:'ash glaze put where the flame actually touches, taken past cone 10 and soaked until it moved.',
    tint:[176,146,72],
    when:(p,S)=> p.effGlaze==='ash' && ['flamelane','flueshelf'].includes(p.posKey)
              && p.events.some(e=>e.k==='run') && p.heatwork>=1.0 },
];

// ---------------------------------------------------------------------------
// §4.5 — TWO-SIDED BAD-LUCK PROTECTION. Never surfaced, never a number on screen.
// The research is blunt about why this exists: under independent rolls ~5% of
// players need THREE TIMES the expected number of attempts, and in a game where
// one firing is one session that 5% quits convinced the game is rigged.
//
// ⚠️ This nudges the CONDITIONS ROLL ONLY — the dice that §4.2 puts in front of
// the door and shows you in full. It never touches the firing, never touches a
// pot, and never lies about what it rolled. And per §4.3: bend it in the
// player's favour and DO NOT MENTION IT. There is deliberately no UI for this.
// ---------------------------------------------------------------------------
export const LUCK = {
  dryAfter: 2,        // consecutive poor nights before the floor starts helping
  // ⚠️ MEASURED, and deliberately gentle. All THREE conditions take the same
  // shift, so the effect compounds threefold on the night as a whole. At 0.30
  // a dry run produced 76% kind nights against a 22% baseline — a player would
  // see that, and §4.5 requires this to be invisible. These values move the
  // odds without ever becoming legible.
  dryBias: 0.13,      // how far it leans the conditions your way
  richBias: -0.10,    // and how far it leans back after a remarkable one
  maxDry: 4,
};

// §14.4 — KILN GODS. Potters make a small clay figure and set it on the kiln for
// luck, and afterwards it is variously kept, broken, thrown out, or quietly left
// there for years.
// ⚠️⚠️ §19.10 — THE KILN GOD DOES NOTHING. Not +5%. Not +1%. Not "slightly".
// The moment it grants anything you have destroyed the only genuinely
// superstitious thing in the design. It is here to be made and to sit there.
export const KILN_GODS = [
  { id:'lump',    name:'a lump with a face',   line:'you did not spend long on it.' },
  { id:'bird',    name:'a bird, more or less', line:'the beak fell off before it was dry. you pressed it back on.' },
  { id:'figure',  name:'a small standing figure', line:'arms folded. it looks unimpressed with you.' },
  { id:'beast',   name:'something with too many legs', line:'nobody has asked what it is meant to be.' },
  { id:'ring',    name:'a ring with a thumbprint in it', line:'your thumb. that is the whole of it.' },
];

// ---------------------------------------------------------------------------
// THE ARC (M6). §13.
// "Not acts. Three states, and you slide between them."
//   FIRING FOR YOURSELF      — your work, mostly bad, and the kiln is a stranger
//   FIRING FOR THE STUDIO    — nine people's work, and choices about whose goes where
//   FIRING FOR SOMEONE ELSE TO LEARN — someone new wants to know how
//
// "THE ENDGAME OF A CRAFT IS TEACHING IT, and this is the only honest ending a
// game about a kiln has."
//
// ⚠️ §13 also says: "There is no victory. There is a firing where everything you
// intended happened, and it will not be the one you remember." Do not add a win
// screen, a score, or a completion percentage to any of this.
// ---------------------------------------------------------------------------
export const ARC = {
  // you fire for yourself until the studio decides you can be trusted with theirs
  yourselfUntil: 3,        // firings
  // and someone new turns up once you visibly know what you are doing
  teachingAfter: 7,        // firings
  teachingNeedsSettled: 2, // ...and at least this many instruments settled (§10)
  membersEarly: 2,         // how many people leave work in the damp room, early on
  membersMid: 6,
};

// ⚠️ You can only be ASKED about an instrument you have SETTLED in your own
// notebook (§10). That is the whole join between the two systems: three correct
// readings in a row earned you the page, and the page is what you have to give.
// And what you tell them is what they believe — including if you tell them wrong.
export const LESSONS = {
  flame: {
    ask: 'how do you know when it is actually reducing? i keep looking and it just looks like fire.',
    opts: [
      { k:'red',     say:'long, soft, licking orange out of the peep. if it is short and blue it is burning clean.', right:true },
      { k:'ox',      say:'short and blue is what you want. that is a rich fire.',                                    right:false },
      { k:'neutral', say:'you cannot really tell by looking. go by the dial.',                                        right:false },
    ],
    learnt: 'fen watches the spyhole now instead of the pyrometer. it took about ten minutes.',
    wrong:  'fen believes you. fen will be looking for a short blue flame and calling it reduction.',
  },
  climb: {
    ask: 'how fast is it meant to be going up? i do not want to be the one who cracks everything.',
    opts: [
      { k:'steady', say:'about a hundred and fifty an hour through the middle. faster than that and you will crack ware you will not see fail for hours.', right:true },
      { k:'hard',   say:'as fast as it will go. the sooner it is up the sooner it is down.', right:false },
      { k:'holding',say:'slow as you can bear. you cannot really overdo slow.',              right:false },
    ],
    learnt: 'fen has started throttling back on the climb without being told.',
    wrong:  'fen is going to run it up hard, because you said so.',
  },
  cones: {
    ask: 'why do you keep squinting at those little cones when there is a perfectly good number on the wall?',
    opts: [
      { k:'work', say:'because the cones measure the work the fire has done — heat and time together. the number only knows how hot it is right now.', right:true },
      { k:'temp', say:'habit, mostly. the number is fine.',                                    right:false },
      { k:'both', say:'the cones are for show. everyone has a cone pack.',                      right:false },
    ],
    learnt: 'fen has stopped asking what the pyrometer says.',
    wrong:  'fen steers by the dial now. exactly the way you told them to.',
  },
};

export const ARC_LINES = {
  yourself: {
    head: 'you are firing for yourself',
    line: 'nobody has left much in the damp room yet. it is mostly your work in there, and the kiln is still a stranger to you.',
  },
  studio: {
    head: 'you are firing for the studio',
    line: 'nine people leave their work on that shelf and go home. what happens to it happens because of where you put it.',
  },
  teaching: {
    head: 'somebody is watching you do it',
    line: 'fen started three weeks ago and has not fired anything. they have taken to standing near the kiln at the part where nothing is happening.',
  },
};

export const FEN = {
  name: 'Fen',
  arrives: 'there is somebody new in the studio. they have been here three weeks and have not fired anything, and tonight they asked if they could watch.',
  readyToFire: 'fen has asked whether they can do the next one. you would be standing right there.',
  afterGood: 'fen fired it. you stood at the back and did not touch anything, which was harder than firing it yourself.',
  afterBad: 'fen fired it, and it went the way you taught them it would go. they are already working out what they would do differently.',
  // ⚠️ §13: "There is no victory." This is a closing beat, not a win screen.
  close: 'that is the job, then. somebody taught you and did not make a thing of it, and now you have done the same, and the kiln does not care either way. the light is still on.',
};

// ---------------------------------------------------------------------------
// WHAT EACH GLAZE WANTS (M9). §5.4, §7.1 — and §19.5.
//
// ⚠️ THE LOAD IS THE PUZZLE AND IT WAS UNSOLVABLE. A piece said "lidded jar /
// chun / yours" and a shelf said "hottest, heaviest reduction", and NOTHING
// anywhere said what chun wanted. Nine glazes, nine shelves, no stated relation:
// the player was placing pots by coin flip while the bible calls this the place
// where most of the game's decision weight lives.
//
// §19.5 also forbids failing a player on a variable they had no instrument for.
// A glaze's preference is exactly such a variable, so it belongs on screen
// BEFORE the door is bricked up.
//
// ⚠️ These are DIRECTIONS, not a solution. You have nine pieces and nine shelves,
// so somebody's pot has to go somewhere wrong — that is the decision. Never turn
// this into a single correct answer, and never score the finished pot with it (§4.4).
//   red  : +1 wants heavy reduction · 0 does not care · -1 wants OXIDATION
//   heat : +1 wants it hot · 0 middling · -1 tolerates a cool shelf
//   ash  : +1 wants flame contact and flying ash
//   cool : +1 wants a slow cool (shut the damper afterwards)
// ---------------------------------------------------------------------------
export const WANTS = {
  tenmoku:  { red:+1, heat:+1, ash:0,  cool:+1,
              line:'heavy reduction, laid on thick. slow cool and the iron draws into streaks.' },
  celadon:  { red:+1, heat:+1, ash:0,  cool:0,
              line:'clean reduction and real heat. thin. it will craze, and that is the point.' },
  copperred:{ red:+1, heat:+1, ash:0,  cool:0,
              line:'the heaviest reduction you have. get it wrong and it comes out green.' },
  oribe:    { red:-1, heat:+1, ash:0,  cool:0,
              line:'⚠ OXIDATION — the opposite of everything else. it wants the back top.' },
  shino:    { red:+1, heat:-1, ash:0,  cool:0,
              line:'early reduction and a cooler shelf, to trap the carbon and keep the orange.' },
  chun:     { red:+1, heat:+1, ash:0,  cool:+1,
              line:'thick, and cooled slowly. thin chun is nothing at all.' },
  ash:      { red:0,  heat:+1, ash:+1, cool:0,
              line:'put it where the flame actually touches. the fire does the decorating.' },
  rutile:   { red:0,  heat:0,  ash:0,  cool:+1,
              line:'a slow cool grows the crystals. it is patient rather than hot.' },
  clear:    { red:0,  heat:0,  ash:0,  cool:0,
              line:'it does not mind. it shows the clay and whatever happened to it.' },
};
