const ROAD_HALF = 9;       // setengah lebar haul road (m)
const DETECT_RANGE = 120;  // jangkauan sensor (m)

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.scale = 5;
    this.ready = false;
    this.flash = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.cv.getBoundingClientRect();
    this.W = Math.max(320, r.width);
    this.H = Math.max(240, r.height);
    this.cv.width = Math.round(this.W * dpr);
    this.cv.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ready = true;
  }

  draw(sim, dt) {
    if (!this.ready) this.resize();
    const { ctx, W, H } = this;

    // ---- kamera ----
    const spanTarget = Math.max(sim.gap() * 1.3 + sim.params.length + 22, 45);
    const scaleTarget = Math.max(0.85, Math.min(16, (W * 0.86) / spanTarget));
    const camTarget = sim.sEgo - (W * 0.42) / scaleTarget;
    if (!this._init) {
      this.scale = scaleTarget; this.camX = camTarget; this._init = true;
    } else {
      const k = 1 - Math.pow(0.001, dt);          // smoothing ~60fps-independent
      this.scale += (scaleTarget - this.scale) * k;
      this.camX += (camTarget - this.camX) * k;
    }

    const scale = this.scale, camX = this.camX;
    const cy = H * 0.5;
    const sx = (x) => (x - camX) * scale;
    const sy = (y) => cy - y * scale;

    // ---- latar ----
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c1219');
    g.addColorStop(0.5, '#0f1720');
    g.addColorStop(1, '#0a1016');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // ---- bahu / tanah ----
    ctx.fillStyle = '#141d26';
    ctx.fillRect(0, sy(ROAD_HALF + 6), W, (ROAD_HALF * 2 + 12) * scale);
    ctx.fillStyle = '#1a242f';
    ctx.fillRect(0, sy(ROAD_HALF + 2.2), W, (ROAD_HALF * 2 + 4.4) * scale);

    // ---- permukaan jalan ----
    const road = ctx.createLinearGradient(0, sy(ROAD_HALF), 0, sy(-ROAD_HALF));
    road.addColorStop(0, '#26313d');
    road.addColorStop(0.5, '#2c3845');
    road.addColorStop(1, '#26313d');
    ctx.fillStyle = road;
    ctx.fillRect(0, sy(ROAD_HALF), W, ROAD_HALF * 2 * scale);

    // tepi jalan
    ctx.strokeStyle = 'rgba(245,158,11,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sy(ROAD_HALF)); ctx.lineTo(W, sy(ROAD_HALF));
    ctx.moveTo(0, sy(-ROAD_HALF)); ctx.lineTo(W, sy(-ROAD_HALF));
    ctx.stroke();

    // garis tengah putus-putus (geser sesuai dunia)
    ctx.strokeStyle = 'rgba(160,180,200,.20)';
    ctx.lineWidth = 2;
    const dash = 4, gap = 6;
    const startX = Math.floor(camX / (dash + gap)) * (dash + gap);
    for (let x = startX; x < camX + W / scale + dash + gap; x += dash + gap) {
      ctx.beginPath();
      ctx.moveTo(sx(x), sy(0));
      ctx.lineTo(sx(x + dash), sy(0));
      ctx.stroke();
    }

    // patok tepi tiap 25 m
    const postStep = scale > 4 ? 10 : 25;
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    const firstPost = Math.floor(camX / postStep) * postStep;
    for (let x = firstPost; x < camX + W / scale; x += postStep) {
      const px = sx(x);
      ctx.fillRect(px - 1, sy(ROAD_HALF + 2.1), 2, 5);
      ctx.fillRect(px - 1, sy(-ROAD_HALF - 2.1) - 5, 2, 5);
    }

    // ---- kerucut sensor ----
    const rangeX = Math.min(sim.sEgo + DETECT_RANGE, sim.sLead + 4);
    const front = sx(sim.sEgo);
    const back = sx(rangeX);
    if (back > front) {
      ctx.beginPath();
      ctx.moveTo(front, sy(1.1));
      ctx.lineTo(back, sy(5.5));
      ctx.lineTo(back, sy(-5.5));
      ctx.lineTo(front, sy(-1.1));
      ctx.closePath();
      ctx.fillStyle = sim.cfg.aebEnabled ? 'rgba(59,130,246,.07)' : 'rgba(120,120,120,.05)';
      ctx.fill();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = sim.cfg.aebEnabled ? 'rgba(59,130,246,.28)' : 'rgba(120,120,120,.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- prediksi titik henti ----
    const sd = sim.stopDist();
    const stopPx = sx(sim.sEgo + sd);
    if (sim.vEgo > 0.3 && sd < 400 && stopPx < W - 12) {
      const px = stopPx;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(239,68,68,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, sy(ROAD_HALF));
      ctx.lineTo(px, sy(-ROAD_HALF));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(239,68,68,.85)';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('titik henti', px, sy(ROAD_HALF) - 7);
    }

    // ---- objek di depan ----
    if (sim.sLead - camX < W / scale + 30 && sim.sLead > camX - 30) {
      this.drawObstacle(ctx, sx, sy, scale, sim);
    }

    // ---- ego ----
    this.drawEgo(ctx, sx, sy, scale, sim);

    // ---- anotasi gap ----
    this.drawGap(ctx, sx, sy, scale, sim, cy);

    // ---- kecepatan: garis angin ----
    if (sim.vEgo > 2) {
      ctx.strokeStyle = `rgba(150,200,255,${Math.min(0.25, sim.vEgo / 90)})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const yy = sy(ROAD_HALF - 1 - i * 2.3);
        const x0 = ((i * 173 + sim.sEgo * 40) % (W + 200)) - 100;
        ctx.beginPath();
        ctx.moveTo(x0, yy);
        ctx.lineTo(x0 + 26 + sim.vEgo * 1.6, yy);
        ctx.stroke();
      }
    }

    // ---- flash tabrakan ----
    if (sim.outcome === 'collision') {
      this.flash = Math.min(1, this.flash + dt * 3);
      ctx.fillStyle = `rgba(239,68,68,${0.12 * this.flash})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      this.flash = 0;
    }
  }

  drawEgo(ctx, sx, sy, scale, sim) {
    const len = sim.params.length;
    const w = sim.params.width;
    const layout = sim.params.layout;
    const x0 = sim.sEgo;
    const braking = sim.applied > 0.05;

    const segs = [];
    // ujung depan = 0, makin ke belakang makin negatif
    segs.push({ a: -2.8, b: 0, kind: 'cab' });
    if (layout === 'rigid') {
      segs.push({ a: -len, b: -2.8, kind: 'body' });
    } else {
      segs.push({ a: -6.9, b: -2.8, kind: 'chassis' });
      if (layout === 'single') {
        segs.push({ a: -len, b: -8.4, kind: 'trailer' });
      } else {
        segs.push({ a: -16.6, b: -8.4, kind: 'trailer' });
        segs.push({ a: -len, b: -18.2, kind: 'trailer' });
      }
    }

    for (const s of segs) {
      const X = sx(x0 + s.a);
      const Wd = (s.b - s.a) * scale;
      const Y = sy(w / 2);
      const Ht = w * scale;

      const grd = ctx.createLinearGradient(X, Y, X, Y + Ht);
      if (s.kind === 'cab') {
        grd.addColorStop(0, '#2f6fd0'); grd.addColorStop(0.5, '#1e4fa3'); grd.addColorStop(1, '#163a7a');
      } else if (s.kind === 'trailer') {
        grd.addColorStop(0, '#2b3d52'); grd.addColorStop(0.5, '#22303f'); grd.addColorStop(1, '#1a2632');
      } else {
        grd.addColorStop(0, '#35608f'); grd.addColorStop(0.5, '#25476b'); grd.addColorStop(1, '#1a3348');
      }
      ctx.fillStyle = grd;
      rr(ctx, X, Y, Wd, Ht, Math.min(4, Wd * 0.2));
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,170,230,.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // roda
      ctx.fillStyle = '#0a0f14';
      const wheelW = Math.max(2, 0.55 * scale);
      const wheelH = Math.max(2, 0.32 * scale);
      const nAxle = s.kind === 'cab' ? 1 : s.kind === 'trailer' ? 3 : 2;
      for (let i = 0; i < nAxle; i++) {
        const cx = X + Wd * ((i + 0.5) / nAxle);
        ctx.fillRect(cx - wheelW / 2, Y - wheelH * 0.55, wheelW, wheelH);
        ctx.fillRect(cx - wheelW / 2, Y + Ht - wheelH * 0.45, wheelW, wheelH);
      }
    }

    // lampu rem di buritan
    const rear = sx(x0 - len);
    if (braking) {
      ctx.shadowColor = 'rgba(239,68,68,.9)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ff4d4d';
      const hh = Math.max(3, 0.35 * scale);
      ctx.fillRect(rear - 1, sy(w / 2) + 2, 3, hh);
      ctx.fillRect(rear - 1, sy(-w / 2) - hh - 2, 3, hh);
      ctx.shadowBlur = 0;
    }

    // label
    ctx.fillStyle = 'rgba(196,224,255,.95)';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    const lx = Math.max(sx(x0 - len), 4);
    ctx.fillText(`${sim.params.massT.toFixed(1)} t`, lx + 4, sy(w / 2) - 6);
  }

  drawObstacle(ctx, sx, sy, scale, sim) {
    const xRear = sim.sLead;
    const len = 10;
    const w = 2.6;
    const move = sim.vLead > 0.1;

    const X = sx(xRear);
    const Wd = len * scale;
    const Y = sy(w / 2);
    const Ht = w * scale;

    const grd = ctx.createLinearGradient(X, Y, X, Y + Ht);
    grd.addColorStop(0, '#5b6572'); grd.addColorStop(0.5, '#454f5b'); grd.addColorStop(1, '#333b45');
    ctx.fillStyle = grd;
    rr(ctx, X, Y, Wd, Ht, 4);
    ctx.fill();
    ctx.strokeStyle = move ? 'rgba(148,163,184,.5)' : 'rgba(239,68,68,.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // chevron bahaya di buritan
    ctx.save();
    ctx.beginPath();
    rr(ctx, X, Y, Math.min(Wd, 26), Ht, 3);
    ctx.clip();
    ctx.fillStyle = 'rgba(239,68,68,.55)';
    for (let i = -1; i < 8; i++) {
      ctx.beginPath();
      const bx = X - 10 + i * 9;
      ctx.moveTo(bx, Y + Ht);
      ctx.lineTo(bx + 9, Y);
      ctx.lineTo(bx + 14, Y);
      ctx.lineTo(bx + 5, Y + Ht);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // lampu rem truk depan
    if (sim.leadBrakeApplied) {
      ctx.shadowColor = 'rgba(255,60,60,.9)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ff3b3b';
      const hh = Math.max(3, 0.35 * scale);
      ctx.fillRect(X - 1, Y + 2, 3, hh);
      ctx.fillRect(X - 1, Y + Ht - hh - 2, 3, hh);
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#0a0f14';
    const wheelW = Math.max(2, 0.5 * scale);
    const wheelH = Math.max(2, 0.3 * scale);
    for (let i = 0; i < 3; i++) {
      const cx = X + Wd * ((i + 0.5) / 3);
      ctx.fillRect(cx - wheelW / 2, Y - wheelH * 0.55, wheelW, wheelH);
      ctx.fillRect(cx - wheelW / 2, Y + Ht - wheelH * 0.45, wheelW, wheelH);
    }
  }

  drawGap(ctx, sx, sy, scale, sim, cy) {
    const gap = sim.gap();
    const x1 = sx(sim.sEgo);
    const x2 = sx(sim.sLead);
    if (x2 <= x1) return;
    const y = sy(-ROAD_HALF + 3.5);

    ctx.strokeStyle = 'rgba(226,232,240,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.stroke();

    // panah dua arah
    ctx.beginPath();
    ctx.moveTo(x1, y); ctx.lineTo(x1 + 6, y - 4); ctx.lineTo(x1 + 6, y + 4); ctx.closePath();
    ctx.moveTo(x2, y); ctx.lineTo(x2 - 6, y - 4); ctx.lineTo(x2 - 6, y + 4); ctx.closePath();
    ctx.fillStyle = 'rgba(226,232,240,.55)';
    ctx.fill();

    // label
    const mid = (x1 + x2) / 2;
    const txt = `${gap.toFixed(1)} m`;
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(13,20,28,.85)';
    rr(ctx, mid - tw / 2 - 6, y - 20, tw + 12, 16, 5);
    ctx.fill();
    ctx.fillStyle = gap < 10 ? '#fca5a5' : '#cbd5e1';
    ctx.fillText(txt, mid, y - 8);
  }
}

/* ---------------- grafik telemetri ---------------- */
export function drawChart(canvas, sim) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const W = Math.max(200, r.width), H = Math.max(60, r.height);
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const s = sim.samples;
  if (s.length < 2) {
    ctx.fillStyle = 'rgba(127,148,170,.45)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tekan ▶ Jalankan untuk mulai merekam telemetri', W / 2, H / 2);
    return;
  }

  const win = 12; // detik
  const tEnd = s[s.length - 1].t;
  const tStart = Math.max(0, tEnd - win);
  const span = Math.max(0.6, tEnd - tStart);
  const vMax = Math.max(60, sim.cfg.v0 * 1.15);

  const px = (t) => ((t - tStart) / span) * W;
  const py = (v) => H - 8 - (v / vMax) * (H - 18);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(160,180,200,.45)';
  ctx.textAlign = 'left';
  for (let v = 0; v <= vMax; v += 20) {
    ctx.beginPath();
    ctx.moveTo(0, py(v));
    ctx.lineTo(W, py(v));
    ctx.stroke();
    ctx.fillText(String(v), 2, py(v) - 2);
  }

  // area rem
  const pts = s.filter(p => p.t >= tStart);
  if (pts.length > 1) {
    ctx.beginPath();
    ctx.moveTo(px(pts[0].t), H - 4);
    for (const p of pts) ctx.lineTo(px(p.t), H - 4 - p.brake * (H * 0.32));
    ctx.lineTo(px(pts[pts.length - 1].t), H - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(249,115,22,.22)';
    ctx.fill();

    ctx.beginPath();
    pts.forEach((p, i) => {
      const X = px(p.t), Y = py(p.v);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // titik terakhir
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(px(last.t), py(last.v), 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  }

  // penanda event tabrakan
  if (sim.done && sim.outcome === 'collision') {
    const x = px(tEnd);
    ctx.strokeStyle = 'rgba(239,68,68,.8)';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
}
