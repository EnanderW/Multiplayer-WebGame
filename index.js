const express = require('express');
const socket = require('socket.io');
const objects = require('./objects/Entity');
const Entity = objects.entity;
const Player = objects.player;
const Shell = objects.shell;
const Pickup = objects.pickup;

const g = 108;
var delta = 0;
var lastTime = Date.now();

var mapWidth = 1000;
var mapHeight = 1000;

var counter = 0;
function getCounter() {
  return counter++;
}

const app = express();
const server = app.listen(4000, function() {
  console.log("Listening on port 4000...");
});
const io = socket(server);
app.use(express.static('public'));

const sockets = [];
const shells = [];
const players = [];
const pickup_map = [];

io.on('connection', (socket) => {
    console.log('A client has connected.');

    socket.emit('onConnect');

    const id = getCounter();
    const player = new Player(Math.floor(Math.random() * mapWidth), Math.floor(Math.random() * mapHeight), 7*16, 4*16, 0, 0, id);
    sockets[id] = {
      socket: socket,
      player: player
    };
    socket.on('onSpawn', function() {
      player.x = Math.floor(Math.random() * mapWidth);
      player.y = Math.floor(Math.random() * mapHeight);
      player.velX = 0;
      player.velY = 0;
      players[id] = player;
    });

    socket.on('serverMessage', function(data) {
      for (let i in sockets) {
        const dataSocket = sockets[i];
        dataSocket.socket.emit('clientMessage', data);
      }
    });

    socket.on('disconnect', function() {
      delete sockets[id];
      delete players[id];
    });

    socket.on('rotation', function (data) {
      player.rotation = data;
    });
    socket.on('keydown', function(data) {
      switch(data) {
        case 32:
          const now = Date.now();
          if (player.shieldCooldown - now <= 0) {
            player.shield = !player.shield;
            player.shieldCooldown = now + player.shieldCooldownAdd;
          }
          break;
        case 68:
        case 39:
          player.right = true;
          break;
        case 37:
        case 65:
          player.left = true;
          break;
        case 40:
        case 83:
          player.down = true;
          break;
        case 38:
        case 87:
          player.up = true;
          break;
      }
    });

    socket.on('keyup', function(data) {
      switch(data) {
        case 68:
        case 39:
          player.right = false;
          break;
        case 37:
        case 65:
          player.left = false;
          break;
        case 40:
        case 83:
          player.down = false;
          break;
        case 38:
        case 87:
          player.up = false;
          break;
      }
    });

    socket.on('ball', function(data) {
      if (player.shells <= 0) {
        return;
      }

      const dX = data.mouseX - data.halfX - 20;
      const dY = data.mouseY - data.halfY - 20;
      const v = Math.sqrt(dX * dX + dY * dY);

      const shellRound = player.shellRound;
      const half = (shellRound - 1) / 2;
      const oX = (dX / v) * 420;
      const oY = (dY / v) * 420;

      const rotOrigin = (Math.PI / 12);
      for (let times = -half; times <= half; times++) {
        const theta = rotOrigin * times;
        console.log("Theta: " + theta + " | Deg: " + (theta * 180 / Math.PI) + " | Times: " + times);
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const velocityX = oX * cos - oY * sin;
        const velocityY = oX * sin + oY * cos;

        const shell = new Shell(player.x + 2, player.y + 2, 16, 48, velocityX, velocityY, shells.length, 1, player.id);

        shell.rotation = Math.atan2(velocityY, velocityX) + (Math.PI / 2);

        shells.push(shell);
        setTimeout(function() {
          shells.splice(shells.indexOf(shell), 1);
        }, 3000);
      }

      socket.emit('shootShell');
      player.shells--;
    });
});

function updateShells() {
  if (pickup_map.length >= players.length) {
    return;
  }

  const x = Math.floor(Math.random() * mapWidth);
  const y = Math.floor(Math.random() * mapHeight);
  const radius = 5;

  const onPickup = function(player) {
    if (player.shield) {
      player.shield = false;
      player.shieldCooldown = Date.now() + player.shieldCooldownAdd;
    }

    player.shells++;
    sockets[player.id].socket.emit('pickupShell');
  }

  const shell = new Pickup(x, y, 32, 48, radius, 0, onPickup);

  pickup_map.push(shell);
}

function handleDeath(player) {
  const dataSocket = sockets[player.id];
  dataSocket.socket.emit("playerDeath");
  delete players[player.id];
}

function updateServer() {
  const currentTime = Date.now();
  delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  for (let i in players) {
    const player = players[i];
    const speed = player.speed;
    if (!(Math.abs(player.velX) > 0.2 || Math.abs(player.velY) > 0.2)) {
      if (player.up) {
        player.y -= speed * delta;
      }

      if (player.down) {
        player.y += speed * delta;
      }

      if (player.left) {
        player.x -= speed * delta;
      }

      if (player.right) {
        player.x += speed * delta;
      }
    }

    if (player.velX > 0) {
      player.velX -= g * delta;
    } else if (player.velX < 0) {
      player.velX += g * delta;
    }

    if (player.velY > 0) {
      player.velY -= g * delta;
    } else if (player.velY < 0) {
      player.velY += g * delta;
    }

    player.x += player.velX * delta;
    player.y += player.velY * delta;

    if (player.x + player.radius > mapWidth || player.x < 0 || player.y + player.radius > mapHeight || player.y < 0) {
      handleDeath(player);
      continue;
    }

    const sizeMap = pickup_map.length;
    for (let pickupI = 0; pickupI < sizeMap; pickupI++) {
      const pickup = pickup_map[pickupI];

      if (player.speed > 150 && pickup.type == 1) {
        continue;
      }

      if (player.shieldCooldownAdd < 2500 && pickup.type == 2) {
        continue;
      }

      if (player.shellRound > 1 && pickup.type == 3) {
        continue;
      }

      if (player.velocityReducer < 1 && pickup.type == 4) {
        continue;
      }

      const dX = pickup.x - player.x;
      const dY = pickup.y - player.y;
      const distanceSquared = (dX * dX + dY * dY);
      const rad = (pickup.radius + player.radius);
      if (distanceSquared <= rad * rad) {
        pickup.onPickup(player);
        pickup_map.splice(pickupI, 1);
        break;
      }
    }
  }

  const sizeShells = shells.length;
  for (let i = 0; i < sizeShells; i++) {
    const shell = shells[i];

    if (shell == null) {
      continue;
    }

    shell.x += shell.velX * delta;
    shell.y += shell.velY * delta;

    for (let playerI in players) {
      const player = players[playerI];
      if (player.shield) {
        continue;
      }

      if (player.id == shell.playerId) {
        continue;
      }
      if ((player.x < shell.x + shell.radius) &&
      (player.x + player.radius > shell.x) &&
      (player.y < shell.y + shell.radius) &&
      (player.y + player.radius > shell.y)) {
        player.velX += shell.velX * player.velocityReducer;
        player.velY += shell.velY * player.velocityReducer;
        shells.splice(i, 1);
        break;
      }
    }
  }

  for (let i in players) {
    const dataSocket = sockets[i];
    const player = players[i];
    dataSocket.socket.emit('update',
    players,
    shells,
    pickup_map,
    player.x,
    player.y);
  }
}

function updatePowerups() {
  const nextTime = Math.round(Math.random() * (20000 - (players.length * 1000))) + 1000;

  if (pickup_map.length > players.length) {
    setTimeout(updatePowerups, nextTime);
    return;
  }
  const x = Math.floor(Math.random() * mapWidth);
  const y = Math.floor(Math.random() * mapHeight);
  const radius = 5;

  const type = Math.floor(Math.random() * 4) + 1;
  var sX = 0;
  var sY = 0;
  var onPickup;
  switch(type) {
    case 1: // Speed buff
      onPickup = function(player) {
        player.speed = 200;
        setTimeout(function() {
          player.speed = 150;
        }, 6000);
      }
      break;
    case 2: // Shield cooldown reduce
      sX = 16;
      onPickup = function(player) {
        player.shieldCooldownAdd = 1000;
        setTimeout(function() {
          player.shieldCooldownAdd = 2500;
        }, 10000);
      }
      break;
    case 3: // Shell amount
      sX = 48;
      onPickup = function(player) {
        player.shellRound = 3;
        setTimeout(function() {
          player.shellRound = 1;
        }, 10000);
      }
      break;
    case 4: // Velocity reduce
      sX = 32;
      onPickup = function(player) {
        player.velocityReducer = 0.5;
        setTimeout(function() {
          player.velocityReducer = 1;
        }, 8000);
      }
      break;
  }

  const pickup = new Pickup(x, y, sX, sY, radius, type, onPickup);
  pickup_map.push(pickup);
  setTimeout(updatePowerups, nextTime);
}

setTimeout(updatePowerups, 10000);
setInterval(updateServer, 1);
setInterval(updateShells, 4000);
