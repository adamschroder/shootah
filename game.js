// var socket = io.connect('http://192.168.2.95:8080');
var socket = io.connect('http://localhost:8080');
var sessionId;
socket.on('join', function (data) {

  sessionId = socket.socket.sessionid;
  console.log(sessionId)
});

socket.on('userJoined', function (data) {

  console.log(data)
});

socket.on('move', function (data) {

  var spriteToUpdate = sprites[data.id];
  spriteToUpdate.x = data.x;
  spriteToUpdate.y = data.y;
});

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

var mySprite = {};
var keysDown = {};
var sprites = {};

window.addEventListener('keydown', function (e) {

  keysDown[e.keyCode] = true;
});

window.addEventListener('keyup', function (e) {

  delete keysDown[e.keyCode];
});


function update (mod) {

  var offset = Object.keys(keysDown).length !== 0 && mySprite.speed * mod;

  if (37 in keysDown && checkBounds()) {

    mySprite.x -= offset;
    socket.emit('updateMovement', mySprite);
  }
  if (38 in keysDown && checkBounds()) {

    mySprite.y -= offset;
    socket.emit('updateMovement', mySprite);
  }
  if (39 in keysDown && checkBounds()) {

    mySprite.x += offset;
    socket.emit('updateMovement', mySprite);
  }
  if (40 in keysDown && checkBounds()) {

   mySprite.y += offset;
   socket.emit('updateMovement', mySprite);
  }
}


function checkBounds () {

  if (mySprite.x <= 0 || mySprite.y <= 0) {

    mySprite.x = mySprite.x + 1;
    mySprite.y = mySprite.y + 1;
    return false;
  }

  if (mySprite.x >= 750|| mySprite.y >= 550) {

    mySprite.x = mySprite.x - 1;
    mySprite.y = mySprite.y - 1;
    return false;
  }

  return true;
}


function render () {

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (sprite in sprites) {

    if (!sprites.hasOwnProperty(sprite)) {

      continue;
    }
    ctx.fillStyle = sprites[sprite].color;
    ctx.fillRect(sprites[sprite].x, sprites[sprite].y, sprites[sprite].width, sprites[sprite].height);
  }
}


function run () {

  update((Date.now() - time) / 1000);
  render();
  time = Date.now();
}

var time = Date.now();
setInterval(run, 10);
