// var socket = io.connect('http://192.168.2.95:8080');
var socket = io.connect('http://localhost:8080');

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

var mod;
var sessionId, userData;
var users = {};
var bullets = {};
var ids = [];
var monsters = {};
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

  isMonster ? (monsters[data.id] = data): mover.facing = data.facing;
});

socket.on('newBullet', function (data) {

  console.log('new bullet', data);

  if (!bullets[data.id]) {
    bullets[data.id] = data;
  }
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

var canShoot = false;
var bulletTimer = setInterval(function () {
  canShoot =  true;
}, 300);

function update () {

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

  if (38 in keysDown && 37 in keysDown) {

    userData.facing = 'up-left';
    socket.emit('updateMovement', userData);
  }

  if (40 in keysDown && 37 in keysDown) {

    userData.facing = 'down-left';
    socket.emit('updateMovement', userData);
  }

  if (38 in keysDown && 39 in keysDown) {

    userData.facing = 'up-right';
    socket.emit('updateMovement', userData);
  }


  if (40 in keysDown && 39 in keysDown) {

    userData.facing = 'down-right';
    socket.emit('updateMovement', userData);
  }

  // space
  if (32 in keysDown) {

    if (canShoot) {

      var bullet = new Bullet(userData.x, userData.y, userData.facing, userData.id);
      bullets[bullet.id] = bullet;
      socket.emit('newBullet', bullet);
    }

    canShoot = false;
  }
}

function getUID () {

  var id = Math.random();
  while (ids[id]) {
    id = Math.random();
  }
  ids[id] = 1;
  return id;
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

  var b = this;
  b.owner = owner;
  b.id = owner + getUID();
  b.x = x;
  b.y = y;
  b.direction = direction;
  b.speed = 500;
}

function updateBullet (b) {

  var dir = b.direction;
  var spd = b.speed;
  if (dir === 'up') {
    b.y -= spd * mod;
  }
  else if (dir === 'down') {
    b.y += spd * mod;
  }
  else if (dir === 'left') {
    b.x -= spd * mod;
  }
  else if (dir === 'right') {
    b.x += spd * mod;
  }
}

function render () {

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var user in users) {

    ctx.fillStyle = users[user].color;
    ctx.fillRect(users[user].x, users[user].y, users[user].width, users[user].height);
    ctx.strokeStyle = "white";
    ctx.beginPath();

    switch (users[user].facing) {
      case 'up':
        ctx.moveTo(users[user].x, users[user].y - 5);
        ctx.lineTo(users[user].x + 50, users[user].y - 5);
      break
      case 'up-left':
        ctx.moveTo(users[user].x - 25, users[user].y + 20);
        ctx.lineTo(users[user].x + 20, users[user].y - 25);
      break;
      case 'down':
        ctx.moveTo(users[user].x , users[user].y + 55);
        ctx.lineTo(users[user].x + 50, users[user].y + 55);
      break
      case 'down-left':
        ctx.moveTo(users[user].x - 30, users[user].y + 35);
        ctx.lineTo(users[user].x + 25, users[user].y + 70);
      break;
      case 'left':
        ctx.moveTo(users[user].x - 5, users[user].y);
        ctx.lineTo(users[user].x - 5, users[user].y + 50);
      break
      case 'right':
        ctx.moveTo(users[user].x + 55, users[user].y);
        ctx.lineTo(users[user].x + 55, users[user].y + 50);
      break;
      case 'up-right':
        ctx.moveTo(users[user].x + 75, users[user].y + 20);
        ctx.lineTo(users[user].x + 25, users[user].y - 25);
      break;
      case 'down-right':
        ctx.moveTo(users[user].x + 70, users[user].y + 25);
        ctx.lineTo(users[user].x + 35, users[user].y + 70);
      break;
    }

    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  var monster = [];

  for (var id in monsters) {

    monster = monsters[id];
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(monster.x, monster.y, monster.width, monster.height);
  }

  var thisBullet;
  for (var bullet in bullets) {

    if (bullets.hasOwnProperty(bullet)) {

      thisBullet = bullets[bullet];
      updateBullet(thisBullet);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(thisBullet.x, thisBullet.y, 5, 5);
    }
  }
}

function run () {

  mod = (Date.now() - time) / 1000;

  update();
  render();
  time = Date.now();

  // loop on next available frame
  window.requestAnimationFrame(run);
}

var time = Date.now();
// start on next available frame
window.requestAnimationFrame(run);
