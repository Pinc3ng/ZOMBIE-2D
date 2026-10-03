/* ==========================================================================
   WEAPONS & ARSENAL SYSTEM
   Tactical Firearms, Recoil, Reload Mechanics & Explosives
   ========================================================================== */

class Weapon {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon;
    this.damage = config.damage;
    this.magSize = config.magSize;
    this.currentAmmo = config.magSize;
    this.reserveAmmo = config.reserveAmmo; // -1 for infinite
    this.fireRate = config.fireRate; // delay in seconds
    this.reloadTime = config.reloadTime; // seconds
    this.pellets = config.pellets || 1;
    this.spread = config.spread || 0.04;
    this.speed = config.speed || 16;
    this.knockback = config.knockback || 5;
    this.pierce = config.pierce || 1;
    this.soundType = config.soundType || "pistol";
    this.bulletColor = config.bulletColor || "#ffea00";
    this.bulletRadius = config.bulletRadius || 3.5;

    this.lastShotTime = 0;
    this.isReloading = false;
    this.reloadStartTime = 0;
  }

  canShoot(now) {
    if (this.isReloading) return false;
    if (this.currentAmmo <= 0) return false;
    return (now - this.lastShotTime) >= this.fireRate;
  }

  shoot(now, player, targetAngle, bulletsArray) {
    // Auto-reload when ammo is empty!
    if (this.currentAmmo <= 0 && !this.isReloading) {
      if (this.reserveAmmo !== 0) {
        this.startReload(now, player);
        window.particleEngine?.addFloatingText("RELOADING... (R)", player.x, player.y - 25, "#ffb700", 14);
      } else {
        window.soundManager.playEmpty();
      }
      return false;
    }

    if (!this.canShoot(now)) {
      return false;
    }

    this.lastShotTime = now;
    this.currentAmmo--;

    // Play sound based on weapon
    if (this.soundType === "pistol") window.soundManager.playPistol();
    else if (this.soundType === "shotgun") window.soundManager.playShotgun();
    else if (this.soundType === "rifle") window.soundManager.playRifle();
    else if (this.soundType === "plasma") window.soundManager.playPlasma();

    // Muzzle position offset from player center
    const muzzleDist = 28;
    const muzzleX = player.x + Math.cos(targetAngle) * muzzleDist;
    const muzzleY = player.y + Math.sin(targetAngle) * muzzleDist;

    // Spawn muzzle flash & spent casing
    window.particleEngine.createMuzzleFlash(muzzleX, muzzleY, targetAngle, this.bulletColor);
    window.particleEngine.addCasing(muzzleX, muzzleY, targetAngle);

    // Apply player upgrade multipliers
    const finalDamage = this.damage * (player.upgradeMultipliers.damage || 1);
    const finalPierce = this.pierce + (player.upgradeMultipliers.bonusPierce || 0);

    // Spawn pellets
    for (let i = 0; i < this.pellets; i++) {
      const spreadOffset = (Math.random() - 0.5) * this.spread;
      const angle = targetAngle + spreadOffset;
      const speed = this.speed * (0.95 + Math.random() * 0.1);

      bulletsArray.push(new Projectile({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: angle,
        damage: finalDamage,
        knockback: this.knockback,
        pierce: finalPierce,
        color: this.bulletColor,
        radius: this.bulletRadius,
        owner: player,
        range: 900
      }));
    }

    // Small camera shake
    window.gameEngine?.addScreenShake(this.soundType === "shotgun" ? 6 : (this.soundType === "plasma" ? 4 : 2));

    return true;
  }

  startReload(now, player) {
    if (this.isReloading) return;
    if (this.currentAmmo >= this.magSize) return;
    if (this.reserveAmmo === 0) return;

    this.isReloading = true;
    const reloadDuration = this.reloadTime * (player.upgradeMultipliers.reloadSpeed || 1);
    this.reloadDuration = reloadDuration;
    this.reloadStartTime = now;
    window.soundManager.playReload();
  }

  update(now) {
    if (this.isReloading) {
      if (now - this.reloadStartTime >= this.reloadDuration) {
        this.finishReload();
      }
    }
  }

  finishReload() {
    this.isReloading = false;
    const needed = this.magSize - this.currentAmmo;
    if (this.reserveAmmo === -1) {
      // Infinite reserve
      this.currentAmmo = this.magSize;
    } else {
      const take = Math.min(needed, this.reserveAmmo);
      this.currentAmmo += take;
      this.reserveAmmo -= take;
    }
  }

  addAmmo(amount) {
    if (this.reserveAmmo === -1) return;
    this.reserveAmmo += amount;
  }
}

// Grenade Projectile class
class Grenade {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.fuseTime = 1.2; // seconds
    this.timer = 0;
    this.radius = 6;
    this.isExploded = false;
    this.explosionRadius = 140;
    this.damage = 180;
  }

  update(dt, enemies, player) {
    if (this.isExploded) return;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.94;
    this.vy *= 0.94;

    this.timer += dt;
    if (this.timer >= this.fuseTime) {
      this.explode(enemies, player);
    }
  }

  explode(enemies, player) {
    if (this.isExploded) return;
    this.isExploded = true;
    window.soundManager.playExplosion();
    window.particleEngine.createExplosion(this.x, this.y, this.explosionRadius);
    window.gameEngine?.addScreenShake(14);

    // Damage enemies in radius
    for (let e of enemies) {
      if (e.isDead) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.explosionRadius) {
        const falloff = 1 - (dist / this.explosionRadius) * 0.4;
        const dmg = Math.floor(this.damage * falloff);
        const hitAngle = Math.atan2(dy, dx);
        e.takeDamage(dmg, hitAngle, 22, player);
      }
    }
  }

  draw(ctx, camera) {
    if (this.isExploded) return;
    ctx.save();
    ctx.translate(this.x - camera.x, this.y - camera.y);
    ctx.fillStyle = "#2d5a27";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ff0044";
    ctx.stroke();

    // Blinking red fuse light
    if (Math.sin(Date.now() * 0.02) > 0) {
      ctx.fillStyle = "#ff0044";
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Projectile / Bullet class
class Projectile {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.angle = config.angle;
    this.damage = config.damage;
    this.knockback = config.knockback;
    this.pierce = config.pierce;
    this.color = config.color;
    this.radius = config.radius;
    this.owner = config.owner;
    this.maxDistance = config.range;
    this.traveled = 0;
    this.isDead = false;
    this.hitTargets = new Set();
  }

  update(dt) {
    const stepX = this.vx * dt * 60;
    const stepY = this.vy * dt * 60;
    this.x += stepX;
    this.y += stepY;
    this.traveled += Math.hypot(stepX, stepY);

    if (this.traveled >= this.maxDistance) {
      this.isDead = true;
    }
  }

  draw(ctx, camera) {
    ctx.save();
    ctx.translate(this.x - camera.x, this.y - camera.y);
    ctx.rotate(this.angle);

    // Bullet body & trail
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-8, -this.radius, 16, this.radius * 2, 2);
    ctx.fill();
    ctx.restore();
  }
}
