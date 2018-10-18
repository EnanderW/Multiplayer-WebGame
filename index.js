var express = require('express');
var socket = require('socket.io');
var objects = require('./objects/Entity');
const Entity = objects.entity;
const Player = objects.player;
const Shell = objects.shell;
//var player = require('./objects/Player');

/*
Shoot balls/bullets.
When balls hit players the player flies back.
If a player is outside the map area, they die.
*/

var g = 108;
var delta = 0;
var lastTime = Date.now();

var mapWidth = 1000;
var mapHeight = 1000;

//var updateFps = Date.now();
//var fps = 0;

var counter = 0;
function getCounter() {
  return counter++;
}

var app = express();

var server = app.listen(4000, function() {
  console.log("Listening on port 4000...");
});

var io = socket(server);

app.use(express.static('public'));

const sockets = [];
const shells = [];
const players = [];
const shell_map = [];

io.on('connection', (socket) => {
    console.log('A client has connected.');

    socket.emit('onConnect');

    const id = getCounter();
    const player = new Player(Math.floor(Math.random() * mapWidth), Math.floor(Math.random() * mapHeight), 0, 0, id);
    sockets[id] = {
      socket: socket,
      player: player
    };
    socket.on('onSpawn', function() {
      player.x = Math.floor(Math.random() * mapWidth);
      player.y = Math.floor(Math.random() * mapHeight);
      player.velX = 0;
      player.velY = 0;
      //player = new Player(Math.floor(Math.random() * mapWidth), Math.floor(Math.random() * mapHeight), 0, 0, id);
      players[id] = player;
    });

    socket.on('serverMessage', function(data) {
      for (var i in sockets) {
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

      const dX = data.mouseX - data.halfX;
      const dY = data.mouseY - data.halfY;
      const v = Math.sqrt(dX * dX + dY * dY);
      const velocityX = (dX / v) * 420;
      const velocityY = (dY / v) * 420;

      //player.ballCooldown = Date.now() + 600;
      const shell = new Shell(player.x, player.y, velocityX, velocityY, shells.length, 1, player.id);

      shell.rotation = Math.atan2(dY, dX) + (Math.PI / 2);

      shells.push(shell);
      socket.emit('shootShell');
      player.shells--;
      setTimeout(function() {
        shells.splice(shell.id, 1);
      }, 3000);
    });
});

function updateShells() {
  if (shell_map.length >= players.length) {
    return;
  }

  const shell = {
    x: Math.floor(Math.random() * mapWidth),
    y: Math.floor(Math.random() * mapHeight),
    type: Math.floor(Math.random() * 4) + 1,
    radius: 5
  };

  shell_map.push(shell);
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

  for (var i in players) {
    const player = players[i];
    if (!(Math.abs(player.velX) > 0.2 || Math.abs(player.velY) > 0.2)) {
    if (player.up) {
      player.y -= 150 * delta;
    }

    if (player.down) {
      player.y += 150 * delta;
    }

    if (player.left) {
      player.x -= 150 * delta;
    }

    if (player.right) {
      player.x += 150 * delta;
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


    const sizeMap = shell_map.length;
    for (var shellI = 0; shellI < sizeMap; shellI++) {
      const shell = shell_map[shellI];

      const dX = shell.x - player.x;
      const dY = shell.y - player.y;
      const distanceSquared = (dX * dX + dY * dY);
      const rad = (shell.radius + player.radius);
      if (distanceSquared <= rad * rad) {
        sockets[i].socket.emit('pickupShell', shell.type);
        player.shells++;
        shell_map.splice(shellI, 1);
        break;
      }
    }
  }

  const sizeShells = shells.length;
  for (var i = 0; i < sizeShells; i++) {
    const shell = shells[i];

    if (shell == null) {
      continue;
    }

    shell.x += shell.velX * delta;
    shell.y += shell.velY * delta;

    for (var playerI in players) {
      const player = players[playerI];
      //shell.x = player.x;
      //console.log("------------");
      //console.log("pPos: " + player.x + ", " + player.y + " | " + player.style.radius);
      //console.log("sPos: " + shell.x + ", " + shell.y + " | " + shell.style.radius);
      //console.log("p: " + player.id + " s: " + shell.playerId);
      if (player.id == shell.playerId) {
        //console.log("1");
        continue;
      }
      if (!(player.x < shell.x + shell.radius)) {
        //console.log("pX: " + player.x + " sX: " + shell.x + " fX: " + (shell.x + shell.radius));
        //console.log("2");
        continue;
      }
      if (!(player.x + player.radius > shell.x)) {
        //console.log("fX: " + (player.x + player.size) + " sX: " + shell.x);
        //console.log("3");
        continue;
      }
      if (!(player.y < shell.y + shell.radius)) {
        //console.log("4");
        continue;
      }
      if (player.y + player.radius > shell.y) {

        //console.log("Collision");
        player.velX = shell.velX;
        player.velY = shell.velY;
        shells.splice(i, 1);
        break;
      }
    }
  }

  for (var i in players) {
    const dataSocket = sockets[i];
    const player = players[i];
    dataSocket.socket.emit('update',
    players,
    shells,
    shell_map,
    player.x,
    player.y);
  }
}

setInterval(updateServer, 1);
setInterval(updateShells, 4000);
