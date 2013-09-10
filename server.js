var host = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

console.log(host, port);

// for deploy on openshift:
// var http = require("http").createServer();
// var io = require("socket.io").listen(http);
// http.listen(port, host);

// for no proxy
var io = require('socket.io').listen(port);

var monsterdirector = require('./monsterdirector');

// CORS, websockets only, less noise in the logs
io.set("origins = *");
io.set('transports', ['websocket']);
io.set('log level', 2);

var userIds = {};
var sessionIds = {}; // sessionIds[id] returns old socket id, from socket id should look up old data
var users = {};
var bullets = {};
var scoreBoard = {};

var deathMessages = [
  'YOU WERE EATEN ALIVE',
  'YOUR FAMILY MOURNS YOUR DEATH',
  'NOOB',
  'WELCOME TO THE AFTERLIFE',
  'OGRES FIND YOU DELICIOUS',
  'YOU BRING DISHONOR TO YOUR NAME',
  'WINTER IS COMING...',
  'THE OGRES DID NOT GO HUNGRY BECAUSE OF YOU',
  'COMMAND + Q FOR POWERUP'
];

var rnd = Math.random;
var floor = Math.floor;

io.sockets.on('connection', function (socket) {

  socket.on('userJoined', function (data) {

    var user = createUser(socket, data);
    // send to all sockets!
    io.sockets.emit('join', user);
    
    // send other players to this joining player
    var otherUser;
    for (var player in users) {
      otherUser = users[player];
      if (otherUser.isConnected && (otherUser.id !== user.id) && !otherUser.isDead) {
        socket.emit('join', otherUser);
      }
    }

    updateUserCount();

    var otherBullet;
    for (var bullet in bullets) {
      otherBullet = bullets[bullet];
      if (otherBullet.owner !== user.id && isAlive(otherBullet.owner)) {
        socket.emit('newBullet', otherBullet);
      }
    }

    sendDisplayableScoreBoard();

    monsterdirector.start();
  });

  socket.on('updateMovement', function (data) {

    if (isAlive(data.id)) {

      // facing
      // x, y

      var user = getUser(data.id);
      if (user) {

        data.x && (user.x = data.x);
        data.y && (user.y = data.y);
        data.facing && (user.facing = data.facing);

        socket.broadcast.emit('move', data);
        monsterdirector.updateTarget(user);
      }
    }
  });

  socket.on('userPickup', function (data) {

    var user = getUser(data.id);
    if (user) {
      user.powerup = data.powerUp;
      if (data.powerUp.type === 'health') {
        user.health = 10;
      }
      io.sockets.emit('userPickup', user.id, data.powerUp);
    }
  });

  socket.on('powerUpEnd', function (data) {

    var user = getUser(data.id);
    user && (user.powerup = '');
  });

  socket.on('userRespawn', function (data) {

    var user = getUser(data.id);
    if (user) {
      user.isConnected = 1;
      user.isDead = 0;
      user.health = 10;
      user.isInvincible = 1;
      io.sockets.emit('join', user);
      timeoutPlayerInvincible(user);
    }
  });

  socket.on('newBullet', function (bullet) {

    if (isAlive(bullet.owner)) {

      socket.broadcast.emit('newBullet', bullet);
      bullets[bullet.id] = bullet;
    }
  });

  socket.on('killBullet', function (id) {

    socket.broadcast.emit('killBullet', id);
    bullets[id] && (delete bullets[id]);
  });

  socket.on('hitMonster', function (data) {

    isAlive(data.shooter) && monsterdirector.damageMonster(data);
  });

  socket.on('hitUser', function (data) {

    (isAlive(data.shooter) || data.fromMonster) && hitUser(data);
  });

  socket.on('disconnect', function (data) {

    var user = users[socket.id];
    user && (user.isConnected = 0);
  });
});

monsterdirector.on('move', function (data) {
  io.sockets.emit('move', data);
});

monsterdirector.on('killedMonster', function (id) {
  io.sockets.emit('killedMonster', id);
});

monsterdirector.on('updateScore', function (user, score) {
  if (!scoreBoard[user]) {
    scoreBoard[user] = 0;
  }
  scoreBoard[user] += score;

  console.log('SCORE', scoreBoard);

  sendDisplayableScoreBoard();
});

function declareWave () {
  monsterdirector.wave && io.sockets.emit('wave', monsterdirector.wave);
}

monsterdirector.on('wave', declareWave);

var shouldSendScoreBoard = 1;
function sendDisplayableScoreBoard () {

  if (shouldSendScoreBoard) {
    var displayableScoreBoard = [];
    var user;
    for (var id in scoreBoard) {

      user = getUser(id);
      if (user) {
        displayableScoreBoard.push({
          'score': scoreBoard[id],
          'name': user.name,
          'color': user.color,
          'id': id
        });
      }
    }

    io.sockets.emit('updateScore', displayableScoreBoard);

    shouldSendScoreBoard = 0;
    setTimeout(function () {
      shouldSendScoreBoard = 1;
    }, 1000);
  }
}

function getUser (userId) {

  var sessionId = sessionIds[userId];
  var user = sessionId && users[sessionId];
  return user;
}

function isAlive (userId) {

  var user = getUser(userId);
  return user && user.isConnected && !user.isDead;
}

function isInvincible (userId) {

  var user = getUser(userId);
  return user && user.isInvincible;
}

function updateUserCount () {

  var count = Object.keys(users).length;
  monsterdirector.updateUserCount(count);
}

function hitUser (data) {

  var user = users[sessionIds[data.id]];
  if (user && !user.isDead && !user.isInvincible) {
    user.health -= data.damage;
    if (user.health <= 0) {
      io.sockets.emit('userDeath', user.id, deathMessages[Math.floor(Math.random()*deathMessages.length)]);
      user.isDead = 1;
      updateUserCount();
    }
    else {
      io.sockets.emit('userDamaged', {
        'id': user.id,
        'health': user.health
      });
    }
  }
}

function createUser (socket, data) {

  var userData = {};
  var sessionId = data && sessionIds[data.id];
  data = data || {};
  // if the user existed sometime before
  if (sessionId) {

    // remap old data
    userData = users[sessionId];
    userData.socketId = socket.id;
    sessionIds[data.id] = socket.id;
    userData.name = data.name;
  }
  else {
    var eyeColors = ['#422d0f', '#2c92f0', '#43bb45'];
    var id = getUID();
    // create new data
    userData = {
      'id': id,
      'type': 'player',
      'name': data.name,
      'socketId': socket.id,
      'x': rnd()*200,
      'y': rnd()*200,
      'width': 50,
      'height': 50,
      'speed': 200,
      'color': '#'+floor(rnd()*16777215).toString(16),
      'eyeColor': eyeColors[floor(rnd()*eyeColors.length)],
      'pantsColor': '#'+floor(rnd()*16777215).toString(16),
      'facing':'down',
      'powerup':''
    };

    sessionIds[userData.id] = socket.id;
  }

  // common / resets
  userData.health = 10;
  userData.isDead = 0;
  userData.isConnected = 1;
  userData.isInvincible = 1;

  // keep a map of the users data
  users[userData.socketId] = userData;
  timeoutPlayerInvincible(userData);
  return userData;
}

function timeoutPlayerInvincible (data) {

  setTimeout(function () {
    data.isInvincible = 0;
    io.sockets.emit('userNotInvincible', data.id);
  }, 2000);
}

setInterval(function () {

  var pwrUpChance = floor(rnd()*100);

  if (pwrUpChance <= 40) {

    spawnShotgun();
  }
  else {

    spawnHealthPack();
  }
}, 10000);

function spawnShotgun () {

  io.sockets.emit('shotgunPowerUpDrop', {
    'id': getUID(),
    'type': 'shotgun',
    'x': floor(rnd()*500),
    'y': floor(rnd()*400),
    'width': 150,
    'height': 45
  });
}

function spawnHealthPack () {

  io.sockets.emit('healthPowerUpDrop', {
    'id': getUID(),
    'type': 'health',
    'x': floor(rnd()*500),
    'y': floor(rnd()*400),
    'width': 45,
    'height': 45
  });
}

function getUID () {

  var id = rnd();
  while (sessionIds[id]) {
    id = rnd();
  }
  return id;
}