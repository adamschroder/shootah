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

io.sockets.on('connection', function (socket) {

  socket.on('userJoined', function (data) {

    var user = createUser(socket, data);
    io.sockets.emit('join', user);

    // send other players to this joining player
    for (var player in users) {
      if (users[player].id !== user.id) {
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
});

monsterdirector.on('move', function (data) {
  io.sockets.emit('move', data);
});

monsterdirector.on('killedMonster', function (id) {

  io.sockets.emit('killedMonster', id);
});

function updateUserCount () {

  var count = Object.keys(users).length;
  monsterdirector.updateUserCount(count);
}

function hitUser (data) {

  console.log(sessionIds[data.id], data.id);

  var user = users[sessionIds[data.id]];
  if (user) {
    user.health -= data.damage;
    if (user.health <= 0) {
      delete users[user.id];
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
  data = data || {};
  // if the user existed sometime before
  console.log('creating user', data.id, sessionIds[data.id]);
  if (sessionIds[data.id]) {

    // remap old data
    userData = users[sessionIds[data.id]];
    userData.socketId = socket.id;
    sessionIds[data.id] = socket.id;
  }
  else {
    var eyeColors = ['#422d0f', '#2c92f0', '#43bb45'];
    var id = getUID();
    // create new data
    userData = {
      'id': id,
      'socketId': socket.id,
      'x': Math.random()*200,
      'y': Math.random()*200,
      'width': 50,
      'height': 50,
      'speed': 200,
      'color': '#'+Math.floor(Math.random()*16777215).toString(16),
      'health': 10,
      'eyeColor': eyeColors[Math.floor(Math.random()*eyeColors.length)],
      'pantsColor': '#'+Math.floor(Math.random()*16777215).toString(16),
      'facing':'down'
    };

    sessionIds[userData.id] = socket.id;
  }

  // keep a map of the users data
  users[userData.socketId] = userData;

  return userData;
}

function getUID () {

  var id = Math.random();
  while (sessionIds[id]) {
    id = Math.random();
  }
  return id;
}
