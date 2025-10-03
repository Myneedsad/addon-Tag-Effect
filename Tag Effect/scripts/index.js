import { world, system } from "@minecraft/server";

const timeEffect = {
  // เผ่าอสุรีซาก (Asura Race)
  Asura: {
    constant: [],
    day: [],
    night: []
  },
  // เผ่าใต้น้ำ (Underwater Race) - ในน้ำเท่านั้น
  Underwater: {
    day: [
      {
        effect: "speed",
        amplifier: 1
      },
      "strength",
      {
        effect: "water_breathing",
        duration: 400
      }
    ],
    night: [
      "speed",
      "strength",
      {
        effect: "water_breathing",
        duration: 400
      }
    ]
  },
  "Underwater-Land": {
    day: [
      "slowness",
      "weakness"
    ],
    night: ["weakness"]
  },
  // เผ่าเชื้อรา (Fungi Race)
  Fungi: {
    day: [
      "resistance",
      {
        effect: "weakness",
        amplifier: 1
      }
    ],
    night: [
      {
        effect: "resistance",
        amplifier: 1
      },
      {
        effect: "weakness",
        amplifier: 1
      },
      "speed"
    ]
  },
  // เผ่าแมลง - แมงมุม (Insect Race - Spider)
  Spider: {
    day: [
      "speed",
      {
        effect: "night_vision",
        duration: 400
      }
    ],
    night: [
      {
        effect: "speed",
        amplifier: 1
      },
      {
        effect: "saturation",
        duration: 400
      }
    ]
  },
  // เผ่าแมลง - ตะขาบ (Insect Race - Centipede)
  Centipede: {
    day: [
      "speed",
      "resistance",
      "weakness"
    ],
    night: [
      "speed",
      {
        effect: "resistance",
        amplifier: 1
      }
    ]
  },
  // เผ่าแมลง - มด (Insect Race - Ant)
  Ant: {
    day: [
      {
        effect: "resistance",
        amplifier: 1
      },
      "strength"
    ],
    night: ["resistance"]
  },
  // เผ่าแมลง - ตั๊กแตน (Insect Race - Grasshopper)
  Grasshopper: {
    day: [
      {
        effect: "strength",
        amplifier: 1
      },
      "resistance"
    ],
    night: [
      "strength",
      "resistance",
      {
        effect: "hunger",
        amplifier: 1
      }
    ]
  },
  // เผ่าอันโบร์ค (Unbork Race)
  Unbork: {
    day: [
      {
        effect: "resistance",
        amplifier: 1
      },
      "weakness",
      "slowness"
    ],
    night: [
      {
        effect: "resistance",
        amplifier: 1
      }
    ]
  },
  // เผ่าจิ้งจอกเก้าหาง (Nine-Tailed Fox Race)
  NineTailedFox: {
    constant: [
      {
        effect: "speed",
        amplifier: 1
      },
      {
        effect: "strength",
        amplifier: 1
      }
    ],
    day: [],
    night: []
  }
};

system.run(() => {
  system.runInterval(main, 20); // วิ่งทุก 1 วินาที แทนที่จะเป็นทุก tick
  
  // Event สำหรับเผ่าตะขาบ - โจมตีติดพิษ
  world.afterEvents.entityHitEntity.subscribe((event) => {
    const { damagingEntity, hitEntity } = event;
    
    // ตรวจสอบว่าผู้โจมตีเป็น player และมี tag Centipede
    if (damagingEntity?.typeId === "minecraft:player" && damagingEntity.hasTag("Centipede")) {
      // ให้เป้าหมายติดพิษ 1 วินาที
      if (hitEntity && hitEntity.isValid()) {
        hitEntity.addEffect("poison", 20, { amplifier: 1, showParticles: true });
      }
    }
  });
  
  // เริ่มระบบ double jump สำหรับเผ่าจิ้งจอกเก้าหาง
  system.runInterval(nineTailedFoxDoubleJumpTick, 0);
});

async function main() {
  world.getPlayers().forEach(applyEffect);
}

const isDay = () => world.getTimeOfDay() < 13000;

function applyEffect(player) {
  // ตรวจสอบสถานะก่อนว่าอยู่ในน้ำหรือบนบก
  underwaterTagEffect(player);
  
  Object.keys(timeEffect).forEach((key) => {
    if (player.hasTag(key)) {
      timeEffect[key].constant?.forEach((effect) => player.addEffect(...parseEffect(effect)))
      
      if (isDay()) {
        timeEffect[key].day?.forEach((effect) => player.addEffect(...parseEffect(effect)))
      } else {
        timeEffect[key].night?.forEach((effect) => player.addEffect(...parseEffect(effect)))
      }
    }
  });
  
  asuraTagEffect(player);
  grasshopperTagEffect(player);
  unborkTagEffect(player);
}

// เผ่าอสุรีซาก - ได้บัฟเมื่ออยู่ใกล้ซากศพหรือของเน่าเปื่อย
function asuraTagEffect(player) {
  if (!player.hasTag("Asura")) return;
  
  const nearbyEntities = player.dimension.getEntities({
    location: player.location,
    maxDistance: 5,
    excludeTypes: ["minecraft:player"]
  });
  
  // ตรวจสอบว่ามีศพหรือไอเทมที่เน่าเปื่อยใกล้ๆ
  const hasDeadEntity = nearbyEntities.some(entity => 
    entity.typeId.includes("zombie") || 
    entity.typeId.includes("skeleton") ||
    entity.typeId.includes("rotten")
  );
  
  const rottenBlocks = getBlocksAroundPlayer(player, 3).filter(({ typeId }) => 
    typeId.includes("soul") || typeId.includes("sculk")
  );
  
  if (hasDeadEntity || rottenBlocks.length > 0) {
    player.addEffect("resistance", 200, { amplifier: 0, showParticles: false });
    player.addEffect("saturation", 200, { amplifier: 0, showParticles: false });
  }
}

// เผ่าใต้น้ำ - ตรวจจับว่าอยู่ในน้ำหรือบนบก
function underwaterTagEffect(player) {
  if (!player.hasTag("Underwater") && !player.hasTag("Underwater-Land")) return;
  
  // ตรวจสอบบล็อกรอบๆ ตัวผู้เล่น
  const blocksAround = getBlocksAroundPlayer(player, 1);
  const hasWater = blocksAround.some(({ typeId }) => typeId.includes("water"));
  
  // ถ้ามีน้ำในรัศมี = อยู่ในน้ำ
  if (hasWater) {
    player.removeTag("Underwater-Land");
    player.addTag("Underwater");
  } else {
    // ถ้าไม่มีน้ำ = อยู่บนบก
    player.removeTag("Underwater");
    player.addTag("Underwater-Land");
  }
}

// เผ่าตั๊กแตน - กระโดดเมื่อเลือดต่ำกว่า 50%
function grasshopperTagEffect(player) {
  if (!player.hasTag("Grasshopper")) return;
  
  const health = player.getComponent("minecraft:health");
  const maxHealth = health?.defaultValue || 20;
  const currentHealth = health?.currentValue || 20;
  
  if (currentHealth < maxHealth * 0.5) {
    player.addEffect("jump_boost", 200, { amplifier: 0, showParticles: false });
  }
}

// เผ่าอันโบร์ค - ตีแรงเมื่อเลือดต่ำกว่า 60%
function unborkTagEffect(player) {
  if (!player.hasTag("Unbork")) return;
  
  const health = player.getComponent("minecraft:health");
  const maxHealth = health?.defaultValue || 20;
  const currentHealth = health?.currentValue || 20;
  
  if (currentHealth < maxHealth * 0.6) {
    player.addEffect("strength", 200, { amplifier: 1, showParticles: false });
  }
}

function parseEffect(effectName) {
  if (typeof effectName === "string") return [effectName, 200, { showParticles: false }];
  
  const { effect, duration, amplifier, showParticles } = effectName;
  
  return [effect, duration || 200, {
      amplifier: amplifier || 0,
      showParticles: showParticles || false
    }
  ]
}

function getBlocksAroundPlayer(player, radius = 3) {
  const blocks = [];
  const { x: px, y: py, z: pz } = player.location;
  const dim = player.dimension;

  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const blockLoc = {
          x: Math.floor(px + x),
          y: Math.floor(py + y),
          z: Math.floor(pz + z)
        };

        const block = dim.getBlock(blockLoc);
        if (block) blocks.push(block);
      }
    }
  }

  return blocks;
}

// ========== ระบบ Double Jump สำหรับเผ่าจิ้งจอกเก้าหาง ==========

// ค่าคงที่สำหรับ Double Jump (คล้าย Netherite Boots)
const FOX_JUMP_BOOST = 0.6;           // แรงกระโดดครั้งแรก
const FOX_DOUBLE_JUMP_BOOST = 0.8;    // แรงกระโดดครั้งที่สอง
const FOX_SPRINT_JUMP_BOOST = 1.5;    // แรงพุ่งไปข้างหน้าเมื่อวิ่งกระโดด

// Helper functions สำหรับ Dynamic Properties
function setNumber(entity, key, value) {
  entity.setDynamicProperty(`fox_${key}`, value);
}

function getNumber(entity, key) {
  return parseInt(entity.getDynamicProperty(`fox_${key}`)) || 0;
}

function incrementNumber(entity, key, value) {
  let current = getNumber(entity, key) || 0;
  setNumber(entity, key, current + value);
}

function setBoolean(entity, key, value) {
  entity.setDynamicProperty(`fox_${key}`, value);
}

function getBoolean(entity, key) {
  return entity.getDynamicProperty(`fox_${key}`) || false;
}

// ระบบ Double Jump หลัก
function nineTailedFoxDoubleJumpTick() {
  world.getAllPlayers().forEach((player) => {
    if (!player.hasTag("NineTailedFox")) return;
    
    let isFirstJump = false;
    let isDoubleJump = false;
    
    // รีเซ็ตเมื่ออยู่บนพื้น
    if (player.isOnGround) {
      setNumber(player, "is_jumping", 0);
      setNumber(player, "jump_count", 0);
      setBoolean(player, "jump_multiple", false);
    }
    
    // ตรวจจับการกระโดด
    if (player.isJumping && !getBoolean(player, "jump_latch")) {
      isFirstJump = true;
      setBoolean(player, "jump_latch", true);
      incrementNumber(player, "jump_count", 1);
      
      const jumpCount = getNumber(player, "jump_count");
      
      // กระโดดครั้งแรก
      if (jumpCount === 1) {
        setBoolean(player, "jump_multiple", true);
        player.applyKnockback(0, 1, 0, FOX_JUMP_BOOST);
      }
      
      // Double Jump (กระโดดครั้งที่ 2+)
      if (jumpCount >= 2) {
        isDoubleJump = true;
      }
      
      // ทำ Double Jump (สูงสุด 3 ครั้ง)
      if (jumpCount >= 2 && jumpCount <= 4 && !isDoubleJump) {
        setBoolean(player, "jump_multiple", true);
        player.applyKnockback(0, 1, 0, FOX_DOUBLE_JUMP_BOOST);
        
        // เอฟเฟกต์เสียงและพาร์ทิเคิล
        const soundOptions = {
          volume: 0.5,
          pitch: Math.random() + 0.5
        };
        player.playSound("firework.launch", soundOptions);
        player.dimension.spawnParticle("minecraft:totem_particle", player.location);
        
        // ลบ slow falling ถ้ามี
        if (getBoolean(player, "slow_falling_applied")) {
          player.removeEffect("slow_falling");
          setBoolean(player, "slow_falling_applied", false);
        }
      }
    }
    
    // ระบบ Soft Landing (ลดความเสียหายจากการตก)
    if (getBoolean(player, "jump_multiple")) {
      let fallDistance = 6 * (-1 * player.getVelocity().y);
      
      if (fallDistance > 0) {
        let raycastOptions = {
          maxDistance: fallDistance,
          includeLiquidBlocks: true,
          includePassableBlocks: true
        };
        
        if (player.dimension.getBlockFromRay(player.location, {x: 0, y: -1, z: 0}, raycastOptions)) {
          const slowFallOptions = {
            amplifier: 255,
            showParticles: false
          };
          setBoolean(player, "slow_falling_applied", true);
          player.addEffect("slow_falling", 20, slowFallOptions);
        }
      }
    }
    
    // ลบ slow falling เมื่อกระโดดขึ้น
    if (player.getVelocity().y > 0 && getBoolean(player, "slow_falling_applied")) {
      player.removeEffect("slow_falling");
      setBoolean(player, "slow_falling_applied", false);
    }
    
    // เมื่อลงถึงพื้น
    if (player.isOnGround && getBoolean(player, "slow_falling_applied")) {
      player.removeEffect("slow_falling");
      setBoolean(player, "slow_falling_applied", false);
      
      const landSound = {
        volume: 0.5,
        pitch: Math.random() + 0.75
      };
      player.playSound("land.grass", landSound);
    }
    
    // Sprint Jump - พุ่งไปข้างหน้าเมื่อวิ่งแล้วกระโดด
    if (player.isSprinting && isFirstJump && !isDoubleJump) {
      player.applyKnockback(
        player.getViewDirection().x,
        player.getViewDirection().z,
        FOX_SPRINT_JUMP_BOOST,
        FOX_JUMP_BOOST
      );
    }
    
    // รีเซ็ต jump latch
    if (!player.isJumping && getBoolean(player, "jump_latch")) {
      setBoolean(player, "jump_latch", false);
    }
  });
}