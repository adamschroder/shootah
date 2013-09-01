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
var sessionIds =[0]; // sessionIds[id] returns old socket id, from socket id should look up old data
var users = {};

io.sockets.on('connection', function (socket) {

  var user = createUser(socket);

  socket.emit('join', user);

  socket.on('userJoined', function (data) {

    socket.broadcast.emit('userJoined', data);
  });

  socket.on('updateMovement', function (data) {

    socket.broadcast.emit('move', data);
  });
});


function createUser (socket, data) {

  var userData = {};

  // if the user existed sometime before

  if (sessionIds[data.id]) {

    // remap old data
    userData = users[sessionIds[data.id]];
    userData.socketId = socket.id;
    sessionIds[data.id] = socket.id;
  }
  else {
    // create new data
    userData = {
      'id': sessionIds.length,
      'socketId': socket.id,
      'x': Math.random()*200,
      'y': Math.random()*200,
      'width': 50,
      'height': 50,
      'speed': 200,
      'color': '#'+Math.floor(Math.random()*16777215).toString(16)
    };

    sessionIds.push(socket.id);
  }

  // keep a map of the users data
  users[userData.socketId] = userData;

  return userData;
}
