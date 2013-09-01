//var socket = io.connect('http://192.168.2.95:8080');
var socket = io.connect('http://localhost:8080');

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

var sessionId, userData;
var users = {};
var monsters = [];
var bullets = [];
var keysDown = {};

try {
  userData = JSON.parse(window.localStorage.getItem('user'));
}
catch (e){}

// server events

socket.emit('userJoined', userData);

socket.on('join', function (data) {

  sessionId = socket.socket.sessionid;
  if (data.socketId === sessionId) {

    window.localStorage.setItem('user', JSON.stringify(data));
    userData = data;
  }

  users[data.id] = data;
});


socket.on('move', function (data) {

  var isMonster = data.type === 'monster';
  var mover = isMonster ? monsters[data.id] : users[data.id];
  if (mover) {
    mover.x = data.x;
    mover.y = data.y;
  }
  // console.log(isMonster, data.id)
  isMonster && (monsters[data.id] = data);
});

// key events
window.addEventListener('keydown', function (e) {
  e.preventDefault();
  keysDown[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {
  e.preventDefault();
  delete keysDown[e.keyCode];
});

// methods
function update (mod) {

  var offset = Object.keys(keysDown).length !== 0 && userData.speed * mod;

  if (65 in keysDown && checkBounds()) { // left

    userData.x -= offset;
    socket.emit('updateMovement', userData);
  }
  if (87 in keysDown && checkBounds()) { // down

    userData.y -= offset;
    socket.emit('updateMovement', userData);
  }
  if (68 in keysDown && checkBounds()) { // right

    userData.x += offset;
    socket.emit('updateMovement', userData);
  }
  if (83 in keysDown && checkBounds()) { // up

   userData.y += offset;
   socket.emit('updateMovement', userData);
  }

  // pointing
  if (38 in keysDown) {

    userData.facing = 'up';
    socket.emit('updateMovement', userData);
  }

  if (37 in keysDown) {

    userData.facing = 'left';
    socket.emit('updateMovement', userData);
  }

  if (39 in keysDown) {

    userData.facing = 'right';
    socket.emit('updateMovement', userData);
  }

  if (40 in keysDown) {

    userData.facing = 'down';
    socket.emit('updateMovement', userData);
  }

  // space
  if (32 in keysDown) {

    var bullet = new Bullet(userData.x, userData.y, userData.facing, userData.id);
    console.log(bullet);
  }
}


function checkBounds () {

  if (userData.x <= 0 || userData.y <= 0) {

    userData.x = userData.x + 1;
    userData.y = userData.y + 1;
    return false;
  }

  if (userData.x >= 750|| userData.y >= 550) {

    userData.x = userData.x - 1;
    userData.y = userData.y - 1;

    return false;
  }

  return true;
}

function Bullet (x, y, direction, owner) {

  this.owner = owner;
  this.x = x;
  this.y = y;
  this.direction = direction;
  this.speed = 400;
}

function render () {

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var user in users) {

    if (!users.hasOwnProperty(user)) {

      continue;
    }

    ctx.fillStyle = users[user].color;
    ctx.fillRect(users[user].x, users[user].y, users[user].width, users[user].height);
    ctx.strokeStyle = "white";

    ctx.beginPath();

    switch (users[user].facing) {
      case 'up':
        ctx.moveTo(users[user].x, users[user].y - 5);
        ctx.lineTo(users[user].x + 50, users[user].y - 5);
      break
      case 'down':
        ctx.moveTo(users[user].x , users[user].y + 55);
        ctx.lineTo(users[user].x + 50, users[user].y + 55);
      break
      case 'left':
        ctx.moveTo(users[user].x - 5, users[user].y);
        ctx.lineTo(users[user].x - 5, users[user].y + 50);
      break
      case 'right':
        ctx.moveTo(users[user].x + 55, users[user].y);
        ctx.lineTo(users[user].x + 55, users[user].y + 50);
      break
    }

    ctx.fill();
    ctx.stroke();
    ctx.closePath();

  }

  var monster = [];
  for (var i = 0, max = monsters.length; i < max; i++) {

  }
}


function run () {

  update((Date.now() - time) / 1000);
  render();
  time = Date.now();

  // loop on next available frame
  window.requestAnimationFrame(run);
}

var time = Date.now();

// start on next available frame
window.requestAnimationFrame(run);
