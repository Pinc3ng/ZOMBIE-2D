/* ==========================================================================
   ARENA MAP & DYNAMIC 2D LIGHTING SYSTEM
   Atmospheric ruined apocalyptic arena with obstacles, barrels & lighting
   ========================================================================== */

class GameMap {
  constructor(width = 2400, height = 1800) {
    this.width = width;
    this.height = height;
    this.nightHorrorMode = true; // Toggle for dynamic dark flashlight cone

    // Static obstacles (barricades, ruined cars)
    this.obstacles = [];
    // Explosive barrels
    this.barrels = [];
    // Street lamps / light sources
    this.lightSources = [];

    this.initArena();
  }

  initArena() {
    this.obstacles = [];
    this.barrels = [];
    this.lightSources = [];

    // Outer boundary walls
    const wallThick = 60;
    this.obstacles.push({ x: 0, y: 0, w: this.width, h: wallThick, type: "wall" });
    this.obstacles.push({ x: 0, y: this.height - wallThick, w: this.width, h: wallThick, type: "wall" });
    this.obstacles.push({ x: 0, y: 0, w: wallThick, h: this.height, type: "wall" });
    this.obstacles.push({ x: this.width - wallThick, y: 0, w: wallThick, h: this.height, type: "wall" });

    // Inner street barricades
    const barricadeConfigs = [
      { x: 500, y: 450, w: 160, h: 40, type: "barricade" },
      { x: 1400, y: 450, w: 180, h: 40, type: "barricade" },
      { x: 700, y: 1200, w: 200, h: 40, type: "barricade" },
      { x: 1600, y: 1100, w: 180, h: 40, type: "barricade" },
      { x: 950, y: 700, w: 50, h: 220, type: "concrete" },
      { x: 1350, y: 850, w: 50, h: 220, type: "concrete" },
      { x: 400, y: 900, w: 140, h: 80, type: "car" },
      { x: 1800, y: 650, w: 140, h: 80, type: "car" }
    ];
    this.obstacles.push(...barricadeConfigs);

    // Red explosive barrels
    const barrelLocations = [
      { x: 620, y: 520 },
      { x: 1350, y: 400 },
      { x: 800, y: 1120 },
      { x: 1550, y: 1180 },
      { x: 1050, y: 800 },
      { x: 480, y: 980 },
      { x: 1720, y: 720 },
      { x: 1100, y: 350 },
      { x: 1300, y: 1400 }
    ];

    for (let b of barrelLocations) {
      this.barrels.push({
        x: b.x,
        y: b.y,
        radius: 18,
        hp: 30,
        maxHp: 30,
        isDead: false
      });
    }

    // Warm street lamp posts / burning fires
    this.lightSources = [
      { x: 450, y: 350, radius: 260, color: "rgba(255, 170, 60, 0.4)" },
      { x: 1750, y: 350, radius: 260, color: "rgba(255, 170, 60, 0.4)" },
      { x: 1100, y: 900, radius: 320, color: "rgba(0, 229, 255, 0.3)" },
      { x: 600, y: 1400, radius: 260, color: "rgba(255, 170, 60, 0.4)" },
      { x: 1800, y: 1400, radius: 260, color: "rgba(255, 170, 60, 0.4)" }
    ];
  }

  // Draw ground floor & road grid
  drawFloor(ctx, camera) {
    // Fill base asphalt
    ctx.fillStyle = "#111622";
    ctx.fillRect(-camera.x, -camera.y, this.width, this.height);

    // Draw asphalt tiles / grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 100;

    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const endX = startX + camera.viewportW + gridSize * 2;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    const endY = startY + camera.viewportH + gridSize * 2;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      if (x < 0 || x > this.width) continue;
      ctx.moveTo(x - camera.x, -camera.y);
      ctx.lineTo(x - camera.x, this.height - camera.y);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      if (y < 0 || y > this.height) continue;
      ctx.moveTo(-camera.x, y - camera.y);
      ctx.lineTo(this.width - camera.x, y - camera.y);
    }
    ctx.stroke();

    // Road markings & biohazard lines
    ctx.save();
    ctx.strokeStyle = "rgba(255, 180, 0, 0.15)";
    ctx.setLineDash([30, 25]);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0 - camera.x, this.height * 0.5 - camera.y);
    ctx.lineTo(this.width - camera.x, this.height * 0.5 - camera.y);
    ctx.moveTo(this.width * 0.5 - camera.x, 0 - camera.y);
    ctx.lineTo(this.width * 0.5 - camera.x, this.height - camera.y);
    ctx.stroke();
    ctx.restore();
  }

  // Draw static obstacles and barrels
  drawObstacles(ctx, camera) {
    // Walls & Barricades
    for (let obs of this.obstacles) {
      ctx.save();
      const rx = obs.x - camera.x;
      const ry = obs.y - camera.y;

      if (obs.type === "wall") {
        ctx.fillStyle = "#0a0c10";
        ctx.fillRect(rx, ry, obs.w, obs.h);
        ctx.strokeStyle = "#ff0055";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, obs.w, obs.h);
      } else if (obs.type === "car") {
        // Ruined car body
        ctx.fillStyle = "#1e283d";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(rx, ry, obs.w, obs.h, 12);
        ctx.fill();
        ctx.strokeStyle = "#384766";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Car windshields
        ctx.fillStyle = "rgba(0, 229, 255, 0.2)";
        ctx.fillRect(rx + 25, ry + 15, obs.w - 50, obs.h - 30);
      } else {
        // Concrete barricade with hazard stripes
        ctx.fillStyle = "#2c3340";
        ctx.fillRect(rx, ry, obs.w, obs.h);
        ctx.strokeStyle = "#505f75";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, obs.w, obs.h);
      }
      ctx.restore();
    }

    // Explosive Barrels
    for (let b of this.barrels) {
      if (b.isDead) continue;
      ctx.save();
      ctx.translate(b.x - camera.x, b.y - camera.y);

      // Red barrel drum
      ctx.fillStyle = "#d90429";
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#2b2d42";
      ctx.stroke();

      // Yellow hazard flame mark
      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Draw Night Flashlight & Dynamic Lighting Mask
  drawLightingMask(ctx, camera, player) {
    if (!this.nightHorrorMode) return;

    ctx.save();
    // Create an off-canvas darkness composite
    const darknessCanvas = document.createElement("canvas");
    darknessCanvas.width = camera.viewportW;
    darknessCanvas.height = camera.viewportH;
    const darkCtx = darknessCanvas.getContext("2d");

    // Fill screen with deep atmospheric darkness
    darkCtx.fillStyle = "rgba(5, 7, 12, 0.94)";
    darkCtx.fillRect(0, 0, camera.viewportW, camera.viewportH);

    // Punch out lights with "destination-out" composite mode
    darkCtx.globalCompositeOperation = "destination-out";

    // 1. Player's Flashlight Cone
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    const flashDist = 480;
    const coneAngle = 0.65; // ~37 degrees cone

    darkCtx.save();
    const flashGrad = darkCtx.createRadialGradient(px, py, 20, px, py, flashDist);
    flashGrad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
    flashGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.85)");
    flashGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");

    darkCtx.fillStyle = flashGrad;
    darkCtx.beginPath();
    darkCtx.moveTo(px, py);
    darkCtx.arc(px, py, flashDist, player.rotation - coneAngle, player.rotation + coneAngle);
    darkCtx.closePath();
    darkCtx.fill();

    // Small radial ambient circle around player
    const bodyGrad = darkCtx.createRadialGradient(px, py, 10, px, py, 90);
    bodyGrad.addColorStop(0, "rgba(0,0,0,1)");
    bodyGrad.addColorStop(1, "rgba(0,0,0,0)");
    darkCtx.fillStyle = bodyGrad;
    darkCtx.beginPath();
    darkCtx.arc(px, py, 90, 0, Math.PI * 2);
    darkCtx.fill();
    darkCtx.restore();

    // 2. Street Lamps & Fixed Lights
    for (let light of this.lightSources) {
      const lx = light.x - camera.x;
      const ly = light.y - camera.y;
      if (lx + light.radius < 0 || lx - light.radius > camera.viewportW ||
          ly + light.radius < 0 || ly - light.radius > camera.viewportH) continue;

      const lampGrad = darkCtx.createRadialGradient(lx, ly, 10, lx, ly, light.radius);
      lampGrad.addColorStop(0, "rgba(0, 0, 0, 0.95)");
      lampGrad.addColorStop(0.8, "rgba(0, 0, 0, 0.4)");
      lampGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      darkCtx.fillStyle = lampGrad;
      darkCtx.beginPath();
      darkCtx.arc(lx, ly, light.radius, 0, Math.PI * 2);
      darkCtx.fill();
    }

    // Render the darkness overlay over the main scene
    ctx.drawImage(darknessCanvas, 0, 0);
    ctx.restore();
  }
}
