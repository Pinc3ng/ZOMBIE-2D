/* ==========================================================================
   GAME ENGINE & MAIN CONTROLLER
   Coordinates Game Loop, Camera, Input, Waves, and UI State
   ========================================================================== */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");

    // Dimensions & Camera
    this.viewportW = window.innerWidth;
    this.viewportH = window.innerHeight;
    this.camera = { x: 0, y: 0, viewportW: this.viewportW, viewportH: this.viewportH };
    this.screenShake = 0;

    // States: "MENU", "PLAYING", "PAUSED", "LEVEL_UP", "GAME_OVER"
    this.state = "MENU";

    // Subsystems
    this.map = new GameMap(2400, 1800);
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.enemyProjectiles = [];
    this.grenades = [];
    this.drops = [];

    // Wave Management
    this.wave = 1;
    this.waveState = "IN_PROGRESS"; // "IN_PROGRESS", "WAVE_CLEARED"
    this.waveClearTimer = 0;
    this.totalWaveEnemies = 0;
    this.spawnedWaveEnemies = 0;
    this.killedWaveEnemies = 0;
    this.spawnCooldown = 0.8;
    this.lastSpawnTime = 0;

    // High Score
    this.highScore = parseInt(localStorage.getItem("zombie_high_score") || "0", 10);

    // Inputs
    this.input = {
      moveX: 0,
      moveY: 0,
      aimAngle: 0,
      isAiming: false,
      isFiring: false
    };

    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };

    // Touch joystick data
    this.touchJoystick = {
      active: false,
      touchId: null,
      startX: 0,
      startY: 0,
      curX: 0,
      curY: 0,
      maxDist: 50
    };

    this.lastFrameTime = performance.now();

    this.initCanvasSize();
    this.initInputListeners();
    this.initUIButtons();

    // Start rendering / loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewportW = window.innerWidth;
    this.viewportH = window.innerHeight;
    this.canvas.width = this.viewportW * dpr;
    this.canvas.height = this.viewportH * dpr;
    this.ctx.scale(dpr, dpr);
    this.camera.viewportW = this.viewportW;
    this.camera.viewportH = this.viewportH;

    window.addEventListener("resize", () => {
      this.viewportW = window.innerWidth;
      this.viewportH = window.innerHeight;
      this.canvas.width = this.viewportW * dpr;
      this.canvas.height = this.viewportH * dpr;
      this.ctx.scale(dpr, dpr);
      this.camera.viewportW = this.viewportW;
      this.camera.viewportH = this.viewportH;
    });
  }

  initInputListeners() {
    // Keyboard Listeners
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;

      // Quick numbers for weapons
      if (e.key === "1") this.selectWeapon(0);
      else if (e.key === "2") this.selectWeapon(1);
      else if (e.key === "3") this.selectWeapon(2);
      else if (e.key === "4") this.selectWeapon(3);
      else if (e.key.toLowerCase() === "r") {
        if (this.player) this.player.activeWeapon.startReload(performance.now() / 1000, this.player);
      } else if (e.key === " " || e.key === "Shift") {
        if (this.player) this.player.dash(performance.now() / 1000);
      } else if (e.key.toLowerCase() === "g") {
        this.throwGrenade();
      } else if (e.key === "Escape" || e.key === "p") {
        this.togglePause();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse Listeners
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.player) {
        const playerScreenX = this.player.x - this.camera.x;
        const playerScreenY = this.player.y - this.camera.y;
        this.input.aimAngle = Math.atan2(e.clientY - playerScreenY, e.clientX - playerScreenX);
        this.input.isAiming = true;
      }
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.input.isFiring = true;
        window.soundManager.init();
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.mouse.down = false;
        this.input.isFiring = false;
      }
    });

    // Touch Joystick (Left Zone)
    const joyZone = document.getElementById("joystick-zone");
    const joyKnob = document.getElementById("joystick-knob");

    joyZone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      window.soundManager.init();
      const touch = e.changedTouches[0];
      const rect = joyZone.getBoundingClientRect();
      this.touchJoystick.active = true;
      this.touchJoystick.touchId = touch.identifier;
      this.touchJoystick.startX = rect.left + rect.width / 2;
      this.touchJoystick.startY = rect.top + rect.height / 2;
      this.handleJoystickMove(touch.clientX, touch.clientY, joyKnob);
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (!this.touchJoystick.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchJoystick.touchId) {
          this.handleJoystickMove(touch.clientX, touch.clientY, joyKnob);
          break;
        }
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchJoystick.touchId) {
          this.touchJoystick.active = false;
          this.touchJoystick.touchId = null;
          this.input.moveX = 0;
          this.input.moveY = 0;
          joyKnob.style.transform = `translate(0px, 0px)`;
          break;
        }
      }
    };

    window.addEventListener("touchend", endJoystick);
    window.addEventListener("touchcancel", endJoystick);

    // Mobile Action Buttons
    const btnFire = document.getElementById("btn-touch-fire");
    btnFire.addEventListener("touchstart", (e) => {
      e.preventDefault();
      window.soundManager.init();
      this.input.isFiring = true;
      btnFire.classList.add("active");
    });
    btnFire.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.input.isFiring = false;
      btnFire.classList.remove("active");
    });

    const btnDash = document.getElementById("btn-touch-dash");
    btnDash.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.player) this.player.dash(performance.now() / 1000);
    });

    const btnReload = document.getElementById("btn-touch-reload");
    btnReload.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.player) this.player.activeWeapon.startReload(performance.now() / 1000, this.player);
    });

    const btnGrenade = document.getElementById("btn-touch-grenade");
    btnGrenade.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.throwGrenade();
    });
  }

  handleJoystickMove(clientX, clientY, knobEl) {
    const dx = clientX - this.touchJoystick.startX;
    const dy = clientY - this.touchJoystick.startY;
    const dist = Math.hypot(dx, dy);
    const max = this.touchJoystick.maxDist;

    const clampedDist = Math.min(dist, max);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    knobEl.style.transform = `translate(${knobX}px, ${knobY}px)`;

    this.input.moveX = knobX / max;
    this.input.moveY = knobY / max;
  }

  initUIButtons() {
    // Play Game Button
    document.getElementById("btn-start-game").addEventListener("click", () => {
      window.soundManager.init();
      this.startNewGame();
    });

    // Sound toggle
    document.getElementById("btn-sound-toggle").addEventListener("click", () => {
      const isMuted = !window.soundManager.toggleMute();
      document.getElementById("btn-sound-toggle").textContent = isMuted ? "🔇" : "🔊";
    });

    // Flashlight mode toggle
    const btnFlash = document.getElementById("btn-toggle-flashlight");
    btnFlash.addEventListener("click", () => {
      this.map.nightHorrorMode = !this.map.nightHorrorMode;
      btnFlash.textContent = `🔦 NIGHT HORROR MODE: ${this.map.nightHorrorMode ? "ON" : "OFF"}`;
    });

    // Quick Weapon Switcher Buttons
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`w-btn-${i}`);
      if (btn) {
        btn.addEventListener("click", () => this.selectWeapon(i));
      }
    }

    // Pause button & Modal
    document.getElementById("btn-pause").addEventListener("click", () => this.togglePause());
    document.getElementById("btn-resume").addEventListener("click", () => this.togglePause());
    document.getElementById("btn-pause-sound").addEventListener("click", () => {
      const isMuted = !window.soundManager.toggleMute();
      document.getElementById("btn-pause-sound").textContent = isMuted ? "UNMUTE AUDIO" : "MUTE AUDIO";
    });
    document.getElementById("btn-quit").addEventListener("click", () => this.quitToMenu());

    // Game Over Buttons
    document.getElementById("btn-restart").addEventListener("click", () => this.startNewGame());
    document.getElementById("btn-back-menu").addEventListener("click", () => this.quitToMenu());
  }

  selectWeapon(idx) {
    if (!this.player) return;
    this.player.switchWeapon(idx);

    for (let i = 0; i < 4; i++) {
      const b = document.getElementById(`w-btn-${i}`);
      if (b) b.classList.toggle("active", i === idx);
    }
  }

  startNewGame() {
    // Hide modals
    document.getElementById("menu-modal").classList.remove("active");
    document.getElementById("gameover-modal").classList.remove("active");
    document.getElementById("pause-modal").classList.remove("active");

    // Reset systems
    this.map = new GameMap(2400, 1800);
    window.particleEngine.initDecalMap(2400, 1800);
    this.player = new Player(1200, 900);
    this.enemies = [];
    this.bullets = [];
    this.enemyProjectiles = [];
    this.grenades = [];
    this.drops = [];

    this.wave = 1;
    this.startWave(1);

    this.state = "PLAYING";
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveState = "IN_PROGRESS";
    this.totalWaveEnemies = 12 + waveNum * 8;
    this.spawnedWaveEnemies = 0;
    this.killedWaveEnemies = 0;

    // Wave badge display
    document.getElementById("wave-badge").textContent = `WAVE ${this.wave}`;
    window.particleEngine.addFloatingText(`WAVE ${this.wave} BEGINS!`, this.player.x, this.player.y - 60, "#ff0055", 24, true);

    // Boss wave on every 5th wave!
    if (this.wave % 5 === 0) {
      window.particleEngine.addFloatingText(`⚠️ BOSS DETECTED! ⚠️`, this.player.x, this.player.y - 90, "#ff0000", 28, true);
      this.spawnBoss();
    }
  }

  spawnBoss() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 650;
    const bx = Math.max(100, Math.min(this.map.width - 100, this.player.x + Math.cos(angle) * dist));
    const by = Math.max(100, Math.min(this.map.height - 100, this.player.y + Math.sin(angle) * dist));

    const boss = new MutantBoss(bx, by, this.wave);
    this.enemies.push(boss);

    const bossHud = document.getElementById("boss-hud");
    bossHud.style.display = "block";
    document.getElementById("boss-hp-val").textContent = "100%";
    document.getElementById("boss-bar-fill").style.width = "100%";
  }

  updateBossHp(cur, max) {
    const pct = Math.max(0, Math.min(100, (cur / max) * 100));
    document.getElementById("boss-hp-val").textContent = `${Math.ceil(pct)}%`;
    document.getElementById("boss-bar-fill").style.width = `${pct}%`;
  }

  hideBossHp() {
    document.getElementById("boss-hud").style.display = "none";
  }

  throwGrenade() {
    if (!this.player || this.player.grenades <= 0) return;
    this.player.grenades--;
    window.soundManager.playPistol();

    const speed = 12;
    const throwAngle = this.player.rotation;
    this.grenades.push(new Grenade(
      this.player.x,
      this.player.y,
      Math.cos(throwAngle) * speed,
      Math.sin(throwAngle) * speed
    ));
  }

  addScreenShake(amount) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  flashDamageVignette() {
    const vig = document.getElementById("damage-vignette");
    vig.classList.add("hit");
    setTimeout(() => vig.classList.remove("hit"), 150);
  }

  triggerLevelUpModal() {
    this.state = "LEVEL_UP";
    window.upgradeManager.showLevelUp(this.player, () => {
      this.state = "PLAYING";
    });
  }

  onPlayerKilled() {
    this.state = "GAME_OVER";
    window.soundManager.playExplosion();

    // Check High Score
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
      localStorage.setItem("zombie_high_score", this.highScore.toString());
    }

    // Populate Game Over stats
    document.getElementById("go-wave").textContent = this.wave;
    document.getElementById("go-kills").textContent = this.player.kills;
    document.getElementById("go-score").textContent = this.player.score;
    document.getElementById("go-highscore").textContent = this.highScore;

    document.getElementById("gameover-modal").classList.add("active");
  }

  togglePause() {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
      document.getElementById("pause-modal").classList.add("active");
    } else if (this.state === "PAUSED") {
      this.state = "PLAYING";
      document.getElementById("pause-modal").classList.remove("active");
    }
  }

  quitToMenu() {
    this.state = "MENU";
    document.getElementById("pause-modal").classList.remove("active");
    document.getElementById("gameover-modal").classList.remove("active");
    document.getElementById("menu-modal").classList.add("active");
    this.hideBossHp();
  }

  // =========================================================================
  // MAIN GAME LOOP
  // =========================================================================
  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;
    const now = timestamp / 1000;

    if (this.state === "PLAYING") {
      this.update(dt, now);
    }

    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt, now) {
    // Process desktop keyboard movement
    if (!this.touchJoystick.active) {
      let mx = 0;
      let my = 0;
      if (this.keys["w"] || this.keys["arrowup"]) my -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) my += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) mx -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) mx += 1;
      this.input.moveX = mx;
      this.input.moveY = my;
    }

    // Auto-aim for mobile touch fire if mouse isn't active
    if (this.input.isFiring && !this.mouse.down && this.enemies.length > 0) {
      let nearestDist = 550;
      let target = null;
      for (let e of this.enemies) {
        if (e.isDead) continue;
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < nearestDist) {
          nearestDist = d;
          target = e;
        }
      }
      if (target) {
        this.input.aimAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        this.input.isAiming = true;
      }
    }

    // Update Player
    this.player.update(dt, this.input, this.map, now);

    // Player Shooting
    if (this.input.isFiring) {
      this.player.activeWeapon.shoot(now, this.player, this.player.rotation, this.bullets);
    }

    // Camera follow player with smooth lerp
    const targetCamX = this.player.x - this.viewportW / 2;
    const targetCamY = this.player.y - this.viewportH / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;

    // Clamp camera within map
    this.camera.x = Math.max(0, Math.min(this.map.width - this.viewportW, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.map.height - this.viewportH, this.camera.y));

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.camera.x += (Math.random() - 0.5) * this.screenShake;
      this.camera.y += (Math.random() - 0.5) * this.screenShake;
      this.screenShake = Math.max(0, this.screenShake - 30 * dt);
    }

    // Wave Spawning Logic
    if (this.waveState === "IN_PROGRESS") {
      if (this.spawnedWaveEnemies < this.totalWaveEnemies) {
        if (now - this.lastSpawnTime >= this.spawnCooldown) {
          this.lastSpawnTime = now;
          this.spawnZombieWaveMember();
        }
      } else if (this.enemies.every(e => e.isDead)) {
        // Wave Cleared!
        this.waveState = "WAVE_CLEARED";
        this.waveClearTimer = 2.5; // 2.5s break
        window.soundManager.playLevelUp();
        window.particleEngine.addFloatingText(`WAVE ${this.wave} COMPLETED!`, this.player.x, this.player.y - 50, "#00ff88", 22, true);
      }
    } else if (this.waveState === "WAVE_CLEARED") {
      this.waveClearTimer -= dt;
      if (this.waveClearTimer <= 0) {
        this.startWave(this.wave + 1);
      }
    }

    // Update Projectiles (Player Bullets)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);

      // Bullet vs Enemies
      for (let e of this.enemies) {
        if (e.isDead || b.hitTargets.has(e)) continue;
        const dist = Math.hypot(e.x - b.x, e.y - b.y);
        if (dist <= e.radius + b.radius) {
          b.hitTargets.add(e);
          e.takeDamage(b.damage, b.angle, b.knockback, this.player);
          b.pierce--;
          if (b.pierce <= 0) {
            b.isDead = true;
            break;
          }
        }
      }

      // Bullet vs Explosive Barrels
      for (let barrel of this.map.barrels) {
        if (barrel.isDead) continue;
        const d = Math.hypot(barrel.x - b.x, barrel.y - b.y);
        if (d <= barrel.radius + b.radius) {
          barrel.hp -= b.damage;
          b.isDead = true;
          if (barrel.hp <= 0) {
            barrel.isDead = true;
            this.explodeBarrel(barrel);
          }
          break;
        }
      }

      // Bullet vs Map walls / barricades
      for (let obs of this.map.obstacles) {
        if (b.x >= obs.x && b.x <= obs.x + obs.w && b.y >= obs.y && b.y <= obs.y + obs.h) {
          b.isDead = true;
          window.particleEngine.createMuzzleFlash(b.x, b.y, b.angle + Math.PI, "#fff", 3);
          break;
        }
      }

      if (b.isDead) {
        this.bullets.splice(i, 1);
      }
    }

    // Update Enemy Projectiles (Spitter Acid & Boss Spikes)
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.x += ep.vx * dt * 60;
      ep.y += ep.vy * dt * 60;
      ep.traveled += Math.hypot(ep.vx * dt * 60, ep.vy * dt * 60);

      // Hit Player
      const distToPlayer = Math.hypot(ep.x - this.player.x, ep.y - this.player.y);
      if (distToPlayer <= ep.radius + this.player.radius) {
        this.player.takeDamage(ep.damage, now);
        window.particleEngine.createAcidSplash(ep.x, ep.y);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      if (ep.traveled >= ep.maxDist) {
        window.particleEngine.createAcidSplash(ep.x, ep.y);
        this.enemyProjectiles.splice(i, 1);
      }
    }

    // Update Grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.update(dt, this.enemies, this.player);
      if (g.isExploded) {
        this.grenades.splice(i, 1);
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.map, now);
      if (e.isDead) {
        this.enemies.splice(i, 1);
        this.killedWaveEnemies++;
      }
    }

    // Update Drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(dt, this.player);
      if (drop.isCollected) {
        this.drops.splice(i, 1);
      }
    }

    // Update Particle Engine
    window.particleEngine.update(dt);

    // Update HUD Elements
    this.updateHUD();
  }

  explodeBarrel(b) {
    window.soundManager.playExplosion();
    window.particleEngine.createExplosion(b.x, b.y, 160);
    this.addScreenShake(16);

    for (let e of this.enemies) {
      if (e.isDead) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d <= 170) {
        const falloff = 1 - (d / 170) * 0.4;
        e.takeDamage(220 * falloff, Math.atan2(e.y - b.y, e.x - b.x), 24, this.player);
      }
    }
  }

  spawnZombieWaveMember() {
    this.spawnedWaveEnemies++;
    // Pick random spawn point along perimeter off-screen
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(this.viewportW, this.viewportH) * 0.6 + 60;
    let sx = this.player.x + Math.cos(angle) * spawnDist;
    let sy = this.player.y + Math.sin(angle) * spawnDist;

    // Clamp within map bounds
    sx = Math.max(120, Math.min(this.map.width - 120, sx));
    sy = Math.max(120, Math.min(this.map.height - 120, sy));

    // Choose zombie type based on wave
    const rand = Math.random();
    let z = null;

    if (this.wave >= 4 && rand < 0.20) {
      z = new SpitterZombie(sx, sy, this.wave);
    } else if (this.wave >= 3 && rand < 0.45) {
      z = new RunnerZombie(sx, sy, this.wave);
    } else if (this.wave >= 6 && rand < 0.55) {
      z = new TankZombie(sx, sy, this.wave);
    } else {
      z = new Zombie(sx, sy, this.wave);
    }

    this.enemies.push(z);
  }

  updateHUD() {
    if (!this.player) return;

    // HP Bar
    const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
    document.getElementById("hp-bar").style.width = `${hpPct}%`;
    document.getElementById("hp-text").textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;

    // Shield Bar
    const shieldPct = Math.max(0, (this.player.shield / this.player.maxShield) * 100);
    document.getElementById("shield-bar").style.width = `${shieldPct}%`;
    document.getElementById("shield-text").textContent = `${Math.ceil(this.player.shield)}/${this.player.maxShield}`;

    // Stamina Bar
    const stmPct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);
    document.getElementById("stamina-bar").style.width = `${stmPct}%`;
    document.getElementById("stamina-text").textContent = `${Math.floor(stmPct)}%`;

    // Wave Progress Fill
    const wavePct = Math.min(100, (this.killedWaveEnemies / this.totalWaveEnemies) * 100);
    document.getElementById("wave-progress-fill").style.width = `${wavePct}%`;

    // Score & Gold & Level
    document.getElementById("score-text").textContent = this.player.score;
    document.getElementById("gold-text").textContent = this.player.gold;
    document.getElementById("lvl-text").textContent = this.player.level;
    document.getElementById("xp-text").textContent = `${this.player.xp}/${this.player.nextLevelXp}`;

    // Active Weapon Card
    const w = this.player.activeWeapon;
    document.getElementById("hud-weapon-icon").textContent = w.icon;
    document.getElementById("hud-weapon-name").textContent = w.name;
    document.getElementById("hud-ammo-cur").textContent = w.currentAmmo;
    document.getElementById("hud-ammo-max").textContent = w.reserveAmmo === -1 ? "∞" : w.reserveAmmo;
    document.getElementById("hud-reloading").style.display = w.isReloading ? "block" : "none";

    // Grenades text
    document.getElementById("grenade-count-txt").textContent = this.player.grenades;
  }

  render() {
    this.ctx.clearRect(0, 0, this.viewportW, this.viewportH);

    // 1. Draw Map Base Floor
    this.map.drawFloor(this.ctx, this.camera);

    // 2. Draw Baked Blood Decals & Scorch Marks
    window.particleEngine.drawDecals(this.ctx, this.camera);

    // 3. Draw Static Obstacles & Barrels
    this.map.drawObstacles(this.ctx, this.camera);

    // 4. Draw Item Drops
    for (let drop of this.drops) {
      drop.draw(this.ctx, this.camera);
    }

    // 5. Draw Grenades
    for (let g of this.grenades) {
      g.draw(this.ctx, this.camera);
    }

    // 6. Draw Player & Drone
    if (this.player) {
      this.player.draw(this.ctx, this.camera);
    }

    // 7. Draw Zombies
    for (let e of this.enemies) {
      e.draw(this.ctx, this.camera);
    }

    // 8. Draw Player Projectiles (Bullets)
    for (let b of this.bullets) {
      b.draw(this.ctx, this.camera);
    }

    // 9. Draw Enemy Projectiles (Acid / Spikes)
    for (let ep of this.enemyProjectiles) {
      this.ctx.save();
      this.ctx.translate(ep.x - this.camera.x, ep.y - this.camera.y);
      this.ctx.fillStyle = ep.color;
      this.ctx.shadowColor = ep.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, ep.radius, 0, Math.PI * 2);
      this.ctx.fill();
      ctx.restore();
    }

    // 10. Draw Night Flashlight & Dynamic 2D Lighting Mask
    if (this.player) {
      this.map.drawLightingMask(this.ctx, this.camera, this.player);
    }

    // 11. Draw Dynamic Particles & Floating Combat Text (above darkness mask)
    window.particleEngine.draw(this.ctx, this.camera);
  }
}

// Instantiate engine when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.gameEngine = new GameEngine();
});
