class Entity {
  constructor(x, y, velX, velY, id) {
    this.rotation = Math.PI * 2;
    this.x = x;
    this.y = y;
    this.velX = velX;
    this.velY = velY;
    this.id = id;
    this.style = {
      color: "black",
      radius: 10
    }
  }
}

class Player extends Entity {
  constructor(x, y, velX, velY, id) {
    super(x, y, velX, velY, id);
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    //this.ballCooldown = 0;
    this.shellType = 0;
    this.style = {
      color: "rgb(" +
       (Math.floor(Math.random() * 256)) + ", "
      + (Math.floor(Math.random() * 256)) + ", "
      + (Math.floor(Math.random() * 256)) + ")",
      radius: 35
    };

  }
}

class Shell extends Entity {
  constructor(x, y, velX, velY, id, type) {
    super(x, y, velX, velY, id);
    this.type = type;
  }
}

module.exports = {
  entity: Entity,
  player: Player,
  shell: Shell
};
