// Make connection
const socket = io.connect('10.204.149.4:4000');

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const fullContainer = document.getElementById("fullContainer");
const popupWindow = document.getElementById("popMax");
const shellWindow = document.getElementById("shellSlot");
const shellAmount = document.getElementById("shellAmount");

var players = [];
var shells = [];
var shell_map = [];

var cameraX = 500;
var cameraY = 500;

const backgroundImage = new Image();
backgroundImage.src = "/resources/Pattern_2.jpg";
backgroundImage.width = 1000;
backgroundImage.height = 1000;

const sprites = new Image();
sprites.src = "/resources/rpgItems.png";

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

  halfWidth = canvas.width / 2;
  halfHeight = canvas.height / 2;
}

document.addEventListener('mousemove', function(event) {
  mouseX = event.clientX;
  mouseY = event.clientY;
  socket.emit("rotation", 0.785398163 + Math.atan2(mouseY - (halfHeight + 20), mouseX - (halfWidth + 20)));
});

document.addEventListener('keydown', function(event) {
  socket.emit('keydown', event.which);
});

document.addEventListener('keyup', function(event) {
  socket.emit('keyup', event.which);
});

document.addEventListener('click', function(event) {
    socket.emit('ball', {
      mouseX: mouseX,
      mouseY: mouseY,
      halfX: halfWidth,
      halfY: halfHeight
    });
});

socket.on('onConnect', function() {
  //Handle popup window.
  popupWindow.style.visibility = "visible";
  popupWindow.style.opacity = 1;
  popupWindow.style.pointerEvents = "all";
  fullContainer.style.opacity = 0.4;
  shellAmountCount = 0;
  shellAmount.innerHTML = "x0";
});

socket.on('playerDeath', function() {
  //Handle popup window.
  popupWindow.style.visibility = "visible";
  popupWindow.style.opacity = 1;
  popupWindow.style.pointerEvents = "all";
  fullContainer.style.opacity = 0.4;
  shellAmountCount = 0;
  shellAmount.innerHTML = "x0";
});

var shellAmountCount = 0;

socket.on('pickupShell', function(data) {
  shellAmount.innerHTML = "x" + (++shellAmountCount);
});

socket.on('shootShell', function() {
  shellAmount.innerHTML = "x" + (--shellAmountCount);
});

function handlePlayButton() {
  setTimeout(function() {
    socket.emit('onSpawn');
  }, 950);
  popupWindow.style.visibility = "hidden";
  popupWindow.style.pointerEvents = "none";
  popupWindow.style.opacity = 0;
  fullContainer.style.opacity = 1;
  shellAmountCount = 0;
  shellAmount.innerHTML = "x0";
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
  const left = cameraX - halfWidth;
  const top = cameraY - halfHeight;
  const right = cameraX + halfWidth;
  const bottom = cameraY + halfHeight;
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

  const zeroX = -(cameraX - halfWidth);
  const maxX = mapWidth - (cameraX - halfWidth);
  const zeroY = -(cameraY - halfHeight);
  const maxY = mapHeight - (cameraY - halfHeight);

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

    const halfRadius = player.radius / 2;

    const writeX = (x - (cameraX - halfWidth));
    const writeY = (y - (cameraY - halfHeight));
    const rotatedX = writeX + halfRadius;
    const rotatedY = writeY + halfRadius;

    ctx.translate(rotatedX, rotatedY);
    ctx.rotate(player.rotation);
    ctx.translate(-rotatedX, -rotatedY);
    ctx.drawImage(sprites, (7 * 16), 4 * 16, 16, 16, writeX, writeY, player.radius, player.radius);
    ctx.resetTransform();
    //ctx.beginPath();
    //ctx.strokeStyle = "red";
    //ctx.rect(writeX, writeY, player.style.radius, player.style.radius);
    //ctx.stroke();
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

    const halfRadius = shell.radius / 2;

    const writeX = (x - (cameraX - halfWidth));
    const writeY = (y - (cameraY - halfHeight));
    const rotatedX = writeX + halfRadius;
    const rotatedY = writeY + halfRadius;

    ctx.translate(rotatedX, rotatedY);
    ctx.rotate(shell.rotation);
    ctx.translate(-rotatedX, -rotatedY);
    ctx.drawImage(sprites, 16, 3 * 16, 16, 16, writeX, writeY, shell.radius, shell.radius);
    ctx.resetTransform();
    //ctx.rect(writeX, writeY, shell.style.radius, shell.style.radius);
    //ctx.stroke();
  }

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

    const writeX = (x - (cameraX - halfWidth));
    const writeY = (y - (cameraY - halfHeight));

    ctx.drawImage(sprites, 32, 3 * 16, 16, 16, writeX, writeY, 30, 30);
    //ctx.rect(writeX, writeY, 30, 30);
    //ctx.stroke();
  }

  requestAnimationFrame(tick);
}

tick();
