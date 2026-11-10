import { VEHICLES, SCENARIOS } from './presets.js';
import { Sim } from './sim.js';
import { Renderer, drawChart } from './render.js';

const $ = (s) => document.querySelector(s);

const el = {
  vehicle: $('#vehicle'),
  vehNote: $('#vehNote'),
  loadSeg: $('#loadSeg'),
  massNote: $('#massNote'),
  specGrid: $('#specGrid'),
  surface: $('#surface'),
  muNote: $('#muNote'),
  v0: $('#v0'), v0o: $('#v0o'),
  gap0: $('#gap0'), gap0o: $('#gap0o'),
  vLead: $('#vLead'), vLeado: $('#vLeado'),
  grade: $('#grade'), gradeo: $('#gradeo'),
  aeb: $('#aeb'),
  warnTTC: $('#warnTTC'), warnTTCo: $('#warnTTCo'),
  partialTTC: $('#partialTTC'), partialTTCo: $('#partialTTCo'),
  fullTTC: $('#fullTTC'), fullTTCo: $('#fullTTCo'),
  filterTau: $('#filterTau'), filterTauo: $('#filterTauo'),
  dynTTC: $('#dynTTC'), dynNote: $('#dynNote'),
  capFromForce: $('#capFromForce'), capNote: $('#capNote'),
  capVerified: $('#capVerified'), verifyChip: $('#verifyChip'),
  logic: $('#logic'),
  headway: $('#headway'), headwayo: $('#headwayo'),
  govDecel: $('#govDecel'), govDecelo: $('#govDecelo'),
  leadBrake: $('#leadBrake'), leadDecel: $('#leadDecel'), leadDecelo: $('#leadDecelo'),
  leadMode: $('#leadMode'), leadModeNote: $('#leadModeNote'), leadCustom: $('#leadCustom'),
  playBtn: $('#playBtn'),
  resetBtn: $('#resetBtn'),
  view: $('#view'),
  chart: $('#chart'),
  log: $('#log'),
  verdict: $('#verdict'),
  hSpeed: $('#hSpeed'), hTtc: $('#hTtc'), hGap: $('#hGap'),
  hDecel: $('#hDecel'), hBrake: $('#hBrake'), hStop: $('#hStop'),
  hEnergy: $('#hEnergy'), hLoad: $('#hLoad'),
  hState: $('#hState'), hStateCard: $('#hStateCard'), logMeta: $('#logMeta'),
  methodBtn: $('#methodBtn'), methodModal: $('#methodModal'), methodClose: $('#methodClose'),
  dragBar: $('#dragBar')
};

/* ---------- init kendaraan ---------- */
let loadState = 1;
let sim, renderer, running = false, prevStage = null, logCount = 0;

const TIPE_LABEL = {
  DT:  'DT — rigid (fokus sekarang)',
  SDT: 'SDT — single trailer (belum diizinkan)',
  DDT: 'DDT — double trailer (belum diizinkan)'
};
for (const tipe of ['DT', 'SDT', 'DDT']) {
  const list = VEHICLES.filter((v) => v.tipe === tipe);
  if (!list.length) continue;
  const g = document.createElement('optgroup');
  g.label = TIPE_LABEL[tipe] || tipe;
  for (const v of list) {
    const o = document.createElement('option');
    o.value = v.id;
    o.textContent = v.name;
    g.appendChild(o);
  }
  el.vehicle.appendChild(g);
}
el.vehicle.value = 'faw-jh6';

let currentSpec = null;

const SPEC_FIELDS = [
  { k: 'massEmptyT', label: 'Massa kosong', unit: 't', step: 0.1 },
  { k: 'massLoadedT', label: 'Massa + muatan', unit: 't', step: 0.1 },
  { k: 'aCapEmpty', label: 'Rem maks kosong', unit: 'm/s²', step: 0.1 },
  { k: 'aCapLoaded', label: 'Rem maks muat', unit: 'm/s²', step: 0.1 },
  { k: 'brakeBuild', label: 'Bangun tekanan rem', unit: 's', step: 0.05 },
  { k: 'aRetardMax', label: 'Engine brake + retarder', unit: 'm/s²', step: 0.1 },
  { k: 'valveDelay', label: 'Relay + solenoid valve', unit: 's', step: 0.01 },
  { k: 'retardOnKph', label: 'Retarder aktif di atas', unit: 'km/h', step: 1 },
  { k: 'retardFadeKph', label: 'Pita fade retarder', unit: 'km/h', step: 1 },
  { k: 'latency', label: 'Latency sensor+baca', unit: 's', step: 0.01 },
  { k: 'length', label: 'Panjang kendaraan', unit: 'm', step: 0.1 },
  { k: 'hCoG', label: 'Tinggi titik berat', unit: 'm', step: 0.05 },
  { k: 'wheelbase', label: 'Wheelbase efektif', unit: 'm', step: 0.1 }
];

function currentVehicle() { return currentSpec; }

function buildSpecGrid() {
  el.specGrid.innerHTML = '';
  for (const f of SPEC_FIELDS) {
    const label = document.createElement('label');
    label.innerHTML = `${f.label} <small>${f.unit}</small>`;
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = f.step;
    inp.min = 0;
    inp.dataset.key = f.k;
    inp.addEventListener('input', () => {
      const val = parseFloat(inp.value);
      if (!isFinite(val) || val < 0) return;
      if (f.k === 'latency') {
        currentSpec.sensorDelay = val * 0.65;
        currentSpec.processDelay = val * 0.35;
      } else {
        currentSpec[f.k] = val;
      }
      syncLabels();
      hardReset(false);
    });
    label.appendChild(inp);
    el.specGrid.appendChild(label);
  }
}

function refreshCapNote() {
  if (!el.capNote || !currentSpec) return;
  const v = currentSpec;
  const load = loadState;
  const m = v.massEmptyT + (v.massLoadedT - v.massEmptyT) * load;
  let aCap;
  if (el.capFromForce.checked) {
    aCap = (v.aCapEmpty * v.massEmptyT) / Math.max(1, m);
  } else {
    aCap = v.aCapEmpty + (v.aCapLoaded - v.aCapEmpty) * load;
  }
  el.capNote.textContent = `a_cap berlaku: ${aCap.toFixed(2)} m/s² untuk ${m.toFixed(1)} t`
    + (el.capFromForce.checked ? ' (diturunkan dari gaya rem konstan)' : ' (nilai isian)');
}

function fillSpec() {
  for (const inp of el.specGrid.querySelectorAll('input')) {
    const k = inp.dataset.key;
    const val = k === 'latency'
      ? currentSpec.sensorDelay + currentSpec.processDelay
      : currentSpec[k];
    inp.value = Math.round(val * 100) / 100;
  }
}

function loadSpec(id) {
  const v = VEHICLES.find((x) => x.id === id) || VEHICLES[0];
  currentSpec = { ...v };
  if (el.vehNote) el.vehNote.textContent = v.note;
  if (el.specGrid.children.length) fillSpec();
  el.capFromForce.checked = !!currentSpec.aCapFromForce;
  el.capVerified.checked = !!currentSpec.aCapVerified;
  el.verifyChip.hidden = !!currentSpec.aCapVerified;
  refreshCapNote();
}

el.vehicle.addEventListener('change', () => {
  loadSpec(el.vehicle.value);
  hardReset(false);
});

/* ---------- config ---------- */
function readCfg() {
  const veh = currentVehicle();
  return {
    vehicle: veh,
    loaded01: loadState,
    mu: parseFloat(el.surface.value),
    v0: +el.v0.value,
    gap0: +el.gap0.value,
    vLead: +el.vLead.value,
    grade: +el.grade.value,
    aebEnabled: el.aeb.checked,
    warnTTC: +el.warnTTC.value,
    partialTTC: +el.partialTTC.value,
    fullTTC: +el.fullTTC.value,
    filterTau: +el.filterTau.value,
    dynamicTTC: el.dynTTC.checked
    ,
    logic: el.logic.value,
    headway: +el.headway.value,
    govDecel: +el.govDecel.value,
    leadBrake: el.leadBrake.checked,
    leadBrakeAt: 1,
    leadBrakeDecel: +el.leadDecel.value
  };
}

/* ---------- UI sync ---------- */
function syncLabels() {
  el.v0o.textContent = `${el.v0.value} km/h`;
  el.gap0o.textContent = `${el.gap0.value} m`;
  el.vLeado.textContent = `${el.vLead.value} km/h`;
  el.gradeo.textContent = `${el.grade.value} %`;
  el.warnTTCo.textContent = `${(+el.warnTTC.value).toFixed(1)} s`;
  el.partialTTCo.textContent = `${(+el.partialTTC.value).toFixed(1)} s`;
  el.fullTTCo.textContent = `${(+el.fullTTC.value).toFixed(1)} s`;
  el.headwayo.textContent = `${(+el.headway.value).toFixed(1)} s`;
  el.govDecelo.textContent = `${(+el.govDecel.value).toFixed(1)} m/s²`;
  el.leadDecelo.textContent = `${(+el.leadDecel.value).toFixed(1)} m/s²`;
  refreshCapNote();
  el.filterTauo.textContent = `${(+el.filterTau.value).toFixed(2)} s`;

  const v = currentVehicle();
  const m = v.massEmptyT + (v.massLoadedT - v.massEmptyT) * loadState;
  el.massNote.textContent = `Massa efektif: ${m.toFixed(1)} t ` +
    (loadState ? `(kosong ${v.massEmptyT} t + muatan ${(v.massLoadedT - v.massEmptyT).toFixed(1)} t)` : '(kosong)');

  // mana yang membatasi: gesekan (μ·g) atau kapasitas rem
  const mu = parseFloat(el.surface.value);
  const aCap = v.aCapEmpty + (v.aCapLoaded - v.aCapEmpty) * loadState;
  const aMu = mu * 9.81;
  if (el.muNote) el.muNote.textContent = aMu < aCap
    ? `μ·g = ${aMu.toFixed(1)} m/s² → yang membatasi GESEKAN (rem sanggup ${aCap.toFixed(1)})`
    : `μ·g = ${aMu.toFixed(1)} m/s² → yang membatasi REM (${aCap.toFixed(1)} m/s²)`;
}

/* ---------- log ---------- */
function addLog(text, cls = '') {
  const li = document.createElement('li');
  if (cls) li.className = cls;
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = `${sim.t.toFixed(2)}s`;
  li.appendChild(t);
  const d = document.createElement('span');
  d.textContent = text;
  li.appendChild(d);
  el.log.prepend(li);
  while (el.log.children.length > 60) el.log.lastChild.remove();
  logCount++;
}

/* ---------- lifecycle ---------- */
function hardReset(autoplay = false) {
  const cfg = readCfg();
  sim = new Sim(cfg);
  prevStage = null;
  running = autoplay;
  el.playBtn.textContent = running ? '⏸ Jeda' : '▶ Jalankan';
  el.log.innerHTML = '';
  el.verdict.className = 'verdict';
  el.verdict.innerHTML = '';
  syncLabels();
  updateHUD(true);
  if (autoplay) addLog('Simulasi dimulai', '');
}

el.playBtn.addEventListener('click', () => {
  if (sim.done) { hardReset(true); return; }
  running = !running;
  el.playBtn.textContent = running ? '⏸ Jeda' : '▶ Jalankan';
  if (running && sim.t === 0) addLog('Simulasi dimulai', '');
});

el.resetBtn.addEventListener('click', () => hardReset(false));

// slider & select
['v0', 'gap0', 'vLead', 'grade', 'warnTTC', 'partialTTC', 'fullTTC', 'surface', 'headway', 'govDecel', 'filterTau', 'logic'].forEach((k) => {
  el[k].addEventListener('input', () => { syncLabels(); hardReset(false); });
});
el.aeb.addEventListener('change', () => hardReset(false));
el.leadBrake.addEventListener('change', () => { applyLeadMode(); hardReset(false); });
el.leadDecel.addEventListener('input', () => { syncLabels(); hardReset(false); });
el.dynTTC.addEventListener('change', () => hardReset(false));
el.capVerified.addEventListener('change', () => {
  currentSpec.aCapVerified = el.capVerified.checked;
  el.verifyChip.hidden = !!currentSpec.aCapVerified;
  hardReset(false);
});
el.capFromForce.addEventListener('change', () => {
  currentSpec.aCapFromForce = el.capFromForce.checked;
  refreshCapNote();
  hardReset(false);
});

const LEAD_MODES = {
  brake2:  { decel: 2.0,  note: 'Mengerem wajar. Dari 40 km/h berhenti dalam ±5,5 detik / 86 m.' },
  brake4:  { decel: 4.0,  note: 'Mengerem keras. Berhenti dalam ±2,8 detik / 74 m.' },
  brake5:  { decel: 5.0,  note: 'Mengerem darurat. Berhenti dalam ±2,2 detik / 68 m.' },
  coast:   { decel: 0.3,  note: 'Tenaga hilang, truk meluncur lambat. Berhenti butuh ±37 detik / 410 m.' },
  blowout: { decel: 3.0,  note: 'Ban pecah: seretan naik, truk melambat keras dan arahnya tidak stabil.' },
  custom:  { decel: null, note: 'Atur sendiri laju perlambatan truk depan (0,2-6 m/s²).' }
};

// Dropdown hanya memilih JENIS kejadian. Checkbox menentukan apakah kejadian itu
// benar-benar terjadi. Tanpa centang, truk depan terus melaju di kecepatannya.
function applyLeadMode() {
  const key = el.leadMode.value;
  const m = LEAD_MODES[key] || LEAD_MODES.brake4;
  el.leadCustom.hidden = key !== 'custom';
  if (m.decel !== null) el.leadDecel.value = m.decel;
  if (el.leadModeNote) el.leadModeNote.textContent = el.leadBrake.checked
    ? m.note
    : m.note + ' — saat ini NONAKTIF (centang untuk menjalankan).';
}
el.leadMode.addEventListener('change', () => {
  applyLeadMode();
  syncLabels();
  hardReset(false);
});
el.logic.addEventListener('change', () => { syncLabels(); hardReset(false); });

el.loadSeg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  loadState = +b.dataset.load;
  [...el.loadSeg.children].forEach((c) => c.classList.toggle('on', c === b));
  syncLabels();
  hardReset(false);
});

document.querySelectorAll('[data-scenario]').forEach((b) => {
  b.addEventListener('click', () => {
    const s = SCENARIOS[b.dataset.scenario];
    el.v0.value = s.v0;
    el.gap0.value = s.gap0;
    el.vLead.value = s.vLead;
    el.grade.value = s.grade;
    el.surface.value = s.surface;
    el.leadBrake.checked = !!s.leadBrake;
    if (s.leadBrakeDecel) el.leadDecel.value = s.leadBrakeDecel;
    const modeMap = { 2: 'brake2', 3: 'blowout', 4: 'brake4', 5: 'brake5' };
    el.leadMode.value = s.leadBrake
      ? (modeMap[+el.leadDecel.value] || 'custom')
      : el.leadMode.value;
    applyLeadMode();
    syncLabels();
    hardReset(true);
  });
});

el.methodBtn.addEventListener('click', () => { el.methodModal.hidden = false; });
el.methodClose.addEventListener('click', () => { el.methodModal.hidden = true; });
el.methodModal.addEventListener('click', (e) => {
  if (e.target === el.methodModal) el.methodModal.hidden = true;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') el.methodModal.hidden = true;
  if (e.code === 'Space') { e.preventDefault(); el.playBtn.click(); }
  if (e.key === 'r' || e.key === 'R') hardReset(false);
});

/* ---------- HUD ---------- */
let hudAcc = 0;
function updateHUD(force = false) {
  const ttc = sim.ttc();
  el.hSpeed.textContent = `${(sim.vEgo * 3.6).toFixed(1)} km/h`;
  el.hGap.textContent = `${sim.gap().toFixed(1)} m`;
  el.hTtc.textContent = isFinite(ttc) ? `${ttc.toFixed(2)} s` : '∞';
  el.hDecel.textContent = `${sim.decel.toFixed(1)} m/s²`;
  el.hBrake.textContent = `${Math.round(sim.applied * 100)} %`;
  el.hStop.textContent = `${sim.stopDist().toFixed(0)} m`;
  el.hEnergy.textContent = `${(sim.brakeEnergy / 1e6).toFixed(2)} MJ`;
  if (el.dynNote) {
    const a = Math.max(0.3, sim.params.aAvail);
    const tMin = sim.params.latency + sim.vEgo / (2 * a);
    const base = [sim.cfg.warnTTC, sim.cfg.partialTTC, sim.cfg.fullTTC];
    const k = [2.0, 1.5, 1.1];
    const thr = base.map((b, i) => (el.dynTTC.checked ? Math.max(b, k[i] * tMin) : b));
    el.dynNote.textContent = el.dynTTC.checked
      ? `Berlaku: peringatan ${thr[0].toFixed(1)} s · sebagian ${thr[1].toFixed(1)} s · penuh ${thr[2].toFixed(1)} s (TTC min ${tMin.toFixed(2)} s)`
      : `Ambang tetap: ${base[0]} / ${base[1]} / ${base[2]} s`;
  }
  if (el.logMeta) {
    el.logMeta.textContent = `${sim.steps.toLocaleString('id-ID')} siklus · ${logCount} perubahan`;
  }
  el.hLoad.textContent = `+${sim.loadTransferT().toFixed(1)} t`;

  let stage = sim.stage;
  if (sim.done) stage = sim.outcome;
  const map = {
    cruise: ['Jalan normal', 's-cruise'],
    off: ['AEB nonaktif', 's-cruise'],
    warn: ['PERINGATAN', 's-warn'],
    partial: ['Rem sebagian', 's-partial'],
    full: ['REM PENUH', 's-full'],
    stopped: ['Berhenti aman', 's-stopped'],
    settled: ['Selesai', 's-stopped'],
    timeout: ['Selesai', 's-stopped'],
    collision: ['TABRAKAN', 's-collision']
  };
  const [label, cls] = map[stage] || ['—', 's-cruise'];
  el.hState.textContent = label;
  el.hStateCard.className = `card state ${cls}`;

  // event log saat perubahan status
  const key = sim.done ? sim.outcome : sim.stage;
  if (key !== prevStage) {
    if (key === 'warn') addLog('AEB: peringatan — pengemudi harus bereaksi', 'warn');
    else if (key === 'partial') addLog('AEB: rem sebagian aktif', 'partial');
    else if (key === 'full') addLog('AEB: REM PENUH', 'full');
    else if (key === 'collision') addLog(`TABRAKAN pada ${(sim.impactV * 3.6).toFixed(1)} km/h`, 'bad');
    else if (key === 'stopped') addLog(`Berhenti, sisa ${sim.gap().toFixed(1)} m`, 'ok');
    else if (key === 'settled') addLog(`Kecepatan stabil ${(sim.vEgo * 3.6).toFixed(1)} km/h, gap ${sim.gap().toFixed(1)} m`, 'ok');
    else if (key === 'timeout') addLog('Simulasi berakhir tanpa tabrakan', 'ok');
    prevStage = key;
  }

  if (sim.done) {
    running = false;
    el.playBtn.textContent = '▶ Ulangi';
    const v = sim.verdict();
    if (v && !el.verdict.classList.contains('show')) {
      el.verdict.className = `verdict show ${v.ok ? 'ok' : 'bad'}`;
      el.verdict.innerHTML = `${v.title}<small>${v.sub}</small>`;
    }
  }
}

/* ---------- loop ---------- */
function boot() {
  renderer = new Renderer(el.view);
  renderer.resize();
  buildSpecGrid();
  loadSpec('faw-jh6');
  hardReset(false);

  const FIXED = 1 / 200;
  let acc = 0, last = performance.now();

  function frame(now) {
    const dtReal = Math.min(0.08, (now - last) / 1000);
    last = now;

    if (running && !sim.done) {
      acc += dtReal;
      let n = 0;
      while (acc >= FIXED && n < 500) { sim.step(FIXED); acc -= FIXED; n++; }
    } else {
      acc = 0;
    }

    renderer.draw(sim, dtReal);
    drawChart(el.chart, sim);

    hudAcc += dtReal;
    if (hudAcc > 0.05 || !running) { hudAcc = 0; updateHUD(); }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize', () => {
    renderer.resize();
    renderer._init = false;
  });

  // ---- panel bawah bisa ditarik ----
  let dragging = false;
  const startDrag = (e) => {
    dragging = true;
    el.dragBar.classList.add('dragging');
    document.body.classList.add('resizing');
    e.preventDefault();
  };
  const moveDrag = (e) => {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const h = Math.round(window.innerHeight - y);
    const clamped = Math.max(110, Math.min(Math.round(window.innerHeight * 0.62), h));
    document.documentElement.style.setProperty('--bottom-h', clamped + 'px');
  };
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    el.dragBar.classList.remove('dragging');
    document.body.classList.remove('resizing');
    renderer.resize();
    renderer._init = false;
  };
  el.dragBar.addEventListener('mousedown', startDrag);
  el.dragBar.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
}

boot();
