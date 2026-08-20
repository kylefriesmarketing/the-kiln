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
export const POSITIONS = {
  flamelane:  { name:'flame lane',   heat:+1.0, red:+1.0, flow:+0.25, flash:0.9,  ash:0.7 },
  frontmid:   { name:'front middle', heat:+0.6, red:+0.7, flow:+0.12, flash:0.35, ash:0.3 },
  fronttop:   { name:'front top',    heat:+0.7, red:+0.3, flow:+0.10, flash:0.15, ash:0.15 },
  middle:     { name:'middle',       heat: 0.0, red: 0.0, flow: 0.00, flash:0.05, ash:0.1 },
  backmid:    { name:'back middle',  heat:-0.2, red:+0.5, flow:-0.05, flash:0.05, ash:0.2 },
  backtop:    { name:'back top',     heat:+0.5, red:-1.0, flow:+0.08, flash:0.05, ash:0.05 },
  coolbottom: { name:'cool bottom',  heat:-1.0, red:-0.3, flow:-0.35, flash:0.0,  ash:0.05 },
  deadcorner: { name:'dead corner',  heat:-1.4, red:-0.6, flow:-0.50, flash:0.0,  ash:0.0 },
  flueshelf:  { name:'flue shelf',   heat:-0.1, red:+0.2, flow:-0.10, flash:0.1,  ash:0.9 },
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
  lag: { gas: 13, air: 18, damper: 26 },

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
    { id:'candle',   name:'candle',            at:{t:0},              hold:120, want:{gas:[1,3],  damper:[6,10]}, miss:'ware went in damp — blowouts' },
    { id:'climb',    name:'the climb',         at:{t:120},            hold:150, want:{rate:[190,430]},            miss:'climbed too hard through quartz inversion' },
    { id:'bodyred',  name:'BODY REDUCTION',    at:{cone:'012'},       hold:30,  want:{atm:[0.35,0.85]},           miss:'no body reduction' },
    { id:'reox',     name:'reoxidise & climb', at:{cone:'08'},        hold:90,  want:{atm:[-1,0.12]},             miss:'stayed rich — carbon coring' },
    { id:'glazered', name:'glaze reduction',   at:{cone:'6'},         hold:120, want:{atm:[0.30,0.95]},           miss:'glazes never reduced' },
    { id:'approach', name:'the approach',      at:{cone:'9'},         hold:25,  want:{atm:[-0.1,0.35]},           miss:'stalled short of cone 10' },
    { id:'soak',     name:'the soak',          at:{cone:'10'},        hold:25,  want:{rate:[-18,18]},             miss:'no soak — surfaces stayed dry' },
    { id:'shutdown', name:'clean-up & shut',   at:{cone:'10',off:25}, hold:20,  want:{atm:[-1,0.10]},             miss:'shut down dirty' },
  ],
  // ⚠️ THE ONE-WAY DOOR (§6.2). Real, sourced, irreversible.
  // "If you begin reducing later than 06, you may have missed reduction and will not get any."
  reductionDeadlineCone: '06',

  cool: { targetOpenF: 400, ratePerNotch: 0.42, base: 0.55, duntF: 1063, duntF2: 439 },

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
