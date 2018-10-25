const express = require('express'); // Hämta express dependency
const socket = require('socket.io'); // Hämta socketio dependency
const objects = require('./objects/Entity'); // Hämta klasserna som skapas i objects/Entity.js
const Entity = objects.entity; // Spara Entity klassen så att vi kan använda dem senare i koden genom -> new Entity():
const Player = objects.player; // Spara Player klassen så att vi kan använda dem senare i koden genom -> new Player():
const Shell = objects.shell; // Spara Shell klassen så att vi kan använda dem senare i koden genom -> new Shell():
const Pickup = objects.pickup; // Spara Pickup klassen så att vi kan använda dem senare i koden genom -> new Pickup():

delete objects; // Ta bort objects eftersom vi inte behöver den längre

const g = 108; // Konstant som reducerar hastighets-värdena varje frame
//var delta = 0; // Delta värdet - Tid i sekunder mellan senaste framen
// Om servern börjar "lagga" så kommer inte alla värden bli unreliable utan stanna kvar som de borde
var lastTime = Date.now(); // Tiden i millisekunder då förra framen var

var mapWidth = 1000; // Längden på banan/kartan
var mapHeight = 1000; // Höjden på banan/kartan

var playerAmount = 0; // Antal spelare i spelet

var counter = 0; // Håller reda på idn på spelarna
function getCounter() { // Används för att hämta nya idn, adderar sedan 1 på id för att alla ska olika id.
  return counter++;
}

const app = express(); // Hämta express appen
const server = app.listen(4000, function() { // Lyssna på port 4000
  console.log("Listening on port 4000...");
});
const io = socket(server); // Skapa en socket server
app.use(express.static('public')); // Säg åt express att använda client filerna i "public" mappen -> Den kommer leta efter index.html

const sockets = []; // Array för att spara alla sockets
const shells = []; // Array för att hålla reda på alla shells på banan
const players = []; // Array för att hålla reda på alla spelare på banan
const pickup_map = []; // Array för att håla reda på alla pickups på banan (Powerups, shells etc)

io.on('connection', (socket) => { // Körs när en datorn ansluter till servern
    console.log('A client has connected.'); // Notera server-administratören om att en client har anslutit

    socket.emit('onConnect'); // Skicka tillbaka ett anslutnings meddelande till clienten för att förbereda allt

    const id = getCounter(); // Hämta ett id för den nya spelaren
    const player = new Player(Math.floor(Math.random() * mapWidth), Math.floor(Math.random() * mapHeight), 112, 64, 0, 0, id); //Skapa den nya spelaren efter Player klassen som skapades i Entity.js
    playerAmount++; // Addera 1 på playerAmount för att det har skapats en ny spelare
    sockets[id] = { // Lägga till ett player-socket object i sockets arrayen
      socket: socket, // Socketen som skickas in av socket.io
      player: player
    };
    socket.on('onSpawn', function() { // När clienten skickar ett "onSpawn" meddelande kommer denna funktion köras
      player.x = Math.floor(Math.random() * mapWidth); // Anse nya x och y värden för spelaren
      player.y = Math.floor(Math.random() * mapHeight);
      player.velX = 0;
      player.speed = 150;
      player.shells = 0;
      player.shellRound = 1;
      player.shieldCooldownAdd = 2500;
      player.shieldCooldown = 0;
      player.velocityReducer = 1;
      player.shield = false;
      player.velY = 0;
      players[id] = player; // Lägg tillbaka spelaren i players arrayen
    });

    socket.on('serverMessage', function(data) { // När clienten skickar ett "serverMessage" meddelande kommer denna funktion köras
    // När du skickar ett chat meddelande så skickar clienten det meddelandet
      for (let i in sockets) { // Loopa igenom alla sockets och skicka ett meddelande till dem om att någon har skickat ett chat meddelande
        const dataSocket = sockets[i];
        dataSocket.socket.emit('clientMessage', data);
      }
    });

    socket.on('disconnect', function() { // När någon disconnectar så körs denna funktion
      delete sockets[id]; //Ta bort socket och spelare ifrån listorna och subtrahera 1 ifrån playerAmount
      delete players[id];
      playerAmount--;
    });

    socket.on('rotation', function (data) { // När en spelare rör musen körs denna och skickar in rotationen ifrån origin
      player.rotation = data; // Sätt rotationen till server-spelarens rotation
    });
    socket.on('keydown', function(data) { // När en spelare trycker på en knapp körs denna funktion
      switch(data) { // Kolla vilka knappar de tryckte på och välj action
        case 5: // 1: right 2: left 3: down 4: up 5: shield
          const now = Date.now();
          if (player.shieldCooldown - now <= 0) {
            player.shield = true;
            if (player.shield) {
              setTimeout(function() {
                player.shield = false;
              }, player.shieldCooldownAdd);
            }
            player.shieldCooldown = now + 10000;
          }
          break;
        case 1:
          player.right = true;
          break;
        case 2:
          player.left = true;
          break;
        case 3:
          player.down = true;
          break;
        case 4:
          player.up = true;
          break;
      }
    });

    socket.on('keyup', function(data) { // Samma som över men kolla om de släpper en knapp
      switch(data) {
        case 1:
          player.right = false;
          break;
        case 2:
          player.left = false;
          break;
        case 3:
          player.down = false;
          break;
        case 4:
          player.up = false;
          break;
      }
    });

    socket.on('ball', function(data) { // När de vill skjuta en shell körs denna funktion
      if (player.shells <= 0 || player.shield) { // Kolla om de har några shells att skjuta, om inte: avsluta
        return;
      }

      /*
      - Räkna ut en normaliserad vektor av deras mus position som en vektor.
      - Loopa igenom deras shell-buff för att ta reda på hur många shells man skall skicka iväg
      och åt vilken riktning
      */
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
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const velocityX = oX * cos - oY * sin;
        const velocityY = oX * sin + oY * cos;
        const shell = new Shell(player.x + 2, player.y + 2, 16, 48, velocityX, velocityY, shells.length, 1, player.id);
        shell.rotation = Math.atan2(velocityY, velocityX) + (Math.PI / 2);
        shells.push(shell);
        /*
        Ta bort shellen efter 3 sekunder
        */
        setTimeout(function() {
          shells.splice(shells.indexOf(shell), 1);
        }, 3000);
      }

      socket.emit('shootShell'); // Skicka ett respons-meddelande till clienten för att visa att de har skjutit iväg en shell
      player.shells--; // Minska antalet shells spelaren har
    });
});

function updateShells() { // Körs var 4:e sekund för att försöka spawna pickup-shells
  if (pickup_map.length >= playerAmount) { // Kolla om det finns mer pickups än spelare, om det är så: avsluta
    return;
  }

  const x = Math.floor(Math.random() * mapWidth); // Anse slumpad position för pickupen vi skall skapa
  const y = Math.floor(Math.random() * mapHeight);
  const radius = 5;

  const onPickup = function(player) { // Anse vad som skall hända när en spelare plockar upp den
    if (player.shield) {
      player.shield = false;
      player.shieldCooldown = Date.now() + 10000;
    }

    player.shells++;
    sockets[player.id].socket.emit('pickupShell');
  }

  // 32: Vilken position på bilden den skall börja rita (sprites)
  // Samma med 48-

  const shell = new Pickup(x, y, 32, 48, radius, 0, onPickup); // Skapa pickupen och skicka in värdena

  pickup_map.push(shell); // Lägg till den skapade pickupen i arrayen
}

function handleDeath(player) { // Hanterar vad som skall hända när en spelare hamnar utanför banan
  const dataSocket = sockets[player.id]; // Hämta socket object ifrån arrayen
  dataSocket.socket.emit("playerDeath"); // Skicka ett meddelande till clienten som säger att de har dött
  delete players[player.id]; // Ta bort deras spelare ifrån spelet
}

function updateServer() { // Körs varje frame (så ofta den kan) Hanterar all movemement och alla uppdateringar
  const currentTime = Date.now(); // Hämta den nuvarande tiden i millisekunder
  const delta = (currentTime - lastTime) / 1000; // Räkna ut delta värde
  lastTime = currentTime; // Sätt lastFrame till den nuvarande tiden för att kunna använda den nästa frame

  for (let i in players) { // Loopa igenom alla spelare för att uppdatera värden
    const player = players[i];
    const speed = player.speed;
    if (!(Math.abs(player.velX) > 0.2 || Math.abs(player.velY) > 0.2)) { // Om de har blivit prickade av en shell -> Hindra dem ifrån att röra sig med kontrollerna
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

    if (player.shield) {
      player.x += player.velX * 0.7 * delta;
      player.y += player.velY * 0.7 * delta;
    } else {
      player.x += player.velX * delta;
      player.y += player.velY * delta;
    }

    /*
    Om de är utanför skärmen -> DIE!
    */
    if (player.x + player.radius > mapWidth || player.x < 0 || player.y + player.radius > mapHeight || player.y < 0) {
      handleDeath(player);
      continue;
    }

    const sizeMap = pickup_map.length;
    for (let pickupI = 0; pickupI < sizeMap; pickupI++) { // Loopa igenom alla pickups för att kolla om det är en spelare som plockar upp en
      const pickup = pickup_map[pickupI];

      if (pickup.type != 0) { // Kolla om pickupen är en shell eller powerup
        // Om det är en powerup -> Kolla om spelaren redan har en powerup aktiv
        // Om de har det -> ignorera att de kanske plockar upp den
        if (player.speed > 150) {
          continue;
        }

        if (player.shieldCooldownAdd > 2500) {
          continue;
        }

        if (player.shellRound > 1) {
          continue;
        }

        if (player.velocityReducer < 1) {
          continue;
        }
      }

      // Om de kan plocka upp den -> Kolla om den är tillräckligt nära för att kunna plockas upp

      const dX = pickup.x - player.x;
      const dY = pickup.y - player.y;
      const distanceSquared = (dX * dX + dY * dY); // Distansen^2 (Pytagoras sats utan roten ur)
      const rad = (pickup.radius + player.radius);
      if (distanceSquared <= rad * rad) { // Om de nuddar varandra kan den plockas upp
        pickup.onPickup(player); // Kör funktionen som väljder vad som skall hända
        switch(pickup.type) {
          case 1:
            sockets[player.id].socket.emit('buff', {time: 6000, text: "Speed"});
            break;
          case 2:
            sockets[player.id].socket.emit('buff', {time: 10000, text: "Shield"});
            break;
          case 3:
            sockets[player.id].socket.emit('buff', {time: 10000, text: "Shell"});
            break;
          case 4:
            sockets[player.id].socket.emit('buff', {time: 8000, text: "Velocity"});
            break;
        }

        pickup_map.splice(pickupI, 1); // Ta bort pickupen ifrån arrayen
        break;
      }
    }
  }

  const sizeShells = shells.length;
  for (let i = 0; i < sizeShells; i++) { // Loopa igenom alla shells för att uppdatera värden
    const shell = shells[i];

    if (shell == null) {
      continue;
    }

    shell.x += shell.velX * delta;
    shell.y += shell.velY * delta;

    for (let playerI in players) { // Loopa igenom alla spelare för att kolla collision
      const player = players[playerI];
      if (player.shield) { // Om spelaren har en sköld kan vi ignorera
        continue;
      }

      if (player.id == shell.playerId) { // Om shellen nuddar spelaren som skjöt iväg den kan vi också ignorera
        continue;
      }

      if ((player.x < shell.x + shell.radius) &&
      (player.x + player.radius > shell.x) &&
      (player.y < shell.y + shell.radius) &&
      (player.y + player.radius > shell.y)) {
        // Nu är den kollision, vi gör så att spelaren flyger iväg och tar bort shellen ifrån arrayen
        player.velX += shell.velX * player.velocityReducer;
        player.velY += shell.velY * player.velocityReducer;
        shells.splice(i, 1);
        break;
      }
    }
  }

  for (let i in players) { // Loopa igenom alla spelare igen för att skicka de uppdaterade värden så att de kan rita ut dem på skärmen
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

function updatePowerups() { // Hanterar alla powerups
  const nextTime = Math.round(Math.random() * (20000 - (playerAmount * 1000))) + 1000; // Skapar ett random värde

  if (pickup_map.length > playerAmount) { //Kolla om det finns mer pickups än spelare, om det gör det: avslut
    setTimeout(updatePowerups, nextTime); // Säg åt servern att köra metoden igen om en viss tid som är slumpad
    return;
  }

  const x = Math.floor(Math.random() * mapWidth); // Ange slumpad position
  const y = Math.floor(Math.random() * mapHeight);
  const radius = 5;

  const type = Math.floor(Math.random() * 4) + 1; // Säg vilken typ av powerup det skall vara
  var sX = 0; // Vart på spriten den skall börja rita
  var sY = 0;
  var onPickup;
  switch(type) { //KOlla vilken typ det var och ange rätt funktion efter det
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
        player.shieldCooldownAdd = 3500;
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

  const pickup = new Pickup(x, y, sX, sY, radius, type, onPickup); // Skapa pickupen
  pickup_map.push(pickup); // Lägg till den i spelet
  setTimeout(updatePowerups, nextTime); // Kör metoden i gen efter en slumpad tid
}

setTimeout(updatePowerups, 10000); // Starta powerup-loopen efter 10 sekunder
setInterval(updateServer, 1); // Kör uppdaterings-loopen så ofta den kan
setInterval(updateShells, 4000); // Kör shells funktionen var 4:e sekund
