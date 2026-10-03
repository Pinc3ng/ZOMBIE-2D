/* ==========================================================================
   GAME ENTITIES: PLAYER, ZOMBIE TYPES, DRONE & PICKUP DROPS
   ========================================================================== */

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.rotation = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 4.2;

    // Vitals
    this.maxHp = 100;
    this.hp = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.lastShieldHitTime = 0;

    // Stamina & Dash
    this.maxStamina = 100;
    this.stamina = 100;
    this.staminaRegenRate = 26; // per sec
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.22;
    this.dashCooldown = 0.6;
    this.lastDashTime = 0;

    // Arsenal
    this.weapons = [
      new Weapon({ id: "pistol", name: "M1911 Pistol", icon: "🔫", damage: 26, magSize: 12, reserveAmmo: -1, fireRate: 0.22, reloadTime: 1.0, soundType: "pistol", bulletColor: "#ffe600", bulletRadius: 3.5, knockback: 6, pierce: 1 }),
      new Weapon({ id: "shotgun", name: "Remington 870", icon: "💥", damage: 18, magSize: 8, reserveAmmo: 56, fireRate: 0.72, reloadTime: 1.7, pellets: 7, spread: 0.28, soundType: "shotgun", bulletColor: "#ff7700", bulletRadius: 3, knockback: 16, pierce: 1 }),
      new Weapon({ id: "rifle", name: "AK-47 Tactical", icon: "⚡", damage: 32, magSize: 30, reserveAmmo: 180, fireRate: 0.11, reloadTime: 1.4, soundType: "rifle", bulletColor: "#00e5ff", bulletRadius: 3.5, knockback: 7, pierce: 1 }),
      new Weapon({ id: "plasma", name: "BZZT-9000 Plasma", icon: "🚀", damage: 85, magSize: 10, reserveAmmo: 40, fireRate: 0.48, reloadTime: 2.0, soundType: "plasma", bulletColor: "#00ff88", bulletRadius: 6, knockback: 14, pierce: 3 })
    ];
    this.currentWeaponIndex = 0;
    this.maxGrenades = 3;
    this.grenades = 3;

    // Progression
    this.level = 1;
    this.xp = 0;
    this.nextLevelXp = 100;
    this.gold = 0;
    this.kills = 0;
    this.score = 0;

    // Upgrades
    this.upgradeMultipliers = {
      damage: 1,
      reloadSpeed: 1,
      bonusPierce: 0,
      lifestealChance: 0
    };

    // Drone
    this.hasDrone = false;
    this.droneLevel = 0;
    this.drone = null;

    // Damage invulnerability frames
    this.invulnerableTimer = 0;
  }

  get activeWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  switchWeapon(idx) {
    if (idx >= 0 && idx < this.weapons.length) {
      this.currentWeaponIndex = idx;
      window.soundManager.playReload();
    }
  }

  dash(now) {
    if (this.isDashing) return;
    if (this.stamina < 30) return;
    if (now - this.lastDashTime < this.dashCooldown) return;

    this.stamina -= 30;
    this.isDashing = true;
    this.dashTimer = 0;
    this.lastDashTime = now;
    window.soundManager.playDash();

    // Dash burst vector
    const moveLen = Math.hypot(this.vx, this.vy);
    const dashDir = moveLen > 0.1 ? Math.atan2(this.vy, this.vx) : this.rotation;
    const dashPower = 14;
    this.vx = Math.cos(dashDir) * dashPower;
    this.vy = Math.sin(dashDir) * dashPower;
  }

  takeDamage(amount, now) {
    if (this.invulnerableTimer > 0 || this.isDashing) return;

    this.lastShieldHitTime = now;
    this.invulnerableTimer = 0.35; // i-frames
    window.soundManager.playPlayerHurt();
    window.gameEngine?.flashDamageVignette();
    window.gameEngine?.addScreenShake(8);

    let remainingDmg = amount;
    if (this.shield > 0) {
      if (this.shield >= remainingDmg) {
        this.shield -= remainingDmg;
        remainingDmg = 0;
      } else {
        remainingDmg -= this.shield;
        this.shield = 0;
      }
    }

    if (remainingDmg > 0) {
      this.hp -= remainingDmg;
      window.particleEngine.addBloodSpurt(this.x, this.y, this.rotation + Math.PI, 6);
      if (this.hp <= 0) {
        this.hp = 0;
        window.gameEngine?.onPlayerKilled();
      }
    }
  }

  addXp(amount) {
    this.xp += amount;
    this.score += amount * 10;
    if (this.xp >= this.nextLevelXp) {
      this.levelUp();
    }
  }

  levelUp() {
    this.xp -= this.nextLevelXp;
    this.level++;
    this.nextLevelXp = Math.floor(this.nextLevelXp * 1.35);
    window.particleEngine.addFloatingText("⭐ LEVEL UP! ⭐", this.x, this.y - 30, "#00ff88", 20, true);
    window.gameEngine?.triggerLevelUpModal();
  }

  update(dt, input, map, now) {
    // I-frames
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Shield passive recharge (after 4s of not taking damage)
    if (now - this.lastShieldHitTime > 4.0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 20 * dt);
    }

    // Stamina recharge
    if (!this.isDashing && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
    }

    // Dashing
    if (this.isDashing) {
      this.dashTimer += dt;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= 0.92;
      this.vy *= 0.92;

      // Spawn motion ghost particle
      if (Math.random() < 0.5) {
        window.particleEngine.particles.push({
          x: this.x,
          y: this.y,
          vx: 0,
          vy: 0,
          radius: this.radius,
          color: "rgba(0, 229, 255, 0.4)",
          alpha: 0.6,
          decay: 0.08
        });
      }

      if (this.dashTimer >= this.dashDuration) {
        this.isDashing = false;
      }
    } else {
      // Normal movement input
      let mx = input.moveX;
      let my = input.moveY;
      const mag = Math.hypot(mx, my);
      if (mag > 1) {
        mx /= mag;
        my /= mag;
      }

      const targetVx = mx * this.speed;
      const targetVy = my * this.speed;
      this.vx += (targetVx - this.vx) * 0.25;
      this.vy += (targetVy - this.vy) * 0.25;

      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
    }

    // Aim rotation
    if (input.isAiming) {
      this.rotation = input.aimAngle;
    } else if (Math.hypot(this.vx, this.vy) > 0.2) {
      this.rotation = Math.atan2(this.vy, this.vx);
    }

    // Arena boundary collision
    const pad = this.radius + 60;
    this.x = Math.max(pad, Math.min(map.width - pad, this.x));
    this.y = Math.max(pad, Math.min(map.height - pad, this.y));

    // Obstacle collision resolution
    for (let obs of map.obstacles) {
      if (obs.type === "wall") continue;
      this.resolveBoxCollision(obs);
    }

    // Update active weapon reload
    this.activeWeapon.update(now);

    // Update Drone if owned
    if (this.hasDrone) {
      if (!this.drone) this.drone = new Drone(this);
      this.drone.update(dt, this, window.gameEngine?.enemies || [], now);
    }
  }

  resolveBoxCollision(box) {
    const nearestX = Math.max(box.x, Math.min(this.x, box.x + box.w));
    const nearestY = Math.max(box.y, Math.min(this.y, box.y + box.h));
    const dx = this.x - nearestX;
    const dy = this.y - nearestY;
    const dist = Math.hypot(dx, dy);

    if (dist < this.radius) {
      const overlap = this.radius - dist;
      if (dist > 0.001) {
        this.x += (dx / dist) * overlap;
        this.y += (dy / dist) * overlap;
      } else {
        this.x += overlap;
      }
    }
  }

  draw(ctx, camera) {
    ctx.save();
    ctx.translate(this.x - camera.x, this.y - camera.y);
    ctx.rotate(this.rotation);

    // Shield protective aura ring
    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.3 + (this.shield / this.maxShield) * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Survivor body
    ctx.fillStyle = "#2c4033"; // Tactical green hoodie
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = "#142119";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Backpack
    ctx.fillStyle = "#4a3525";
    ctx.fillRect(-this.radius - 2, -7, 6, 14);

    // Hands & Gun barrel
    ctx.fillStyle = "#d1a884"; // Skin
    ctx.beginPath();
    ctx.arc(10, 8, 4.5, 0, Math.PI * 2); // Right hand
    ctx.arc(14, -6, 4.5, 0, Math.PI * 2); // Left hand
    ctx.fill();

    // Gun
    ctx.fillStyle = "#111";
    ctx.fillRect(8, 2, 18, 5); // Gun barrel pointing forward

    // Survivor visor / helmet
    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.arc(6, 0, 5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.restore();

    // Draw Drone if active
    if (this.hasDrone && this.drone) {
      this.drone.draw(ctx, camera);
    }
  }
}

// Autonomous Tactical Drone
class Drone {
  constructor(owner) {
    this.owner = owner;
    this.x = owner.x;
    this.y = owner.y;
    this.orbitAngle = 0;
    this.orbitRadius = 55;
    this.fireCooldown = 0.55;
    this.lastFireTime = 0;
    this.rotation = 0;
  }

  update(dt, owner, enemies, now) {
    this.orbitAngle += 2.0 * dt;
    this.x = owner.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = owner.y + Math.sin(this.orbitAngle) * this.orbitRadius;

    // Find closest enemy within 400px
    let closest = null;
    let closestDist = 420;
    for (let e of enemies) {
      if (e.isDead) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        closest = e;
      }
    }

    if (closest) {
      this.rotation = Math.atan2(closest.y - this.y, closest.x - this.x);
      if (now - this.lastFireTime >= this.fireCooldown) {
        this.lastFireTime = now;
        window.soundManager.playPistol();

        // Fire laser bolt
        const speed = 16;
        window.gameEngine?.bullets.push(new Projectile({
          x: this.x,
          y: this.y,
          vx: Math.cos(this.rotation) * speed,
          vy: Math.sin(this.rotation) * speed,
          angle: this.rotation,
          damage: 22 + (owner.droneLevel * 8),
          knockback: 4,
          pierce: 1,
          color: "#00e5ff",
          radius: 3,
          owner: owner,
          range: 600
        }));
      }
    } else {
      this.rotation = this.orbitAngle + Math.PI / 2;
    }
  }

  draw(ctx, camera) {
    ctx.save();
    ctx.translate(this.x - camera.x, this.y - camera.y);
    ctx.rotate(this.rotation);

    // Drone chassis
    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0b1726";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Laser barrel
    ctx.fillStyle = "#fff";
    ctx.fillRect(4, -1.5, 8, 3);

    ctx.restore();
  }
}

// Base Zombie Entity
class Zombie {
  constructor(x, y, wave = 1) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.rotation = 0;
    this.vx = 0;
    this.vy = 0;
    this.wave = wave;

    this.type = "walker";
    this.maxHp = 40 + wave * 8;
    this.hp = this.maxHp;
    this.speed = 1.9 + Math.random() * 0.4;
    this.damage = 12 + Math.floor(wave * 1.5);
    this.attackCooldown = 0.8;
    this.lastAttackTime = 0;
    this.isDead = false;

    this.color = "#3b6041"; // Zombie flesh
    this.eyeColor = "#ff2255";
    this.scoreValue = 50;
    this.xpValue = 20;
  }

  takeDamage(amount, hitAngle, knockbackForce = 6, attacker = null) {
    if (this.isDead) return;
    this.hp -= amount;

    // Knockback
    this.vx += Math.cos(hitAngle) * knockbackForce;
    this.vy += Math.sin(hitAngle) * knockbackForce;

    // Blood spurt
    window.particleEngine.createBloodSpurt(this.x, this.y, hitAngle, 5);
    window.particleEngine.addFloatingText(`${Math.floor(amount)}`, this.x, this.y, amount > 60 ? "#ff2255" : "#ffe600", 14, amount > 60);
    window.soundManager.playZombieHurt();

    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  die(attacker) {
    if (this.isDead) return;
    this.isDead = true;
    window.soundManager.playZombieDie();
    window.particleEngine.addBloodDecal(this.x, this.y, this.radius * 1.8, "#660515");

    if (attacker) {
      attacker.kills++;
      attacker.score += this.scoreValue;
      attacker.addXp(this.xpValue);

      // Vampiric lifesteal perk
      if (attacker.upgradeMultipliers.lifestealChance > 0) {
        if (Math.random() < attacker.upgradeMultipliers.lifestealChance) {
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + 5);
          window.particleEngine.addFloatingText("+5 HP", attacker.x, attacker.y - 20, "#00ff88", 14);
        }
      }
    }

    // Random item drop chance
    this.dropLoot();
  }

  dropLoot() {
    const rand = Math.random();
    let type = null;
    if (rand < 0.40) type = "xp"; // 40% XP gem
    else if (rand < 0.58) type = "coin"; // 18% Gold coin
    else if (rand < 0.68) type = "ammo"; // 10% Ammo
    else if (rand < 0.74) type = "medkit"; // 6% Medkit
    else if (rand < 0.79) type = "shield"; // 5% Shield battery
    else if (rand < 0.81) type = "nuke"; // 2% Screen nuke!

    if (type) {
      window.gameEngine?.drops.push(new DropItem(this.x, this.y, type));
    }
  }

  update(dt, player, map, now) {
    if (this.isDead) return;

    // Movement towards player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.rotation = Math.atan2(dy, dx);

    // Desired velocity towards player
    const dirX = dist > 0.01 ? dx / dist : 0;
    const dirY = dist > 0.01 ? dy / dist : 0;

    this.vx += (dirX * this.speed - this.vx) * 0.15;
    this.vy += (dirY * this.speed - this.vy) * 0.15;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Player attack contact
    if (dist < this.radius + player.radius) {
      if (now - this.lastAttackTime >= this.attackCooldown) {
        this.lastAttackTime = now;
        player.takeDamage(this.damage, now);
      }
    }
  }

  draw(ctx, camera) {
    if (this.isDead) return;
    ctx.save();
    ctx.translate(this.x - camera.x, this.y - camera.y);
    ctx.rotate(this.rotation);

    // Torso & head
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1a3320";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ripped arms reaching forward
    ctx.fillStyle = this.color;
    ctx.fillRect(8, -12, 14, 5);
    ctx.fillRect(8, 7, 14, 5);

    // Red glowing eyes
    ctx.fillStyle = this.eyeColor;
    ctx.beginPath();
    ctx.arc(6, -5, 2.5, 0, Math.PI * 2);
    ctx.arc(6, 5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Fast Runner Zombie
class RunnerZombie extends Zombie {
  constructor(x, y, wave) {
    super(x, y, wave);
    this.type = "runner";
    this.maxHp = 25 + wave * 5;
    this.hp = this.maxHp;
    this.speed = 3.6 + Math.random() * 0.5; // Fast!
    this.damage = 10 + Math.floor(wave * 1.2);
    this.radius = 14;
    this.color = "#7a2b2b"; // Bloodstained red/brown
    this.eyeColor = "#ff0000";
    this.scoreValue = 75;
    this.xpValue = 30;
  }
}

// Toxic Spitter Zombie
class SpitterZombie extends Zombie {
  constructor(x, y, wave) {
    super(x, y, wave);
    this.type = "spitter";
    this.maxHp = 50 + wave * 7;
    this.hp = this.maxHp;
    this.speed = 1.6;
    this.damage = 8;
    this.color = "#1f5e3b";
    this.eyeColor = "#00ff66";
    this.spitCooldown = 2.4;
    this.lastSpitTime = 0;
    this.preferredDist = 300;
  }

  update(dt, player, map, now) {
    if (this.isDead) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.rotation = Math.atan2(dy, dx);

    // Keep distance
    let targetSpeed = 0;
    if (dist < this.preferredDist - 40) {
      targetSpeed = -this.speed; // Retreat
    } else if (dist > this.preferredDist + 40) {
      targetSpeed = this.speed; // Advance
    }

    const dirX = dist > 0.01 ? dx / dist : 0;
    const dirY = dist > 0.01 ? dy / dist : 0;

    this.vx += (dirX * targetSpeed - this.vx) * 0.15;
    this.vy += (dirY * targetSpeed - this.vy) * 0.15;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Spit toxic acid ball
    if (now - this.lastSpitTime >= this.spitCooldown && dist < 500) {
      this.lastSpitTime = now;
      const spitSpeed = 8;
      window.gameEngine?.enemyProjectiles.push({
        x: this.x,
        y: this.y,
        vx: dirX * spitSpeed,
        vy: dirY * spitSpeed,
        radius: 6,
        damage: 15,
        color: "#00ff55",
        traveled: 0,
        maxDist: 500
      });
      window.soundManager.playZombieHurt();
    }
  }
}

// Colossal Tank Brute Zombie
class TankZombie extends Zombie {
  constructor(x, y, wave) {
    super(x, y, wave);
    this.type = "tank";
    this.radius = 28;
    this.maxHp = 280 + wave * 60;
    this.hp = this.maxHp;
    this.speed = 1.2;
    this.damage = 35;
    this.color = "#4a525a"; // Armored grey mutant
    this.eyeColor = "#ffaa00";
    this.scoreValue = 250;
    this.xpValue = 100;
  }

  takeDamage(amount, hitAngle, knockbackForce = 6, attacker = null) {
    // Tanks resist heavy knockback
    super.takeDamage(amount, hitAngle, knockbackForce * 0.25, attacker);
  }
}

// Mutant Tyrant Boss
class MutantBoss extends Zombie {
  constructor(x, y, wave) {
    super(x, y, wave);
    this.type = "boss";
    this.radius = 42;
    this.maxHp = 1200 + wave * 400;
    this.hp = this.maxHp;
    this.speed = 1.7;
    this.damage = 45;
    this.color = "#800f2f";
    this.eyeColor = "#ff0055";
    this.scoreValue = 1500;
    this.xpValue = 500;

    this.specialAttackTimer = 0;
  }

  update(dt, player, map, now) {
    super.update(dt, player, map, now);
    this.specialAttackTimer += dt;

    // Fire ring of spikes every 4.5 seconds
    if (this.specialAttackTimer >= 4.5) {
      this.specialAttackTimer = 0;
      window.soundManager.playExplosion();
      window.gameEngine?.addScreenShake(10);

      const spikes = 12;
      for (let i = 0; i < spikes; i++) {
        const angle = (Math.PI * 2 / spikes) * i;
        window.gameEngine?.enemyProjectiles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 6,
          vy: Math.sin(angle) * 6,
          radius: 7,
          damage: 20,
          color: "#ff0055",
          traveled: 0,
          maxDist: 600
        });
      }
    }
  }

  takeDamage(amount, hitAngle, knockbackForce = 6, attacker = null) {
    super.takeDamage(amount, hitAngle, 0, attacker); // Immune to knockback
    // Update boss bar UI
    window.gameEngine?.updateBossHp(this.hp, this.maxHp);
  }

  die(attacker) {
    super.die(attacker);
    window.gameEngine?.hideBossHp();
    // Drop multiple valuable loot boxes
    for (let i = 0; i < 4; i++) {
      window.gameEngine?.drops.push(new DropItem(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 60, "xp"));
      window.gameEngine?.drops.push(new DropItem(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 60, "coin"));
    }
    window.gameEngine?.drops.push(new DropItem(this.x, this.y, "medkit"));
  }
}

// Pickup Drop Item
class DropItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // "xp", "coin", "medkit", "ammo", "shield", "nuke"
    this.radius = 12;
    this.isCollected = false;
    this.age = 0;
    this.maxAge = 45; // 45 seconds before fade
    this.pulse = 0;
  }

  update(dt, player) {
    if (this.isCollected) return;
    this.age += dt;
    this.pulse += 5 * dt;

    if (this.age >= this.maxAge) {
      this.isCollected = true;
      return;
    }

    // Magnet draw towards player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const magnetRadius = 140;

    if (dist < magnetRadius) {
      const pullSpeed = (1 - dist / magnetRadius) * 12 + 2;
      this.x += (dx / dist) * pullSpeed * dt * 60;
      this.y += (dy / dist) * pullSpeed * dt * 60;
    }

    // Pickup collision
    if (dist < this.radius + player.radius) {
      this.collect(player);
    }
  }

  collect(player) {
    if (this.isCollected) return;
    this.isCollected = true;
    window.soundManager.playPickup();

    if (this.type === "xp") {
      player.addXp(35);
      window.particleEngine.addFloatingText("+35 XP", this.x, this.y, "#00e5ff", 13);
    } else if (this.type === "coin") {
      player.gold += 15;
      window.particleEngine.addFloatingText("+15 🪙", this.x, this.y, "#ffcc00", 14);
    } else if (this.type === "medkit") {
      player.hp = Math.min(player.maxHp, player.hp + 40);
      window.particleEngine.addFloatingText("+40 HP", this.x, this.y, "#00ff88", 16, true);
    } else if (this.type === "shield") {
      player.shield = player.maxShield;
      window.particleEngine.addFloatingText("SHIELD FULL", this.x, this.y, "#00e5ff", 14, true);
    } else if (this.type === "ammo") {
      for (let w of player.weapons) {
        if (w.reserveAmmo !== -1) w.addAmmo(w.magSize * 2);
      }
      player.grenades = Math.min(player.maxGrenades, player.grenades + 1);
      window.particleEngine.addFloatingText("AMMO RESTORED", this.x, this.y, "#ffb700", 14, true);
    } else if (this.type === "nuke") {
      window.soundManager.playExplosion();
      window.gameEngine?.addScreenShake(20);
      window.particleEngine.createExplosion(player.x, player.y, 400);
      window.particleEngine.addFloatingText("☢️ TACTICAL NUKE! ☢️", player.x, player.y - 40, "#ff0044", 22, true);
      // Kill all non-boss zombies
      for (let e of window.gameEngine?.enemies || []) {
        if (e.type !== "boss") {
          e.takeDamage(999, 0, 10, player);
        } else {
          e.takeDamage(300, 0, 10, player);
        }
      }
    }
  }

  draw(ctx, camera) {
    if (this.isCollected) return;
    ctx.save();
    ctx.translate(this.x - camera.x, this.y - camera.y);

    const scale = 1 + Math.sin(this.pulse) * 0.12;
    ctx.scale(scale, scale);

    if (this.type === "xp") {
      // Glowing cyan crystal
      ctx.fillStyle = "#00e5ff";
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "coin") {
      // Spinning gold coin
      ctx.fillStyle = "#ffd000";
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
    } else if (this.type === "medkit") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#00ff66";
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillRect(-5, -2, 10, 4);
    } else if (this.type === "shield") {
      ctx.fillStyle = "#0077ff";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", 0, 0);
    } else if (this.type === "ammo") {
      ctx.fillStyle = "#d4a373";
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = "#582f0e";
      ctx.fillRect(-8, -2, 16, 4);
    } else if (this.type === "nuke") {
      ctx.fillStyle = "#ff0044";
      ctx.shadowColor = "#ff0044";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("☢", 0, 0);
    }

    ctx.restore();
  }
}
