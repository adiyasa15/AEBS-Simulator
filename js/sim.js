export const G = 9.81;

/**
 * Jarak berhenti dengan rantai nyata: latency (v konstan) -> ramp linear 0..a selama T
 * -> perlambatan penuh. Bentuk tertutup.
 */
export function stopDistance(v, a, latency, T) {
  if (v <= 0.01) return 0;
  const vAfter = Math.max(0, v - a * T / 2);
  const dRamp = Math.max(0, v * T - a * T * T / 6);
  return dRamp + (vAfter * vAfter) / (2 * Math.max(0.05, a)) + v * latency;
}

/**
 * Perlambatan minimum yang harus dipasang SEKARANG agar berhenti dalam jarak `dist`,
 * dengan memperhitungkan latency + build-up. Bisection, ~20 iterasi.
 */
export function requiredDecel(v, dist, latency, T) {
  if (v <= 0.01) return 0;
  if (dist <= 0.05) return Infinity;
  const hi0 = 12;
  if (stopDistance(v, hi0, latency, T) > dist) return Infinity;  // tidak mungkin
  let lo = 0.02, hi = hi0;
  if (stopDistance(v, lo, latency, T) <= dist) return lo;
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2;
    if (stopDistance(v, mid, latency, T) > dist) lo = mid; else hi = mid;
  }
  return hi;
}

/**
 * Model fisika + controller AEB, 1D memanjang.
 *
 * Konvensi: sEgo = posisi bemper depan ego (m), sLead = posisi buritan objek.
 * gap = sLead - sEgo. closing = vEgo - vLead.
 *
 * Rantai deselerasi:
 *   a_tersedia = min(μ·g, aCap(massa))        -> batas gesek vs kapasitas rem
 *   perintah AEB -> latency sensor+komputasi -> rem bangun (build-up) -> a_aktual
 */
export class Sim {
  constructor(cfg) {
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    const c = this.cfg;
    this.t = 0;
    this.vEgo = c.v0 / 3.6;
    this.sEgo = 0;
    this.sLead = Math.max(2, c.gap0);
    this.vLead = c.vLead / 3.6;

    this.queue = [];          // [{t, level}] perintah yang belum sampai aktuator
    this.cmdLevel = 0;
    this.applied = 0;         // 0..1 level rem yang benar-benar bekerja
    this.lastDesired = 0;

    this.done = false;
    this.outcome = null;      // 'stopped' | 'collision'
    this.impactV = 0;
    this.aebEvents = 0;
    this.settledT = 0;
    this.leadBrakeApplied = false;
    this.aLeadEst = 0;        // estimasi perlambatan truk depan (di radar: turunan range-rate)
    this.brakeEnergy = 0;     // Joule — energi yang dibuang lewat rem servis
    this.peakDecel = 0;       // m/s²
    this.stage = c.aebEnabled ? 'cruise' : 'off';
    this.decel = 0;
    this.aReq = 0;

    this.samples = [];
    this._acc = 0;

    this.params = this.computeParams();
    this.pushSample();
  }

  computeParams() {
    const v = this.cfg.vehicle;
    const c = this.cfg;
    const massT = v.massEmptyT + (v.massLoadedT - v.massEmptyT) * c.loaded01;
    const aCap = v.aCapEmpty + (v.aCapLoaded - v.aCapEmpty) * c.loaded01;
    const aAvail = Math.min(c.mu * G, aCap);
    return {
      massT,
      aCap,
      aAvail,
      // rantai retrofit: radar -> mikroprosesor -> relay -> solenoid valve -> pneumatik
      latency: v.sensorDelay + v.processDelay + (v.valveDelay ?? 0),
      build: v.brakeBuild,
      regen: v.regen || 0,
      length: v.length,
      width: v.width,
      layout: v.layout
    };
  }

  gap() { return Math.max(0, this.sLead - this.sEgo); }

  /**
   * Estimasi beban pindah ke axle depan saat mengerem: ΔW = m·a·h / L
   * Hasil dalam ton (gaya). Indikator saja — tidak mempengaruhi dinamika model.
   */
  loadTransferT() {
    const v = this.cfg.vehicle;
    const h = v.hCoG ?? 1.9;
    const L = v.wheelbase ?? 4.2;
    const a = this.decel;
    return (this.params.massT * a / 9.81) * (h / L);
  }
  closing() { return this.vEgo - this.vLead; }
  ttc() {
    const cl = this.closing();
    return cl > 0.05 ? this.gap() / cl : Infinity;
  }
  /**
   * Jarak berhenti kalau rem penuh dipasang sekarang.
   * Integrasi bentuk tertutup untuk: latency (v konstan) -> ramp linear 0..a selama build
   * -> perlambatan penuh sampai berhenti.
   *   d = v·T − a·T²/6 + (v − a·T/2)²/(2a) + v·latency
   */
  stopDist() {
    const p = this.params;
    return stopDistance(this.vEgo, Math.max(0.3, p.aAvail), p.latency, Math.max(0, p.build));
  }

  step(dt) {
    if (this.done || dt <= 0) return;
    const c = this.cfg;
    const p = this.params;

    // ---- dinamika truk depan: bisa mengerem mendadak ----
    const vLeadPrev = this.vLead;
    if (c.leadBrake && this.t >= (c.leadBrakeAt ?? 1)) {
      // truk depan ada di tanjakan/turunan yang sama: gravitasi berlaku untuk keduanya
      const netLead = Math.max(0, (c.leadBrakeDecel || 3) - G * (c.grade / 100));
      this.vLead = Math.max(0, this.vLead - netLead * dt);
      this.leadBrakeApplied = true;
    }
    // filter orde-1 ~0.15 s, meniru derivatif range-rate radar
    const aLeadRaw = dt > 0 ? (vLeadPrev - this.vLead) / dt : 0;
    this.aLeadEst += (aLeadRaw - this.aLeadEst) * Math.min(1, dt / 0.15);

    const gap = this.gap();
    const cl = this.closing();
    const ttc = this.ttc();
    this.aReq = cl > 0.05 ? (cl * cl) / (2 * Math.max(gap, 0.05)) : 0;

    // ---- keputusan AEB ----
    let desired = 0;
    let stage = 'cruise';

    if (c.aebEnabled) {
      if (ttc <= c.fullTTC || (cl > 0.05 && this.aReq >= p.aAvail * 0.9)) {
        desired = 1; stage = 'full';
      } else if (ttc <= c.partialTTC || (cl > 0.05 && this.aReq >= p.aAvail * 0.5)) {
        desired = 0.55; stage = 'partial';
      } else if (ttc <= c.warnTTC) {
        stage = 'warn';
      }

      // ---- pemicu prediktif: feed-forward perlambatan truk depan ----
      // Butuh a_ego sedemikian rupa sehingga jarak berhenti ego <= gap + jarak berhenti truk depan.
      if (c.logic === 'predictive') {
        const aL = Math.max(0, this.aLeadEst);
        // sisa jarak truk depan: kalau sudah berhenti = 0 (bukan tak terhingga),
        // kalau masih melaju tanpa mengerem = tak terhingga
        let leadDist;
        if (this.vLead < 0.3) leadDist = 0;
        else if (aL > 0.1) leadDist = (this.vLead * this.vLead) / (2 * aL);
        else leadDist = Infinity;
        // budget = jarak yang tersedia murni. Latency (sensor+mikroprosesor+valve)
        // dan build-up pneumatik masuk lewat requiredDecel().
        const budget = gap + leadDist - (c.aebMargin ?? 3);
        const aFf = isFinite(budget)
          ? requiredDecel(this.vEgo, budget, p.latency, Math.max(0, p.build))
          : 0;
        // aFf = kebutuhan perlambatan yang sudah memperhitungkan rem truk depan.
        // Ambangnya tetap bertingkat ala AEB, tapi dasarnya prediksi, bukan TTC saat ini.
        if (aFf >= p.aAvail * 0.55) { desired = 1; stage = 'full'; }
        else if (aFf >= p.aAvail * 0.25 && desired < 0.55) { desired = 0.55; stage = 'partial'; }
      }

      // jaring pengaman: sudah mepet, apa pun ambangnya
      if (gap < 4 && cl > 0.05) { desired = 1; stage = 'full'; }

      // ---- governor jarak aman (headway / THW) ----
      // TTC-relatif buta saat kecepatan hampir sama: itu justru kondisi normal di haul road.
      // Governor menahan kecepatan supaya THW tidak turun di bawah ambang.
      if (c.logic === 'headway' && c.headway > 0) {
        const vSafe = gap / c.headway;            // batas atas kecepatan utk menjaga THW
        if (this.vEgo > vSafe + 0.15) {
          const need = (this.vEgo - vSafe) / 2.0; // konvergen ~2 detik, tidak menghentak
          // governor hanya boleh melambat halus; rem keras tetap domain AEB
          const lvl = Math.min(1, Math.max(0, need / p.aAvail), (c.govDecel || 1.2) / p.aAvail);
          if (lvl > desired) {
            desired = lvl;
            stage = 'partial';
          }
        }
      }

      if (desired > 0 && this.lastDesired === 0) this.aebEvents++;
    } else {
      stage = 'off';
    }

    // hanya kirim perintah baru kalau perubahannya berarti (kontrol kontinu tiap 5 ms
    // akan membanjiri antrean aktuator)
    if (Math.abs(desired - this.lastDesired) > 0.08) {
      this.queue.push({ t: this.t + p.latency, level: desired });
      if (this.queue.length > 40) this.queue.shift();
      this.lastDesired = desired;
    }
    while (this.queue.length && this.queue[0].t <= this.t) {
      this.cmdLevel = this.queue.shift().level;
    }

    // ---- aktuator: build-up tekanan rem ----
    const rate = 1 / Math.max(0.06, p.build);
    if (this.applied < this.cmdLevel) {
      this.applied = Math.min(this.cmdLevel, this.applied + rate * dt);
    } else {
      this.applied = Math.max(this.cmdLevel, this.applied - rate * 2 * dt);
    }

    // ---- pengemudi: jaga kecepatan target selama AEB tidak mengintervensi ----
    let aThrottle = 0;
    let aRetard = 0;
    if (this.applied < 0.02) {
      // setelah AEB menyelamatkan sekali, pengemudi tidak lagi mengejar kecepatan awal
      let target = this.aebEvents > 0 ? Math.min(c.v0, c.vLead) / 3.6 : c.v0 / 3.6;
      if (c.logic === 'headway' && c.headway > 0) {
        target = Math.min(target, this.gap() / c.headway);
      }
      const dv = target - this.vEgo;
      if (dv > 0.03) aThrottle = Math.min(0.8, dv * 0.6);
      // engine brake + retarder: menahan laju di turunan, BUKAN rem darurat.
      // Retarder hidrolik/elektrik butuh putaran minimum -> di bawah ambang tidak ada efek.
      else if (dv < -0.05) {
        const vKph = this.vEgo * 3.6;
        const rOn = c.vehicle.retardOnKph ?? 15;
        const rFade = Math.max(1, c.vehicle.retardFadeKph ?? 10);
        const avail = Math.max(0, Math.min(1, (vKph - rOn) / rFade));
        aRetard = Math.min((c.vehicle.aRetardMax ?? 1.0) * avail, -dv * 0.6);
      }
    }

    // ---- gaya ----
    const aFric = this.applied * p.aAvail;
    const aRegen = p.regen * Math.min(1, this.applied * 2.2);
    const gradeA = G * (c.grade / 100);           // turunan positif = menambah laju
    const resist = 0.045 + 0.00016 * this.vEgo * this.vEgo;
    const aNet = aFric + aRegen + resist + aRetard - gradeA - aThrottle;
    this.decel = aFric + aRegen;

    // energi rem servis: E = ∫ (m · a_fric) · v dt
    this.brakeEnergy += p.massT * 1000 * aFric * this.vEgo * dt;
    if (aFric > this.peakDecel) this.peakDecel = aFric;

    const vOld = this.vEgo;
    this.vEgo = Math.max(0, vOld - aNet * dt);
    this.sEgo += ((vOld + this.vEgo) / 2) * dt;
    this.sLead += this.vLead * dt;
    this.t += dt;

    this.stage = stage;

    // ---- hasil ----
    if (this.gap() <= 0.02) {
      this.gapNow = 0;
      this.done = true;
      this.outcome = 'collision';
      this.impactV = Math.max(0, this.closing());
      return;
    }
    if (this.vEgo <= 0.02 && this.t > 0.25) {
      this.vEgo = 0;
      this.done = true;
      this.outcome = 'stopped';
    }
    // kondisi sudah aman & stabil (tidak lagi mendekat) -> selesai
    if (!this.done && this.applied < 0.02 && this.closing() <= 0.3 && this.t > 2) {
      this.settledT += dt;
      if (this.settledT > 2.5) {
        this.done = true;
        this.outcome = 'settled';
      }
    } else {
      this.settledT = 0;
    }
    if (this.t > 90) {
      this.done = true;
      this.outcome = 'timeout';
    }

    // ---- telemetri ----
    this._acc += dt;
    if (this._acc >= 0.05) { this._acc = 0; this.pushSample(); }
  }

  pushSample() {
    this.samples.push({
      t: this.t,
      v: this.vEgo * 3.6,
      brake: this.applied,
      gap: this.gap(),
      ttc: this.ttc(),
      decel: this.decel
    });
    if (this.samples.length > 900) this.samples.shift();
  }

  verdict() {
    if (!this.done) return null;
    const p = this.params;
    if (this.outcome === 'timeout') {
      return {
        ok: true,
        title: 'Simulasi berakhir — tidak ada tabrakan',
        sub: `90 s berjalan. AEB sudah mengintervensi ${this.aebEvents} kali; bukan ACC, jadi pengemudi mengejar lagi setelah rem lepas.`
      };
    }
    if (this.outcome === 'settled') {
      return {
        ok: true,
        title: this.aebEvents
          ? `Aman — kecepatan turun, sisa gap ${this.gap().toFixed(1)} m`
          : `Jalan aman — tidak ada penutupan jarak`,
        sub: `Kecepatan akhir ${(this.vEgo * 3.6).toFixed(1)} km/h · objek ${(this.vLead * 3.6).toFixed(1)} km/h · AEB intervensi ${this.aebEvents}×.`
      };
    }
    if (this.outcome === 'collision') {
      return {
        ok: false,
        title: `TABRAKAN — impact ${(this.impactV * 3.6).toFixed(1)} km/h`,
        sub: `Kendaraan ${p.massT.toFixed(1)} t, kecepatan awal ${this.cfg.v0} km/h, gap awal ${this.cfg.gap0} m.`
      };
    }
    return {
      ok: true,
      title: `BERHENTI aman — sisa jarak ${this.gap().toFixed(1)} m`,
      sub: `Deselerasi maks ${(this.decel).toFixed(1)} m/s² · waktu ${this.t.toFixed(2)} s · massa ${p.massT.toFixed(1)} t.`
    };
  }
}
