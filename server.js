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

    for (var bullet in bullets) {

      if (bullets[bullet].owner !== user.id) {
        socket.emit('newBullet', bullets[bullet]);
      }
    }
  });

  socket.on('updateMovement', function (data) {

    io.sockets.emit('move', data);
    users[data.socketId] = data;
  });

  socket.on('newBullet', function (bullet) {

    io.sockets.emit('newBullet', bullet);
    bullets[bullet.id] = bullet;
    console.log('BULLET', bullet);
  });

  monsterdirector.on('move', function (data) {
    io.sockets.emit('move', data);
  });
});


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
      'color': '#'+Math.floor(Math.random()*16777215).toString(16)
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
