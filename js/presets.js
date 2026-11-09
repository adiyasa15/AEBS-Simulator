// Spek kendaraan.
// aCapEmpty / aCapLoaded = deselerasi maksimum yang bisa dihasilkan sistem rem
// (m/s²) saat kosong / bermuatan penuh. Batas akhir tetap min(μ·g, aCap).
// sensorDelay + processDelay dalam detik; brakeBuild = waktu bangun tekanan rem (detik).
//
// CATATAN: FAW JH6 mengikuti data Wahyu (26 t kosong, 40.5 t dgn muatan batubara).
// Entri Scania & EV masih ASUMSI awal — tinggal dikoreksi dari spek asli.

export const VEHICLES = [
  {
    id: 'faw-jh6',
    tipe: 'DT',
    name: 'FAW JH6 DT (rigid, diesel)',
    fuel: 'diesel',
    layout: 'rigid',
    massEmptyT: 26,
    massLoadedT: 66.5,
    length: 10.4,
    width: 2.55,
    hCoG: 1.9,
    wheelbase: 4.2,
    aCapEmpty: 4.6,
    aCapLoaded: 3.0,
    brakeBuild: 0.85,
    sensorDelay: 0.12,
    processDelay: 0.06,
    valveDelay: 0.05,
    aRetardMax: 1.0,
    retardOnKph: 15,
    retardFadeKph: 10,
    regen: 0,
    note: 'Kosong 26 t; vessel berisi 40,5 t batubara -> total 66,5 t. aCap & latency masih asumsi, harus dari brake test.'
  },
  {
    id: 'scania-single',
    tipe: 'SDT',
    name: 'Scania + single trailer (belum diizinkan)',
    fuel: 'diesel',
    layout: 'single',
    massEmptyT: 22,
    massLoadedT: 56,
    length: 18.5,
    width: 2.55,
    aCapEmpty: 4.4,
    aCapLoaded: 2.8,
    brakeBuild: 0.95,
    sensorDelay: 0.12,
    processDelay: 0.06,
    regen: 0,
    note: 'BELUM DIIZINKAN: pemasangan pada unit Scania berisiko membatalkan garansi. Preset ini hanya untuk pengujian, bukan unit terpasang.'
  },
  {
    id: 'scania-double',
    tipe: 'DDT',
    name: 'Scania + double trailer (belum diizinkan)',
    fuel: 'diesel',
    layout: 'double',
    massEmptyT: 28,
    massLoadedT: 78,
    length: 27.0,
    width: 2.55,
    aCapEmpty: 4.2,
    aCapLoaded: 2.6,
    brakeBuild: 1.05,
    sensorDelay: 0.12,
    processDelay: 0.06,
    regen: 0,
    note: 'BELUM DIIZINKAN: pemasangan pada unit Scania berisiko membatalkan garansi. Preset ini hanya untuk pengujian.'
  },
  {
    id: 'ev-rigid',
    tipe: 'DT',
    name: 'EV DT (rigid, listrik)',
    fuel: 'ev',
    layout: 'rigid',
    massEmptyT: 30,
    massLoadedT: 44.5,
    length: 10.4,
    width: 2.55,
    aCapEmpty: 5.2,
    aCapLoaded: 3.8,
    brakeBuild: 0.35,
    sensorDelay: 0.08,
    processDelay: 0.04,
    aRetardMax: 1.4,
    retardOnKph: 5,
    retardFadeKph: 5,
    regen: 1.4,
    note: 'ASUMSI: baterai bikin tare lebih berat; regen 1.4 m/s² + respons rem lebih cepat.'
  },
  {
    id: 'ev-double',
    tipe: 'DDT',
    name: 'EV + double trailer (belum diizinkan)',
    fuel: 'ev',
    layout: 'double',
    massEmptyT: 34,
    massLoadedT: 82,
    length: 27.0,
    width: 2.55,
    aCapEmpty: 5.0,
    aCapLoaded: 3.3,
    brakeBuild: 0.45,
    sensorDelay: 0.08,
    processDelay: 0.04,
    regen: 1.2,
    note: 'BELUM DIIZINKAN: preset untuk pengujian konfigurasi trailer; belum ada unit terpasang.'
  }
];

export const SCENARIOS = {
  stopped:  { v0: 45, gap0: 60, vLead: 0,  grade: 0,  surface: '0.6' },
  slow:     { v0: 40, gap0: 70, vLead: 20, grade: 0,  surface: '0.6' },
  sudden:   { v0: 55, gap0: 45, vLead: 0,  grade: 2,  surface: '0.6' },
  lowmu:    { v0: 35, gap0: 50, vLead: 0,  grade: 0,  surface: '0.32' },
  // konvoi haul road: kecepatan hampir sama, jarak rapat
  convoy:   { v0: 40, gap0: 15, vLead: 38, grade: 0,  surface: '0.6', leadBrake: true, leadBrakeDecel: 4 },
  headway4: { v0: 40, gap0: 44, vLead: 38, grade: 0,  surface: '0.6', leadBrake: true, leadBrakeDecel: 4 },
  // truk depan sekecepatan kita lalu mengerem habis sampai berhenti
  suddenStop: { v0: 40, gap0: 44, vLead: 40, grade: 0, surface: '0.6', leadBrake: true, leadBrakeDecel: 5 }
};
