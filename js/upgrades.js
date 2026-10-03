/* ==========================================================================
   ROGUE-LITE PERK & UPGRADE SYSTEM
   Random 3-card perk selector on each Level-Up
   ========================================================================== */

const UPGRADE_POOL = [
  {
    id: "dmg_up",
    name: "HOLLOW POINT ROUNDS",
    icon: "💥",
    desc: "+25% Firearm Damage to all weapons",
    apply: (player) => {
      player.upgradeMultipliers.damage = (player.upgradeMultipliers.damage || 1) * 1.25;
    }
  },
  {
    id: "firerate_up",
    name: "OVERCLOCKED TRIGGER",
    icon: "⚡",
    desc: "+20% Faster Fire Rate for all weapons",
    apply: (player) => {
      for (let w of player.weapons) {
        w.fireRate *= 0.8;
      }
    }
  },
  {
    id: "reload_speed",
    name: "SLEIGHT OF HAND",
    icon: "🔄",
    desc: "-30% Faster Reload Duration",
    apply: (player) => {
      player.upgradeMultipliers.reloadSpeed = (player.upgradeMultipliers.reloadSpeed || 1) * 0.7;
    }
  },
  {
    id: "speed_boots",
    name: "CYBER SPRINT BOOTS",
    icon: "👟",
    desc: "+18% Movement Speed & Faster Stamina Recharge",
    apply: (player) => {
      player.speed *= 1.18;
      player.staminaRegenRate *= 1.25;
    }
  },
  {
    id: "shield_upgrade",
    name: "REINFORCED KEVLAR",
    icon: "🛡️",
    desc: "+35 Max Shield & instantly restores full shield",
    apply: (player) => {
      player.maxShield += 35;
      player.shield = player.maxShield;
    }
  },
  {
    id: "health_nanites",
    name: "NANITE INJECTOR",
    icon: "💉",
    desc: "+30 Max HP and instantly heals 50 HP",
    apply: (player) => {
      player.maxHp += 30;
      player.hp = Math.min(player.maxHp, player.hp + 50);
    }
  },
  {
    id: "piercing_rounds",
    name: "TUNGSTEN PENETRATOR",
    icon: "🎯",
    desc: "+1 Bullet Penetration through zombie hordes",
    apply: (player) => {
      player.upgradeMultipliers.bonusPierce = (player.upgradeMultipliers.bonusPierce || 0) + 1;
    }
  },
  {
    id: "grenade_pack",
    name: "TACTICAL EXPLOSIVES",
    icon: "💣",
    desc: "+2 Max Grenades & replenishes full grenade pouch",
    apply: (player) => {
      player.maxGrenades += 2;
      player.grenades = player.maxGrenades;
    }
  },
  {
    id: "vampire_drain",
    name: "BIO-VAMPIRIC CONVERTER",
    icon: "🩸",
    desc: "15% chance to restore +5 HP on every zombie killed",
    apply: (player) => {
      player.upgradeMultipliers.lifestealChance = (player.upgradeMultipliers.lifestealChance || 0) + 0.15;
    }
  },
  {
    id: "drone_companion",
    name: "AUTONOMOUS DRONE",
    icon: "🤖",
    desc: "Summons or upgrades an automated defense drone!",
    apply: (player) => {
      player.hasDrone = true;
      player.droneLevel = (player.droneLevel || 0) + 1;
    }
  }
];

class UpgradeManager {
  constructor() {
    this.modal = document.getElementById("upgrade-modal");
    this.container = document.getElementById("upgrade-cards-container");
  }

  showLevelUp(player, onSelectCallback) {
    window.soundManager.playLevelUp();
    this.container.innerHTML = "";

    // Shuffle and pick 3 random distinct upgrades
    const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    choices.forEach(perk => {
      const card = document.createElement("div");
      card.className = "upgrade-card";
      card.innerHTML = `
        <div class="upgrade-icon">${perk.icon}</div>
        <div class="upgrade-text">
          <h4>${perk.name}</h4>
          <p>${perk.desc}</p>
        </div>
      `;

      card.addEventListener("click", () => {
        perk.apply(player);
        this.close();
        if (onSelectCallback) onSelectCallback();
      });

      this.container.appendChild(card);
    });

    this.modal.classList.add("active");
  }

  close() {
    this.modal.classList.remove("active");
  }
}

window.upgradeManager = new UpgradeManager();
