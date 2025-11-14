// src/BackgroundAnimation.js
import React from "react";

/**
 * Canvas background (clean, modern, no glow/pulse):
 * - Deeper dark gradient
 * - More lively motion via a gentle flow-field + higher drift
 * - Smooth cursor repulsion
 * - Light dust + vignette + tiny grain
 *
 * Props:
 *   isDark?: boolean  // defaults to true
 */
export default function BackgroundAnimation({ isDark = true }) {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(0);
  const orbsRef = React.useRef([]);
  const dustRef = React.useRef([]);
  const mouseRef = React.useRef({ x: -9999, y: -9999, active: false });
  const supportsFilterRef = React.useRef(false);
  const tRef = React.useRef(0);

  // Deep, cool palettes
  const paletteDark = React.useMemo(
    () => [
      { hue: 220, sat: 65, light: 46, alpha: 0.22 },
      { hue: 216, sat: 60, light: 42, alpha: 0.18 },
      { hue: 208, sat: 58, light: 40, alpha: 0.16 },
      { hue: 198, sat: 52, light: 38, alpha: 0.14 },
    ],
    []
  );
  const paletteLight = React.useMemo(
    () => [
      { hue: 215, sat: 24, light: 52, alpha: 0.14 },
      { hue: 210, sat: 26, light: 58, alpha: 0.12 },
      { hue: 205, sat: 28, light: 60, alpha: 0.12 },
      { hue: 28,  sat: 22, light: 62, alpha: 0.10 },
    ],
    []
  );

  const init = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    supportsFilterRef.current = "filter" in ctx;

    // Orbs — velocity + damping
    const pal = isDark ? paletteDark : paletteLight;
    const ORB_COUNT = Math.round((w * h) / 44000) + 10; // a touch more population
    const orbs = [];
    for (let i = 0; i < ORB_COUNT; i++) {
      const p = pal[i % pal.length];
      const depth = rand(0.38, 1.0); // closer -> higher depth
      const baseR = lerp(120, 220, Math.pow(depth, 0.85));
      orbs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: rand(-0.06, 0.06) * depth,
        vy: rand(-0.06, 0.06) * depth,
        ax: 0,
        ay: 0,
        baseR,
        r: baseR * rand(0.98, 1.02),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.0018, 0.0032) * (isDark ? 1.0 : 0.9), // ↑ a bit
        driftX: rand(0.12, 0.22) * depth,                     // ↑ a bit
        driftY: rand(0.10, 0.18) * depth,                     // ↑ a bit
        hue: p.hue,
        sat: p.sat,
        light: p.light,
        alpha: p.alpha * (isDark ? 1.0 : 0.9),
        depth,
      });
    }
    orbsRef.current = orbs;

    // Sparse dust
    const DUST = [];
    const dustCount = Math.round((w * h) / 150000) + 10;
    for (let i = 0; i < dustCount; i++) {
      DUST.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.5, 1.0),
        alpha: rand(isDark ? 0.05 : 0.03, isDark ? 0.07 : 0.05),
        vx: rand(-0.015, 0.015),
        vy: rand(-0.015, 0.015),
      });
    }
    dustRef.current = DUST;
  }, [isDark, paletteDark, paletteLight]);

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    tRef.current += 0.5; // time for flow-field

    // Deep dark background
    ctx.clearRect(0, 0, w, h);
    const g1 = ctx.createLinearGradient(0, 0, 0, h);
    if (isDark) {
      g1.addColorStop(0, "rgba(6, 10, 18, 0.98)");
      g1.addColorStop(1, "rgba(9, 13, 22, 0.94)");
    } else {
      g1.addColorStop(0, "rgba(196, 202, 212, 0.80)");
      g1.addColorStop(1, "rgba(188, 194, 204, 0.74)");
    }
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Subtle diagonal overlay
    const g2 = ctx.createLinearGradient(0, 0, w, h);
    g2.addColorStop(0, isDark ? "rgba(20, 26, 40, 0.18)" : "rgba(230, 236, 246, 0.12)");
    g2.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    vignette(ctx, w, h, isDark ? 0.22 : 0.12);

    const mouse = mouseRef.current;

    // Orbs with gentle flow-field motion
    ctx.globalCompositeOperation = "screen";
    const k = 0.0026;             // field spatial frequency
    const amp = 0.08;             // field force amplitude
    const time = tRef.current * 0.002; // slow temporal change

    for (const o of orbsRef.current) {
      // flow-field force (curl-ish from two sines)
      const fx = Math.sin((o.y + time * 700) * k) * amp;
      const fy = Math.cos((o.x - time * 900) * k) * amp;
      o.ax += fx * (0.8 + o.depth * 0.6);
      o.ay += fy * (0.8 + o.depth * 0.6);

      // phased drift
      o.phase += o.speed;
      o.ax += Math.cos(o.phase * 0.9) * o.driftX * 0.0014 * o.depth;
      o.ay += Math.sin(o.phase * 0.7) * o.driftY * 0.0014 * o.depth;

      // cursor repulsion
      if (mouse.active) {
        const dx = o.x - mouse.x;
        const dy = o.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const reach = Math.max(240, o.r * 1.05); // a bit wider
        if (dist2 < reach * reach) {
          const d = Math.sqrt(dist2) || 0.001;
          const f = easeOutCubic((reach - d) / reach);
          const ux = dx / d;
          const uy = dy / d;
          const strength = 2.8 * o.depth;        // slightly punchier
          o.ax += ux * f * strength;
          o.ay += uy * f * strength;
        }
      }

      // integrate + damping + cap
      o.vx = (o.vx + o.ax) * 0.575; // less damping → more motion
      o.vy = (o.vy + o.ay) * 0.575;
      const maxSpeed = lerp(0.7, 1.15, o.depth); // faster cap
      const spd = Math.hypot(o.vx, o.vy);
      if (spd > maxSpeed) {
        const k2 = maxSpeed / (spd || 1);
        o.vx *= k2;
        o.vy *= k2;
      }
      o.x += o.vx;
      o.y += o.vy;
      o.ax = 0;
      o.ay = 0;

      // radius stays steady
      o.r += (o.baseR - o.r) * 0.05;

      // wrap
      if (o.x < -o.r) o.x = w + o.r;
      if (o.x > w + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = h + o.r;
      if (o.y > h + o.r) o.y = -o.r;

      // gradient orb
      const innerX = o.x - o.r * 0.35;
      const innerY = o.y - o.r * 0.35;
      const rg = ctx.createRadialGradient(innerX, innerY, o.r * 0.06, o.x, o.y, o.r);
      const core = `hsla(${o.hue}, ${o.sat}%, ${o.light}%, ${o.alpha})`;
      const mid  = `hsla(${o.hue}, ${o.sat}%, ${o.light - 7}%, ${o.alpha * 0.55})`;
      const edge = `hsla(${o.hue}, ${o.sat}%, ${o.light - 12}%, 0)`;
      rg.addColorStop(0.0, core);
      rg.addColorStop(0.42, mid);
      rg.addColorStop(1.0, edge);

      ctx.save();
      if (supportsFilterRef.current) {
        const blurPx = lerp(0.8, 0.18, o.depth);
        ctx.filter = `blur(${blurPx}px)`;
      }
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    // Dust
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    for (const d of dustRef.current) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = w;
      if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h;
      if (d.y > h) d.y = 0;
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Grain
    grain(ctx, w, h, isDark ? 0.02 : 0.016);
  }, [isDark]);

  React.useEffect(() => {
    init();

    const onResize = () => init();
    const onMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };
    const onLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);

    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [init, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "block",
        zIndex: 0,
        pointerEvents: "none",
      }}
      aria-hidden
    />
  );
}

/* ---------- helpers ---------- */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function vignette(ctx, w, h, strength = 0.18) {
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.22,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.92
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function grain(ctx, w, h, alpha = 0.02) {
  const count = Math.floor((w * h) / 16000);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * alpha;
    const light = Math.random() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 0.7})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}
