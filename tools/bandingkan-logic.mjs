// Perbandingan empat logic — dijalankan langsung dari model fisika aplikasi.
//
// Skrip ini memakai modul yang sama dengan halaman web (js/sim.js), menghitung
// lima keadaan dengan keempat logic, lalu menghitung skor 70 (keselamatan) : 30 (keausan).
// Tidak ada angka yang ditulis tangan: semua berasal dari objek Sim.
//
// Pakai:
//   node tools/bandingkan-logic.mjs            -> tabel
//   node tools/bandingkan-logic.mjs --json     -> JSON (untuk dibandingkan dengan uji nyata)
//
// Prasyarat: parameter kendaraan diambil dari js/presets.js. Bila hasil brake test
// sudah ada, ubah aCapEmpty / brakeBuild / sensorDelay / processDelay / valveDelay
// di preset, lalu jalankan ulang skrip ini. Skor akan berubah mengikuti pengukuran,
// bukan mengikuti tulisan di dokumen.

import { Sim } from '../js/sim.js';
import { VEHICLES } from '../js/presets.js';

const VEH = (process.env.AEBS_VEHICLE
  ? VEHICLES.find(v => v.id === process.env.AEBS_VEHICLE)
  : null) || VEHICLES.find(v => v.id === 'faw-jh6');

const BASE = {
  vehicle: VEH,
  loaded01: +(process.env.AEBS_LOADED ?? 1),   // 1 = muat 66,5 t, 0 = kosong 26 t
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

const DT = 0.005;          // sama dengan siklus aplikasi (200 Hz)
const MAX_T = 90;          // batas waktu satu keadaan

const LOGICS = [
  { id: 'rel', label: '1 — TTC relatif' },
  { id: 'headway', label: '2 — TTC + jarak aman' },
  { id: 'predictive', label: '3 — prediktif' },
  { id: 'pure4s', label: '4 — jarak 4 detik murni' }
];

// Lima keadaan. Keadaan 1 sengaja memakai tepat 4 detik untuk menguji batas aturan.
// Semua keadaan memakai jarak awal yang sama, 70 m, supaya kelima pilihan diuji pada
// kondisi yang sebanding. Pada 60 km/h, 70 m setara 4,2 detik (4 detik = 66,7 m).
const GAP0 = 70;
const CASES = [
  { id: 'K1', name: 'objek diam 60 km/h', detail: `60 km/h, objek diam, ${GAP0} m (4,2 s)`, cfg: { v0: 60, vLead: 0, gap0: GAP0 } },
  { id: 'K2', name: 'objek diam 70 km/h', detail: `70 km/h, objek diam, ${GAP0} m (3,6 s)`, cfg: { v0: 70, vLead: 0, gap0: GAP0 } },
  { id: 'K3', name: 'depan mengerem keras', detail: `45 km/h, ${GAP0} m, objek 5 m/s²`, cfg: { v0: 45, vLead: 45, gap0: GAP0, leadBrake: true, leadBrakeDecel: 5 } },
  { id: 'K4', name: 'depan mogok', detail: `45 km/h, ${GAP0} m, objek 0,3 m/s²`, cfg: { v0: 45, vLead: 45, gap0: GAP0, leadBrake: true, leadBrakeDecel: 0.3 } },
  { id: 'K5', name: 'konvoi melambat', detail: `40 km/h, ${GAP0} m, objek 38 km/h rem 3`, cfg: { v0: 40, vLead: 38, gap0: GAP0, leadBrake: true, leadBrakeDecel: 3 } }
];

// Keadaan tanpa bahaya: konvoi tetap, 30 detik. Konvoi haul road hampir selalu begini.
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

// Keselamatan: tabrakan 0, berhenti dengan sisa 5 m atau lebih 100.
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
  console.log(`Kendaraan : ${meta.vehicle}`);
  console.log(`Massa     : ${BASE.loaded01 ? 'muat' : 'kosong'} · μ ${meta.mu} · a_tersedia ${meta.aAvail} m/s²`);
  console.log(`Aktuator  : latency ${meta.latencyS} s · build ${meta.brakeBuildS} s`);
  console.log(`a_brake terverifikasi: ${meta.aCapVerified ? 'ya' : 'BELUM (nilai asumsi)'}`);
  console.log('');

  for (const r of results) {
    console.log(`${r.label}  →  skor ${r.total} (keselamatan ${r.safety}, keausan ${r.wear})`);
    for (const c of r.cases) {
      const res = c.collided ? `TABRAKAN ${c.impactKph} km/h` : `sisa ${c.remainingM} m`;
      console.log(`   ${c.id} ${c.name.padEnd(22)} ${res.padEnd(20)} mulai rem ${c.firstBrakeS ?? '-'} s · puncak ${c.peakDecel} m/s²`);
    }
    console.log(`   tanpa bahaya (30 s, 3,5 detik): ${r.nuisance.activations} aktivasi · ${r.nuisance.energyMJ} MJ`);
    console.log('');
  }

  console.log('Peringkat:');
  results.forEach((r, i) => console.log(`  ${i + 1}. ${r.label.padEnd(28)} ${r.total}`));
  console.log('\nCatatan: skor sah untuk perbandingan antar logic. Angka absolut belum sah');
  console.log('sampai a_brake, latency, dan brakeBuild berasal dari uji pengereman unit.');
}
