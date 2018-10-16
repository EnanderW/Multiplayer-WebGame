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

var g = 98;
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

var sockets = [];
var shells = [];
var players = [];
var shell_map = [];

io.on('connection', (socket) => {
    console.log('A client has connected.');

    socket.emit('onConnect');

    var id = getCounter();
    var player = new Player(Math.floor(Math.random() * mapWidth), Math.floor(Math.random() * mapHeight), 0, 0, id);
    sockets[id] = {
      socket: socket,
      player: player
    };
    socket.on('onSpawn', function() {
      player = new Player(Math.floor(Math.random() * mapWidth), Math.floor(Math.random() * mapHeight), 0, 0, id);
      players[id] = player;
    });

    socket.on('serverMessage', function(data) {
      for (var i in sockets) {
        var dataSocket = sockets[i];
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

      var dX = data.mouseX - data.halfX;
      var dY = data.mouseY - data.halfY;
      var v = Math.sqrt(dX * dX + dY * dY);
      var velocityX = (dX / v) * 300;
      var velocityY = (dY / v) * 300;

      //player.ballCooldown = Date.now() + 600;
      var shell = new Shell(player.x, player.y, velocityX, velocityY, shells.length, player.id);

      shell.rotation = Math.atan2(dY, dX) + Math.PI / 2;

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

  var shell = {
    x: Math.floor(Math.random() * mapWidth),
    y: Math.floor(Math.random() * mapHeight),
    type: Math.floor(Math.random() * 4) + 1,
    style: {
      color: "red",
      radius: 5
    }};

  shell_map.push(shell);
}

function handleDeath(player) {
  var dataSocket = sockets[player.id];
  dataSocket.socket.emit("playerDeath");
  delete players[player.id];
}

function updateServer() {
  var currentTime = Date.now();
  delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

    for (var i in players) {
      var player = players[i];
      if (player.up) {
        player.y -= 120 * delta;
      }

      if (player.down) {
        player.y += 120 * delta;
      }

      if (player.left) {
        player.x -= 120 * delta;
      }

      if (player.right) {
        player.x += 120 * delta;
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

      if (player.x > mapWidth || player.x < 0 || player.y > mapHeight || player.y < 0) {
        handleDeath(player);
        continue;
      }

      var sizeMap = shell_map.length;
      for (var shellI = 0; shellI < sizeMap; shellI++) {
        var shell = shell_map[shellI];

        var dX = shell.x - player.x;
        var dY = shell.y - player.y;
        var distanceSquared = (dX * dX + dY * dY);
        var rad = (shell.style.radius + player.style.radius);
        if (distanceSquared <= rad * rad) {
          sockets[i].socket.emit('pickupShell', shell.type);
          player.shells++;
          shell_map.splice(shellI, 1);
          break;
        }
      }
    }

    var sizeShells = shells.length;
    for (var i = 0; i < sizeShells; i++) {
      var shell = shells[i];

      shell.x += shell.velX * delta;
      shell.y += shell.velY * delta;
    }

    /*sizeShells = shell_map.length;
    for (var i = 0; i < sizeShells; i++) {
      var shell = shell_map[i];
    }*/

    for (var i in players) {
      var dataSocket = sockets[i];
      var player = players[i];
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
