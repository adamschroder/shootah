// var socket = io.connect('http://192.168.2.95:8080');
var socket = io.connect('http://localhost:8080');

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

var scoreCanvas = document.getElementById('score');
var scoreCtx = scoreCanvas.getContext('2d');
scoreCanvas.width = 800;
scoreCanvas.height = 100;

var mod;
var sessionId, userData;
var userId;
var users = {};
var bullets = {};
var ids = [];
var monsters = {};
var keysDown = {};
var scores = {};

try {
  userData = JSON.parse(window.localStorage.getItem('user'));
  userData.isDead = false;
  userData.health = 10;
}
catch (e) {}

// server events

socket.emit('userJoined', userData);

socket.on('join', function (data) {

  sessionId = socket.socket.sessionid;
  if (data.socketId === sessionId) {

    window.localStorage.setItem('user', JSON.stringify(data));
    userData = data;
    userId = data.id;
    // start on next available frame
    window.requestAnimationFrame(run);
  }

  users[data.id] = data;
});

function updatePositions (list) {

  var data, id;

  for (var key in list) {
    data = list[key];
    id = data.id;

    var isMonster = data.type === 'monster';
    var mover = isMonster ? monsters[id] : users[id];
    if (mover && id !== userData.id) {
      mover.x = data.x;
      mover.y = data.y;
    }

    isMonster ? (monsters[id] = data) : mover && (mover.facing = data.facing);
  }
}

socket.on('move', function (data) {

  if (data.id) {

    var list = {};
    list[data.id] = data;
    updatePositions(list);
  }
  else {
    updatePositions(data);
  }
});

socket.on('newBullet', function (data) {

  if (!bullets[data.id]) {
    bullets[data.id] = data;
  }
});

socket.on('killBullet', function (id) {

  bullets[id] && (delete bullets[id]);
});

socket.on('killedMonster', function (id) {

  monsters[id] && (delete monsters[id]);
});

socket.on('userDamaged', function (data) {

  var user = users[data.id];
  if (user) {
    user.health = data.health;
  }
});

socket.on('userDeath', function (id) {

  var user = users[id];
  id !== userId && user && delete users[id];
  // todo animation of user death?
});

socket.on('updateScore', function (_scores) {
  scores = _scores;
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

// rate limiting
var canShoot = true;
var bulletTimer = setInterval(function () {
  canShoot =  true;
}, 150);

var canTakeDamage = true;
var damageTimer = setInterval(function () {
  canTakeDamage =  true;
}, 500);


function checkUserCollisions () {

  if (!canTakeDamage) {
    return;
  }
  else {
    canTakeDamage = false;
  }

  var monster = collidesWithMonster(userData);
  if (monster) {

    userData.health -= monster.damage;
    (userData.health <= 0) && (userData.isDead = true) && console.log('you dead');
    socket.emit('hitUser', {'id': userData.id, 'damage': monster.damage});
  }
}

function update () {

  if (userData.isDead) {
    return;
  }

  // movement
  var offset = Object.keys(keysDown).length !== 0 && userData.speed * mod;
  var movement = false;
  if (65 in keysDown && checkBounds()) { // left

    userData.x -= offset;
    movement = true;
  }
  else if (87 in keysDown && checkBounds()) { // down

    userData.y -= offset;
    movement = true;
  }
  else if (68 in keysDown && checkBounds()) { // right

    userData.x += offset;
    movement = true;
  }
  else if (83 in keysDown && checkBounds()) { // up

   userData.y += offset;
   movement = true;
  }
  movement && socket.emit('updateMovement', userData);

  // aiming
  var aiming = false;
  if (38 in keysDown && 37 in keysDown) {

    userData.facing = 'up-left';
    aiming = true;
  }
  else if (40 in keysDown && 37 in keysDown) {

    userData.facing = 'down-left';
    aiming = true;
  }
  else if (38 in keysDown && 39 in keysDown) {

    userData.facing = 'up-right';
    aiming = true;
  }
  else if (40 in keysDown && 39 in keysDown) {

    userData.facing = 'down-right';
    aiming = true;
  }
  else if (38 in keysDown) {

    userData.facing = 'up';
    aiming = true;
  }
  else if (37 in keysDown) {

    userData.facing = 'left';
    aiming = true;
  }
  else if (39 in keysDown) {

    userData.facing = 'right';
    aiming = true;
  }
  else if (40 in keysDown) {

    userData.facing = 'down';
    aiming = true;
  }
  aiming && socket.emit('updateMovement', userData);

  // space
  if (32 in keysDown) {

    if (canShoot) {

      var bullet = new Bullet(userData.x, userData.y + (userData.width / 2), userData.facing, userData.id);
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

  if (userData.x >= 760) {

    userData.x = userData.x - 5;

    return false;
  }

  if (userData.y >= 500) {

    userData.y = 490;
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
  b.width = 5;
  b.height = 5;
  b.direction = direction;
  b.speed = 500;
}

function updateBullet (b) {

  var dir = b.direction;
  var spd = b.speed;
  if (dir === 'up') {
    b.y -= spd * mod;
  }
  else if (dir === 'up-left') {
    b.y -= spd * mod;
    b.x -= spd * mod;
  }
  else if (dir === 'up-right') {
    b.y -= spd * mod;
    b.x += spd * mod;
  }
  else if (dir === 'down') {
    b.y += spd * mod;
  }
  else if (dir === 'down-left') {
    b.y += spd * mod;
    b.x -= spd * mod;
  }
  else if (dir === 'down-right') {
    b.y += spd * mod;
    b.x += spd * mod;
  }
  else if (dir === 'left') {
    b.x -= spd * mod;
  }
  else if (dir === 'right') {
    b.x += spd * mod;
  }

  // only manage bullet collision for self
  if (b.owner === userId) {

    var shooter = b.owner;

    var isInbounds = isOnBoard(b);

    if (!isInbounds) {

      delete bullets[b.id];
      socket.emit('killBullet', b.id);
      return;
    }

    var user = collidesWithUser(b);
    if (user) {
      user.health -= 1;
      (user.health <= 0) && (delete users[user.id]);
      socket.emit('hitUser', {
        'id': user.id,
        'damage': 1,
        'shooter': shooter
      });
    }
    var monster = collidesWithMonster(b);
    if (monster) {
      monster.health -= 1;
      (monster.health <= 0) && (delete monsters[monster.id]);
      socket.emit('hitMonster', {
        'id': monster.id,
        'damage': 1,
        'shooter': shooter
      });
    }

    if (user || monster) {

      delete bullets[b.id];
      socket.emit('killBullet', b.id);
    }
  }
}

function doBoxesIntersect (a, b) {

  var wa = a.width + a.x;
  var wb = b.width + b.x;

  if (b.x > wa || a.x > wb) return false;

  var ha = a.height + a.y;
  var hb = b.height + b.y;
  if (b.y > ha || a.y > hb) return false;

  return true;
}


function collidesWithUser (obj) {

  var thisUser;
  var collide;

  for (var user in users) {

    thisUser = users[user];
    if (thisUser.id === userId) {continue;}
    collide = doBoxesIntersect(obj, thisUser);

    if (collide) {
      console.log('hit', thisUser);
      return thisUser;
    }
  }
  return false;
}

function collidesWithMonster (obj) {

  var thisMonster;
  var collide;
  for (var monster in monsters) {
    thisMonster = monsters[monster];
    collide = doBoxesIntersect(obj, thisMonster);
    if (collide) {
      console.log('hit', thisMonster);
      return thisMonster;
    }
  }
  return false;
}

function isOnBoard (obj) {

  if (obj.x > 800 || obj.y > 600 || obj.x < 0 || obj.y < 0) {
    return false;
  }
  return true;
}

// load images (KEEP THIS OUT OF THE RENDER LOOP OMG!)
var patternImg = new Image();
var pattern;
patternImg.onload = function () {

  pattern = ctx.createPattern(patternImg, 'repeat');
};
patternImg.src = 'images/grass3.jpg';

var monsterImage = new Image();
monsterImage.src = 'images/monster-right.png';

var image = new Image();


// DO NOT CREATE OBJECTS IN HERE!
function render () {

  scoreCtx.fillStyle = '#f00';
  scoreCtx.fillRect(0, 0, scoreCanvas.width, scoreCanvas.height);

  // ctx.fillStyle = '#000';

  // BG
  if (pattern) {
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = pattern;
    ctx.fill();
  }
  
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  var monster;
  for (var id in monsters) {
    monster = monsters[id];
    // ctx.fillStyle = '#fff';
    ctx.drawImage(monsterImage, monster.x, monster.y, monster.width, monster.height);
    //ctx.fillRect(monster.x, monster.y, monster.width, monster.height);
  }

  var thisBullet;
  for (var bullet in bullets) {

    if (bullets.hasOwnProperty(bullet)) {

      thisBullet = bullets[bullet];
      if (thisBullet) {
        updateBullet(thisBullet);

        thisBullet && (ctx.fillStyle = '#d62822');
        thisBullet && (ctx.fillRect(thisBullet.x, thisBullet.y, 3, 3));

        thisBullet && (ctx.fillStyle = '#f2b830');
        thisBullet && (ctx.fillRect(thisBullet.x + 4, thisBullet.y, 3, 3));
      }
    }
  }

  for (var user in users) {

    colorSprite(ctx, users[user]);

    // dis is the white line for facing
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    image.src = 'images/blank-character-right.png';

    switch (users[user].facing) {
      case 'up':
        ctx.moveTo(users[user].x, users[user].y - 5);
        ctx.lineTo(users[user].x + 50, users[user].y - 5);
      break;
      case 'up-left':
        ctx.moveTo(users[user].x - 25, users[user].y + 20);
        ctx.lineTo(users[user].x + 20, users[user].y - 25);
      break;
      case 'down':
        ctx.moveTo(users[user].x , users[user].y + 55);
        ctx.lineTo(users[user].x + 50, users[user].y + 55);
      break;
      case 'down-left':
        ctx.moveTo(users[user].x - 30, users[user].y + 35);
        ctx.lineTo(users[user].x + 25, users[user].y + 70);
      break;
      case 'left':
        ctx.moveTo(users[user].x - 5, users[user].y);
        ctx.lineTo(users[user].x - 5, users[user].y + 50);
        image.src = "images/blank-character-left.png";
      break;
      case 'right':
        ctx.moveTo(users[user].x + 55, users[user].y);
        ctx.lineTo(users[user].x + 55, users[user].y + 50);
        image.src = "images/blank-character-right.png";
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

    ctx.drawImage(image, users[user].x, users[user].y, 50, 50);

    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  var offset = 0;
  image.src = 'images/blank-character-right.png';

  for (var player in scores) {
    scoreCtx.font = "30px Arial";
    scoreCtx.fillText('' + scores[player], 25, 0);
    scoreCtx.drawImage(image, offset, 0, 50, 50);
    
    // offset += 50;
    // console.log('SCR', player, scores[player])
  }
}

function colorSprite (ctx, user) {

  var offset = user.facing === 'left' ? 19: 11;

  ctx.fillStyle = user.color;
  ctx.fillRect(user.x + offset,  user.y + 25, 20, 10); // shirt
  ctx.fillStyle = user.eyeColor;
  ctx.fillRect(user.x + offset + 1, user.y + 10, 18, 10); // eyes
  ctx.fillStyle = user.pantsColor;
  ctx.fillRect(user.x + offset + 2,  user.y + 35, 16, 5); // pants
}

function run () {

  mod = (Date.now() - time) / 1000;

  checkUserCollisions();
  update();
  render();
  time = Date.now();

  // loop on next available frame
  window.requestAnimationFrame(run);
}
var time = Date.now();