// Comparison of the four logics — run straight from the application physics model.
//
// This script uses the same module as the web page (js/sim.js), runs five cases with the four
// logics, then computes a 70 (safety) : 30 (wear) score. No figure is written by hand: every
// value comes from the Sim object.
//
// Usage:
//   node tools/compare-logics.mjs            -> table
//   node tools/compare-logics.mjs --json     -> JSON (for comparison with a real test)
//
// Vehicle parameters come from js/presets.js. Once brake-test results exist, change
// aCapEmpty / brakeBuild / sensorDelay / processDelay / valveDelay in the preset and run this
// script again. The score then follows the measurement, not the text in the document.

import { Sim } from '../js/sim.js';
import { VEHICLES } from '../js/presets.js';

const VEH = (process.env.AEBS_VEHICLE
  ? VEHICLES.find(v => v.id === process.env.AEBS_VEHICLE)
  : null) || VEHICLES.find(v => v.id === 'faw-jh6');

const BASE = {
  vehicle: VEH,
  loaded01: +(process.env.AEBS_LOADED ?? 1),   // 1 = loaded 66.5 t, 0 = empty 26 t
  mu: +(process.env.AEBS_MU ?? 0.60),
  grade: 0,
  aebEnabled: true,
  partialTTC: 1.8,
  fullTTC: 0.9,
  filterTau: 0.15,
  dynamicTTC: true,
  headway: 4,
  aebMargin: 3,
  leadBrake: false,
  leadBrakeAt: 1,
  leadBrakeDecel: 3
};

const DT = 0.005;          // same as the application cycle (200 Hz)
const MAX_T = 90;          // time limit for one case

const LOGICS = [
  { id: 'rel', label: '1 — relative TTC' },
  { id: 'headway', label: '2 — TTC + safe distance' },
  { id: 'predictive', label: '3 — predictive' },
  { id: 'pure4s', label: '4 — pure 4-second keeper' }
];

// Lima keadaan. Keadaan 1 sengaja memakai tepat 4 detik untuk menguji batas aturan.
// All cases use the same 70 m initial gap so the four choices are tested under comparable
// conditions. At 60 km/h, 70 m equals 4.2 seconds (4 seconds = 66.7 m).
const GAP0 = 70;
const CASES = [
  { id: 'K1', name: 'object at rest 60 km/h', detail: `60 km/h, object at rest, ${GAP0} m (4.2 s)`, cfg: { v0: 60, vLead: 0, gap0: GAP0 } },
  { id: 'K2', name: 'object at rest 50 km/h', detail: `50 km/h, object at rest, ${GAP0} m (5.0 s)`, cfg: { v0: 50, vLead: 0, gap0: GAP0 } },
  { id: 'K3', name: 'lead brakes hard', detail: `45 km/h, ${GAP0} m, lead 5 m/s²`, cfg: { v0: 45, vLead: 45, gap0: GAP0, leadBrake: true, leadBrakeDecel: 5 } },
  { id: 'K4', name: 'lead breaks down', detail: `45 km/h, ${GAP0} m, lead 0.3 m/s²`, cfg: { v0: 45, vLead: 45, gap0: GAP0, leadBrake: true, leadBrakeDecel: 0.3 } },
  { id: 'K5', name: 'convoy slows', detail: `40 km/h, ${GAP0} m, lead 38 km/h braking 3`, cfg: { v0: 40, vLead: 38, gap0: GAP0, leadBrake: true, leadBrakeDecel: 3 } }
];

// Nuisance case: steady convoy, 30 seconds. A haul-road convoy is almost always like this.
const NUISANCE = { v0: 40, vLead: 38, gap0: 3.5 * 40 / 3.6, seconds: 30, headway: 4 };

function runLogic(over, maxT = MAX_T) {
  const s = new Sim({ ...BASE, ...over });
  let collided = false, impact = 0, minGap = Infinity, firstBrake = null;
  let activations = 0, prevApplied = 0;

  while (s.t < maxT && !s.done) {
    s.step(DT);
    const g = s.gap();
    if (g < minGap) minGap = g;
    if (s.applied > 0.05 && prevApplied <= 0.05) activations++;
    prevApplied = s.applied;
    if (firstBrake === null && s.applied > 0.05) firstBrake = s.t;
    if (g <= 0.02 && s.closing() > 0.05) { collided = true; impact = s.closing(); break; }
    if (s.vEgo <= 0.01 && s.closing() <= 0.05 && s.t > 0.5) break;
  }

  return {
    collided,
    impactKph: impact * 3.6,
    remainingM: minGap,
    travelM: over.gap0 - minGap,
    firstBrakeS: firstBrake,
    activations,
    peakDecel: s.peakDecel,
    aAvail: s.params.aAvail,
    energyMJ: s.brakeEnergy / 1e6,
    massT: s.params.massT,
    outcome: s.outcome
  };
}

// Safety: collision 0, stopping with 5 m or more left 100.
function safetyScore(r) {
  return r.collided ? 0 : Math.min(100, r.remainingM / 5 * 100);
}

const results = [];
for (const L of LOGICS) {
  const cases = CASES.map(c => ({ ...c, r: runLogic({ ...c.cfg, logic: L.id }) }));
  const nuis = runLogic({ ...NUISANCE, logic: L.id }, NUISANCE.seconds);

  const safetyParts = cases.map(c => safetyScore(c.r));
  const safety = safetyParts.reduce((a, b) => a + b, 0) / safetyParts.length;

  const peakFrac = cases.map(c => c.r.peakDecel / c.r.aAvail);
  const meanPeakFrac = peakFrac.reduce((a, b) => a + b, 0) / peakFrac.length;
  const nuisanceEnergyNorm = Math.min(1, nuis.energyMJ / 1.2);
  const wear = 100 - (60 * meanPeakFrac + 40 * nuisanceEnergyNorm);

  results.push({
    logic: L.id,
    label: L.label,
    cases: cases.map(c => ({
      id: c.id, name: c.name, detail: c.detail,
      collided: c.r.collided,
      impactKph: +c.r.impactKph.toFixed(1),
      remainingM: +c.r.remainingM.toFixed(1),
      firstBrakeS: c.r.firstBrakeS === null ? null : +c.r.firstBrakeS.toFixed(2),
      peakDecel: +c.r.peakDecel.toFixed(2),
      energyMJ: +c.r.energyMJ.toFixed(2),
      safetyPart: +safetyScore(c.r).toFixed(1)
    })),
    nuisance: {
      activations: nuis.activations,
      energyMJ: +nuis.energyMJ.toFixed(2)
    },
    safety: +safety.toFixed(1),
    meanPeakFrac: +meanPeakFrac.toFixed(3),
    wear: +wear.toFixed(1),
    total: +(0.7 * safety + 0.3 * wear).toFixed(1)
  });
}

results.sort((a, b) => b.total - a.total);

const meta = {
  vehicle: VEH.name,
  vehicleId: VEH.id,
  massT: results[0] ? undefined : undefined,
  loaded01: BASE.loaded01,
  mu: BASE.mu,
  aAvail: +runLogic({ ...CASES[0].cfg, logic: 'rel' }).aAvail.toFixed(3),
  latencyS: +(VEH.sensorDelay + VEH.processDelay + (VEH.valveDelay ?? 0)).toFixed(2),
  brakeBuildS: VEH.brakeBuild,
  aCapVerified: !!VEH.aCapVerified,
  weights: { safety: 0.7, wear: 0.3 }
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ meta, results }, null, 2));
} else {
  console.log(`Vehicle  : ${meta.vehicle}`);
  console.log(`Mass     : ${BASE.loaded01 ? 'loaded' : 'empty'} · μ ${meta.mu} · a_available ${meta.aAvail} m/s²`);
  console.log(`Actuator : latency ${meta.latencyS} s · build ${meta.brakeBuildS} s`);
  console.log(`a_brake verified: ${meta.aCapVerified ? 'yes' : 'NO (assumed value)'}`);
  console.log('');

  for (const r of results) {
    console.log(`${r.label}  ->  score ${r.total} (safety ${r.safety}, wear ${r.wear})`);
    for (const c of r.cases) {
      const res = c.collided ? `COLLISION ${c.impactKph} km/h` : `${c.remainingM} m left`;
      console.log(`   ${c.id} ${c.name.padEnd(22)} ${res.padEnd(20)} brake at ${c.firstBrakeS ?? '-'} s · peak ${c.peakDecel} m/s²`);
    }
    console.log(`   without hazard (30 s, 3.5 s gap): ${r.nuisance.activations} activations · ${r.nuisance.energyMJ} MJ`);
    console.log('');
  }

  console.log('Ranking:');
  results.forEach((r, i) => console.log(`  ${i + 1}. ${r.label.padEnd(28)} ${r.total}`));
  console.log('\nNote: the score is valid for comparing logics. Absolute figures are not valid');
  console.log('until a_brake, latency, and brakeBuild come from a brake test on the unit.');
}
