var io = require('socket.io').listen(8080);

io.set("origins = *");
  io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
  ]);

io.sockets.on('connection', function (socket) {

  socket.emit('join', { hello: 'world' });

  socket.on('userJoined', function (data) {

    socket.broadcast.emit('userJoined', data);
  });

  socket.on('updateMovement', function (data) {

    socket.broadcast.emit('move', data);
  });
});