const socket = io.connect('10.204.149.4:4000'); // Anslut till servern som vi startade - Om den inte är startad kommer det inte funka

const canvas = document.getElementById("canvas"); // Hämta canvasen ifrån HTML
const ctx = canvas.getContext("2d"); // Hämta 2d context ritnings-funktioner ifrån canvasen

const fullContainer = document.getElementById("fullContainer"); // Hämta några andra HTML element för användning
const popupWindow = document.getElementById("popMax");
const shellWindow = document.getElementById("shellSlot");
const shellAmount = document.getElementById("shellAmount");
const buffDiv = document.getElementById("buffDiv");

var players = []; // Arrays för alla spelare, shells och pickups
var shells = [];
var pickup_map = [];

const controls =  {
  left: false,
  right: false,
  up: false,
  down: false
};

var cameraX = 500; // Spara kamera position så att vi kan rita ut allt på rätt plats
var cameraY = 500;

const backgroundImage = new Image(); // Hämta bakgrund bilden för banan
backgroundImage.src = "/resources/Pattern_2.jpg";
backgroundImage.width = 1000;
backgroundImage.height = 1000;

const sprites = new Image(); // Hämta bilden för alla sprites
sprites.src = "/resources/rpgItems.png";

//var mouseX = 0; // Spara positionen för musen
//var mouseY = 0;

const mapWidth = 1000;
const mapHeight = 1000;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var halfWidth = canvas.width / 2;
var halfHeight = canvas.height / 2;

ctx.strokeStyle = "rgb(0, 200, 0)";

setupChat(socket, form); // Starta chatten som ligger i chat.js

function updateSize() { // Denna funktion körs om användaren byter storlek på sidan
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  halfWidth = canvas.width / 2;
  halfHeight = canvas.height / 2;
}

document.addEventListener('mousemove', function(event) { // Uppdatera rotation när de rör på musen
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  socket.emit("rotation", 0.785398163 + Math.atan2(mouseY - (halfHeight + 20), mouseX - (halfWidth + 20))); // Skicka rotationen i radians till servern
});

document.addEventListener('keydown', function(event) {
  switch(event.which) { // Kolla vilka knappar de tryckte på och välj action
    case 32:
    case 17:
      socket.emit('keydown', 5);
      break;
    case 68:
    case 39:
      if(!controls.right) {
        socket.emit('keydown', 1);
      }
      controls.right = true;
      break;
    case 37:
    case 65:
      if(!controls.left) {
        socket.emit('keydown', 2);
      }
      controls.left = true;
      break;
    case 40:
    case 83:
      if(!controls.down) {
        socket.emit('keydown', 3);
      }
      controls.down = true;
      break;
    case 38:
    case 87:
      if(!controls.up) {
        socket.emit('keydown', 4);
      }
      controls.up = true;
      break;
  }
});

document.addEventListener('keyup', function(event) {
  switch(event.which) { // Kolla vilka knappar de tryckte på och välj action
    case 68:
    case 39:
      socket.emit("keyup", 1);
      controls.right = false;
      break;
    case 37:
    case 65:
      socket.emit("keyup", 2);
      controls.left = false;
      break;
    case 40:
    case 83:
      socket.emit("keyup", 3);
      controls.down = false;
      break;
    case 38:
    case 87:
      socket.emit("keyup", 4);
      controls.up = false;
      break;
  }
});

document.addEventListener('click', function(event) {
    socket.emit('ball', {
      mouseX: event.clientX,
      mouseY: event.clientY,
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
  shellAmount.innerHTML = "0x";
});

socket.on('buff', function(data) {
  buffDiv.innerHTML = data.text;
  setTimeout(function() {
    buffDiv.innerHTML = "";
  }, data.time);
});

socket.on('playerDeath', function() {
  //Handle popup window.
  popupWindow.style.visibility = "visible";
  popupWindow.style.opacity = 1;
  popupWindow.style.pointerEvents = "all";
  fullContainer.style.opacity = 0.4;
  shellAmountCount = 0;
  shellAmount.innerHTML = "0x";
});

var shellAmountCount = 0;

socket.on('pickupShell', function(data) {
  shellAmount.innerHTML = (++shellAmountCount) + "x";
});

socket.on('shootShell', function() {
  shellAmount.innerHTML = (--shellAmountCount) + "x";
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
  shellAmount.innerHTML = "0x";
}

socket.on('update', function(_players, _shells, _pickup_map, _cameraX, _cameraY) {
  players = _players;
  shells = _shells;
  pickup_map = _pickup_map;
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

  //const zeroX = -(cameraX - halfWidth);
  //const maxX = mapWidth - (cameraX - halfWidth);
  //const zeroY = -(cameraY - halfHeight);
  //const maxY = mapHeight - (cameraY - halfHeight);

  /*ctx.strokeStyle = "#000000";
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
  ctx.closePath();*/

  for (let i in players) {
    const player = players[i];
    if (player == null) {
      continue;
    }
    const x = player.x;
    const y = player.y;

    if ((x < left || x > right)) {
      continue;
    }

    if (y < top || y > bottom) {
      continue;
    }

    const halfRadius = player.radius / 2;

    const writeX = x - left;
    const writeY = y - top;
    const rotatedX = writeX + halfRadius;
    const rotatedY = writeY + halfRadius;

    const shield = player.shield;
    if (!shield) {
      ctx.translate(rotatedX, rotatedY);
      ctx.rotate(player.rotation);
      ctx.translate(-rotatedX, -rotatedY);
      ctx.drawImage(sprites, 112, 64, 16, 16, writeX, writeY, player.radius, player.radius);
    } else {
      ctx.translate(rotatedX, rotatedY);
      ctx.rotate(player.rotation + Math.PI / 4);
      ctx.translate(-rotatedX, -rotatedY);
      ctx.drawImage(sprites, 96, 32, 16, 16, writeX, writeY, player.radius, player.radius);
    }
    ctx.resetTransform();
  }

  for (let i in shells) {
    const shell = shells[i];
    const x = shell.x;
    const y = shell.y;

    if ((x < left || x > right)) {
      continue;
    }

    if (y < top || y > bottom) {
      continue;
    }

    const halfRadius = shell.radius / 2;

    const writeX = x - left;
    const writeY = y - top;
    const rotatedX = writeX + halfRadius;
    const rotatedY = writeY + halfRadius;

    ctx.translate(rotatedX, rotatedY);
    ctx.rotate(shell.rotation);
    ctx.translate(-rotatedX, -rotatedY);
    ctx.drawImage(sprites, shell.sX, shell.sY, 16, 16, writeX, writeY, shell.radius, shell.radius);
    ctx.resetTransform();
  }

  for (let i in pickup_map) {
    const pickup = pickup_map[i];
    const x = pickup.x;
    const y = pickup.y;
    if (x < left || x > right) {
      continue;
    }

    if (y < top || y > bottom) {
      continue;
    }

    const writeX = x - left;
    const writeY = y - top;

    ctx.drawImage(sprites, pickup.sX, pickup.sY, 16, 16, writeX, writeY, 30, 30);
  }

  requestAnimationFrame(tick);
}

tick();
