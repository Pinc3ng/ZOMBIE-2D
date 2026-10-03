/* ==========================================================================
   PARTICLE ENGINE & VISUAL EFFECTS
   High performance, high framerate particle simulation & persistent blood decals.
   ========================================================================== */

class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.casings = [];

    // Background decal canvas for persistent blood & scorch marks without FPS drop
    this.decalCanvas = document.createElement("canvas");
    this.decalCtx = this.decalCanvas.getContext("2d");
    this.decalCount = 0;
  }

  initDecalMap(width, height) {
    this.decalCanvas.width = width;
    this.decalCanvas.height = height;
    this.decalCtx.clearRect(0, 0, width, height);
  }

  // Add blood splatter that gets permanently baked into decalCanvas
  addBloodDecal(x, y, radius = 18, color = "#88001b") {
    if (!this.decalCtx) return;
    this.decalCtx.save();
    this.decalCtx.fillStyle = color;
    this.decalCtx.globalAlpha = 0.55 + Math.random() * 0.3;

    // Main splat
    this.decalCtx.beginPath();
    this.decalCtx.arc(x, y, radius * (0.6 + Math.random() * 0.4), 0, Math.PI * 2);
    this.decalCtx.fill();

    // Random droplet satellites
    const drops = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < drops; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 1.5);
      const dropR = Math.max(1.5, radius * (0.1 + Math.random() * 0.2));
      this.decalCtx.beginPath();
      this.decalCtx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, dropR, 0, Math.PI * 2);
      this.decalCtx.fill();
    }
    this.decalCtx.restore();
    this.decalCount++;
  }

  // Scorch mark for explosions
  addScorchDecal(x, y, radius = 45) {
    if (!this.decalCtx) return;
    this.decalCtx.save();
    const grad = this.decalCtx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    grad.addColorStop(0, "rgba(10, 10, 10, 0.85)");
    grad.addColorStop(0.7, "rgba(30, 20, 15, 0.45)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    this.decalCtx.fillStyle = grad;
    this.decalCtx.beginPath();
    this.decalCtx.arc(x, y, radius, 0, Math.PI * 2);
    this.decalCtx.fill();
    this.decalCtx.restore();
  }

  // Eject brass bullet shell casing
  addCasing(x, y, angle) {
    const ejectAngle = angle + (Math.PI / 2) + (Math.random() - 0.5) * 0.4;
    const speed = 2 + Math.random() * 2.5;
    this.casings.push({
      x,
      y,
      vx: Math.cos(ejectAngle) * speed,
      vy: Math.sin(ejectAngle) * speed,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.3,
      life: 1.0,
      decay: 0.005 + Math.random() * 0.003
    });
  }

  // Muzzle Flash
  createMuzzleFlash(x, y, angle, color = "#ffaa00", count = 6) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        radius: 2 + Math.random() * 3,
        color: color,
        alpha: 1,
        decay: 0.08 + Math.random() * 0.06
      });
    }
  }

  // Blood spurt particles when zombie is hit
  createBloodSpurt(x, y, hitAngle, count = 8, color = "#bb0a22") {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(hitAngle + spread) * speed,
        vy: Math.sin(hitAngle + spread) * speed,
        radius: 2 + Math.random() * 3,
        color: color,
        alpha: 0.9,
        decay: 0.04 + Math.random() * 0.04
      });
    }
    // Also drop small decal
    if (Math.random() < 0.6) {
      this.addBloodDecal(x, y, 10 + Math.random() * 12, color);
    }
  }

  // Explosion effect
  createExplosion(x, y, radius = 60) {
    this.addScorchDecal(x, y, radius);

    // Fire & ember particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const colors = ["#ff3300", "#ff9900", "#ffcc00", "#ff0055", "#444444"];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03
      });
    }

    // Shockwave ring particle
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 10,
      maxRadius: radius * 1.4,
      color: "rgba(255, 200, 100, 0.8)",
      isShockwave: true,
      alpha: 1,
      decay: 0.05
    });
  }

  // Toxic Acid Splash
  createAcidSplash(x, y) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color: "#00ff66",
        alpha: 0.9,
        decay: 0.03 + Math.random() * 0.02
      });
    }
    this.addBloodDecal(x, y, 22, "#00bb44");
  }

  // Floating text (e.g. Damage numbers, XP, Level Up)
  addFloatingText(text, x, y, color = "#ffea00", fontSize = 14, isCrit = false) {
    this.floatingTexts.push({
      text,
      x: x + (Math.random() - 0.5) * 16,
      y: y - 10,
      vy: -1.6,
      color,
      fontSize: isCrit ? fontSize * 1.4 : fontSize,
      isCrit,
      alpha: 1.0,
      life: 1.0,
      decay: 0.025
    });
  }

  update(dt = 1) {
    // Update generic particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;

      if (p.isShockwave) {
        p.radius += (p.maxRadius - p.radius) * 0.2 * dt;
      }

      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update casings
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.angle += c.vAngle * dt;
      c.vx *= 0.88;
      c.vy *= 0.88;
      c.vAngle *= 0.88;
      c.life -= c.decay * dt;
      if (c.life <= 0) {
        this.casings.splice(i, 1);
      }
    }

    // Update floating combat texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= ft.decay * dt;
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Render decal canvas into main world
  drawDecals(ctx, camera) {
    if (!this.decalCanvas) return;
    ctx.drawImage(this.decalCanvas, -camera.x, -camera.y);
  }

  draw(ctx, camera) {
    // Draw spent brass casings
    ctx.save();
    for (let c of this.casings) {
      ctx.save();
      ctx.translate(c.x - camera.x, c.y - camera.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = `rgba(235, 180, 50, ${c.life})`;
      ctx.fillRect(-2, -1, 4, 2);
      ctx.restore();
    }
    ctx.restore();

    // Draw active particles
    for (let p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.isShockwave) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw floating texts
    for (let ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `900 ${ft.fontSize}px sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x - camera.x, ft.y - camera.y);
      ctx.restore();
    }
  }
}

window.particleEngine = new ParticleEngine();
