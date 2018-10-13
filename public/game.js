// Make connection
const socket = io.connect('localhost:4000');

const canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

const fullContainer = document.getElementById("fullContainer");
const popupWindow = document.getElementById("popMax");
const shellWindow = document.getElementById("shellSlot");

var players = [];
var shells = [];
var shell_map = [];

var cameraX = 0;
var cameraY = 0;

const backgroundImage = new Image();
backgroundImage.src = "/BackGrid.png";
backgroundImage.width = 1000;
backgroundImage.height = 1000;

const sprites = new Image();
sprites.src = "/rpgItems.png";

var mouseX = 0;
var mouseY = 0;

var mapWidth = 1000;
var mapHeight = 1000;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var halfWidth = canvas.width / 2;
var halfHeight = canvas.height / 2;

ctx.strokeStyle = "rgb(0, 200, 0)";

setupChat(socket, form);

function updateSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var halfWidth = canvas.width / 2;
  var halfHeight = canvas.height / 2;
}

document.addEventListener('mousemove', function(event) {
  mouseX = event.clientX;
  mouseY = event.clientY;
  socket.emit("rotation", 0.785398163 + Math.atan2(mouseY - (halfHeight), mouseX - (halfWidth)));
});

document.addEventListener('keydown', function(event) {
  socket.emit('keydown', event.which);
});

document.addEventListener('keyup', function(event) {
  socket.emit('keyup', event.which);
});

document.addEventListener('keypress', function(event) {
  if (event.which == 32) {
    socket.emit('ball', {
      mouseX: mouseX,
      mouseY: mouseY,
      halfX: halfWidth,
      halfY: halfHeight
    });
  }
});

socket.on('onConnect', function() {
  //Handle popup window.
  popupWindow.style.display = "flex";
  fullContainer.style.opacity = 0.4;
});

socket.on('playerDeath', function() {
  //Handle popup window.
  popupWindow.style.display = "flex";
  fullContainer.style.opacity = 0.4;
});

socket.on('pickupShell', function(data) {
  shellWindow.style.background = "red";
});

socket.on('shootShell', function() {
  shellWindow.style.background = "rgba(30, 30, 30, 0.5)"
});

function handlePlayButton() {
  popupWindow.style.display = "none";
  fullContainer.style.opacity = 1;
  //canvas.style.pointerEvents = "all";
  socket.emit('onSpawn');
}

socket.on('update', function(_players, _shells, _shell_map, _cameraX, _cameraY) {
  players = _players;
  shells = _shells;
  shell_map = _shell_map;
  cameraX = _cameraX;
  cameraY = _cameraY;
});

function tick() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var left = cameraX - halfWidth;
  var top = cameraY - halfHeight;
  var right = cameraX + halfWidth;
  var bottom = cameraY + halfHeight;
  ctx.drawImage(
    backgroundImage,
    left,
    top,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  var zeroX = -(cameraX - halfWidth);
  var maxX = mapWidth - (cameraX - halfWidth);
  var zeroY =  -(cameraY - halfHeight);
  var maxY = mapHeight - (cameraY - halfHeight);

  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(zeroX, zeroY);
  ctx.lineTo(zeroX, maxY);
  ctx.moveTo(zeroX, maxY);
  ctx.lineTo(maxX, maxY);
  ctx.moveTo(maxX, maxY);
  ctx.lineTo(maxX, zeroY);
  ctx.moveTo(maxX, zeroY);
  ctx.lineTo(zeroX, zeroY);
  ctx.stroke();
  ctx.closePath();

  ctx.strokeStyle = "rgba(30, 30, 30, 0.2)";
  for (var i in players) {
    const player = players[i];
    if (player == null) {
      continue;
    }
    const x = player.x;
    const y = player.y;
    if ((x < cameraX - halfWidth || x > cameraX + halfWidth)) {
      continue;
    }

    if (y < cameraY - halfHeight || y > cameraY + halfHeight) {
      continue;
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(player.rotation);
    ctx.translate(-(canvas.width / 2), -(canvas.height / 2));
    ctx.drawImage(sprites, 7 * 16, 4 * 16, 16, 16, (x - (cameraX - halfWidth)) - 16, (y - (cameraY - halfHeight)) - 16, player.style.radius, player.style.radius);
    ctx.resetTransform();
    /*ctx.fillStyle = player.style.color;
    ctx.beginPath();
    ctx.arc(x - (cameraX - halfWidth), y - (cameraY - halfHeight), player.style.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
    ctx.stroke();*/
  }

  for (var i in shells) {
    const shell = shells[i];
    const x = shell.x;
    const y = shell.y;
    if ((x < cameraX - halfWidth || x > cameraX + halfWidth)) {
      continue;
    }

    if (y < cameraY - halfHeight || y > cameraY + halfHeight) {
      continue;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(shell.rotation);
    ctx.translate(-(canvas.width / 2), -(canvas.height / 2));
    ctx.drawImage(sprites, 16, 3 * 16, 16, 16, (x - (cameraX - halfWidth)) - 16, (y - (cameraY - halfHeight)) - 16, shell.style.radius, shell.style.radius);
    ctx.resetTransform();

    //ctx.fillStyle = shell.style.color;
    //ctx.beginPath();
    //ctx.arc(x - (cameraX - halfWidth), y - (cameraY - halfHeight), shell.style.radius, 0, 2 * Math.PI);
    //ctx.fill();
    //ctx.closePath();
    //ctx.stroke();
  }

  //ctx.reset();
  for (var i in shell_map) {
    const shell = shell_map[i];
    const x = shell.x;
    const y = shell.y;
    if ((x < cameraX - halfWidth || x > cameraX + halfWidth)) {
      continue;
    }

    if (y < cameraY - halfHeight || y > cameraY + halfHeight) {
      continue;
    }

    ctx.fillStyle = shell.style.color;
    ctx.beginPath();
    ctx.arc(x - (cameraX - halfWidth), y - (cameraY - halfHeight), shell.style.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
    ctx.stroke();
  }

  requestAnimationFrame(tick);
}

tick();