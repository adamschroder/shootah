var io = require('socket.io').listen(8080);
var monsterdirector = require('./monsterdirector');

io.set("origins = *");
io.set('transports', [
  'websocket'
, 'flashsocket'
, 'htmlfile'
, 'xhr-polling'
, 'jsonp-polling'
]);

io.set('log level', 2);

var userIds = {};
var sessionIds = {}; // sessionIds[id] returns old socket id, from socket id should look up old data
var users = {};
var bullets = {};
var scoreBoard = {};

var rnd = Math.random;
var floor = Math.floor;

io.sockets.on('connection', function (socket) {

  var user = users[socket.id];
  user && (user.isConnected = 1);

  socket.on('userJoined', function (data) {

    var user = createUser(socket, data);
    io.sockets.emit('join', user);

    // send other players to this joining player
    for (var player in users) {
      if (users[player].id !== user.id && !users[player].isDead) {
        socket.emit('join', users[player]);
      }
    }

    updateUserCount();

    for (var bullet in bullets) {
      if (bullets[bullet].owner !== user.id) {
        socket.emit('newBullet', bullets[bullet]);
      }
    }
  });

  socket.on('updateMovement', function (data) {

    io.sockets.emit('move', data);
    users[data.socketId] = data;
    monsterdirector.updateTarget(data);
  });

  socket.on('userRespawn', function (data) {

    var user = users[sessionIds[data.id]];

    user.isDead = 0;
    user.health = 10;
    io.sockets.emit('join', user);
  });

  socket.on('newBullet', function (bullet) {

    io.sockets.emit('newBullet', bullet);
    bullets[bullet.id] = bullet;
  });

  socket.on('killBullet', function (id) {

    io.sockets.emit('killBullet', id);
    bullets[id] && (delete bullets[id]);
  });

  socket.on('hitMonster', function (data) {

    monsterdirector.damageMonster(data);
  });

  socket.on('hitUser', function (data) {

    hitUser(data);
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
  io.sockets.emit('updateScore', scoreBoard);
});

function updateUserCount () {

  var count = Object.keys(users).length;
  monsterdirector.updateUserCount(count);
}

function hitUser (data) {

  var user = users[sessionIds[data.id]];
  if (user) {
    user.health -= data.damage;
    if (user.health <= 0) {
      user.isDead = 1;
      io.sockets.emit('userDeath', user.id);
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
    userData.isDead = 0;
    userData.isConnected = 1;
    userData.health = data.health || 10;
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
      'name': '',
      'socketId': socket.id,
      'x': rnd()*200,
      'y': rnd()*200,
      'width': 50,
      'height': 50,
      'speed': 200,
      'color': '#'+floor(rnd()*16777215).toString(16),
      'health': 10,
      'eyeColor': eyeColors[floor(rnd()*eyeColors.length)],
      'pantsColor': '#'+floor(rnd()*16777215).toString(16),
      'facing':'down',
      'isDead': 0,
      'isConnected': 1
    };

    sessionIds[userData.id] = socket.id;
  }

  // keep a map of the users data
  users[userData.socketId] = userData;
  return userData;
}

function getUID () {

  var id = rnd();
  while (sessionIds[id]) {
    id = rnd();
  }
  return id;
}