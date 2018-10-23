class Entity {
  constructor(x, y, sX, sY, velX, velY, id) {
    this.rotation = Math.PI * 2;
    this.x = x;
    this.y = y;
    this.velX = velX;
    this.velY = velY;
    this.id = id;
    this.radius = 10;
    this.sX = sX;
    this.sY = sY;
  }
}

class Player extends Entity {
  constructor(x, y, sX, sY, velX, velY, id) {
    super(x, y, sX, sY, velX, velY, id);
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.speed = 150;
    this.velocityReducer = 1;
    this.shellRound = 1;
    this.shells = 0;
    this.radius = 40;
    this.shield = false;
    this.shieldCooldown = 0;
    this.shieldCooldownAdd = 2500;
  }
}

class Shell extends Entity {
  constructor(x, y, sX, sY, velX, velY, id, type, playerId) {
    super(x, y, sX, sY, velX, velY, id);
    this.type = type;
    this.playerId = playerId;
    this.radius = 35;
  }
}

class Pickup {
  constructor(x, y, sX, sY, radius, type, onPickup) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type;
    this.onPickup = onPickup;
    this.sX = sX;
    this.sY = sY;
  }
}

module.exports = {
  entity: Entity,
  player: Player,
  shell: Shell,
  pickup: Pickup
};
