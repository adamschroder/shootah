
// make the game private, no cheaters!
(function () {
  var socket = io.connect('http://192.168.2.95:8080');
  //var socket = io.connect('http://localhost:8080');

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;

  var respawn = document.getElementById('r');

  var mod, sessionId, userData, userId, t;
  var users = {};
  var bullets = {};
  var ids = {};
  var monsters = {};
  var keysDown = {};
  var scores = {};
  var timed = 0;

  var time = Date.now();

  try {
    userData = JSON.parse(window.localStorage.getItem('user'));
    userData.isDead = 0;
    userData.health = 10;

    if (!userData.name) {
      canvas.style.display = 'none';
      document.getElementById('c').style.display = 'block';
      document.getElementById('submit').addEventListener('click', function () {

        var val = document.getElementsByTagName('input')[0].value;
        if (val) {

          userData.name = val;
          canvas.style.display = 'block';
          document.getElementById('c').style.display = 'none';
          socket.emit('userJoined', userData);
        }
      });
    }
    else {

      socket.emit('userJoined', userData);
    }
  }
  catch (e) {}

  // server events

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

    var data, id, monster, mover;

    for (var key in list) {
      data = list[key];
      id = data.id;

      isMonster = data.type === 'monster';
      mover = isMonster ? monsters[id] : users[id];
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
      user.hitCountdown = 100;
    }
  });

  socket.on('userDeath', function (id) {

    var user = users[id];
    if (user && id !== userId) {
      user.isDead = 1;
      return;
    }

    respawnTimer();
  });

  socket.on('updateScore', function (_scores) {
    scores = _scores;
  });

  // key events
  window.addEventListener('keydown', function (e) {
    keysDown[e.keyCode] = true;
  });

  window.addEventListener('keyup', function (e) {
    delete keysDown[e.keyCode];
  });

  respawn.addEventListener('click', function (e) {

    if (!t) {

      var user = users[userData.id];
      user.isDead = 0;

      socket.emit('userRespawn', {'id': userData.id});
      timed = 0;
      t = 10;
      respawn.style.display = 'none';
      canvas.className = '';
    }
  });

  // methods

  // rate limiting
  var canShoot = true;
  var bulletTimer = setInterval(function () {
    canShoot =  true;
  }, 150);

  // limit monster damage to ever half second
  var canTakeDamage = true;
  var damageTimer = setInterval(function () {
    canTakeDamage =  true;
  }, 500);

  function respawnTimer () {

    if (!timed) {

      timed = 1;
      t = 10;
      var dt = document.getElementById('timer');
      var timer = setInterval(function () {

        dt.innerHTML = t--;

        if (t === 0) {

          dt.innerHTML = 'Respawn';
          clearTimeout(timer);
        }
      }, 1000);
    }
  }

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
      if ((userData.health <= 0) && (userData.isDead = 1)) {

        canvas.className = 'd';
        respawn.style.display = 'block';
      }

      socket.emit('hitUser', {'id': userData.id, 'damage': monster.damage});
    }
  }

  var rm = Math.PI/180;
  function getNextVector (v, a, m) {

    v.y = v.y + (Math.sin(rm*a) * m);
    v.x = v.x + (Math.cos(rm*a) * m);

    return v;
  }

  var vp = {'x':0, 'y':0};
  function update () {

    if (userData.isDead) {
      return;
    }

    // movement
    if (checkBounds()) {
      var offset = Object.keys(keysDown).length !== 0 && userData.speed * mod;
      var movement = false;
      var angle = false;
      if (65 in keysDown) { // left
        angle = 83 in keysDown ? 135 : 87 in keysDown ? 225 : 180;
      }
      else if (68 in keysDown) { // right
        angle = 83 in keysDown ? 45 : 87 in keysDown ? 315 : 0;
      }
      else if (87 in keysDown) { // up
        angle = 270;
      }
      else if (83 in keysDown) { // down
        angle = 90;
      }

      if (angle !== false) {
        vp.x = userData.x;
        vp.y = userData.y;
        vp = getNextVector(vp, angle, offset);
        userData.x = vp.x;
        userData.y = vp.y;
        socket.emit('updateMovement', userData);
      }
    }

    // aiming
    var facing;
    if (38 in keysDown) {
      facing =  37 in keysDown ? 'up-left' : 39 in keysDown ? 'up-right' : 'up';
    }
    else if (40 in keysDown) {
      facing = 37 in keysDown ? 'down-left' : 39 in keysDown ? 'down-right' : 'down';
    }
    else if (37 in keysDown) {
      facing = 'left';
    }
    else if (39 in keysDown) {
      facing = 'right';
    }
    facing && (userData.facing = facing) && socket.emit('updateMovement', userData);

    // space
    if (32 in keysDown) {
      if (canShoot) {
        var bullet = new Bullet(userData.x + (userData.height / 2), userData.y + (userData.width / 2), userData.facing, userData.id);
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

    if (userData.y >= 550) {

      userData.y = userData.y - 5;
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
  var bv = {'x': 0, 'y': 0};
  function updateBullet (b) {

    var dir = b.direction;
    var spd = b.speed * mod;
    var angle = 0;
    bv.x = b.x;
    bv.y = b.y;
    if (dir === 'up') {
      angle = 270;
    }
    else if (dir === 'up-left') {
      angle = 225;
    }
    else if (dir === 'up-right') {
      angle = 315;
    }
    else if (dir === 'down') {
      angle = 90;
    }
    else if (dir === 'down-left') {
      angle = 135;
    }
    else if (dir === 'down-right') {
      angle = 45;
    }
    else if (dir === 'left') {
      angle = 180;
    }
    else if (dir === 'right') {
      angle = 0;
    }

    bv = getNextVector(bv, angle, spd);
    b.x = bv.x;
    b.y = bv.y;

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
  var Img = Image;
  var patternImg = new Img();
  var pattern;
  patternImg.onload = function () {
    pattern = ctx.createPattern(patternImg, 'repeat');
  };
  patternImg.src = 'images/grass3.jpg';

  var monsterImage = new Img();
  monsterImage.src = 'images/monster-right.png';

  var rightImage = new Img();
  rightImage.src = 'images/blank-character-right.png';

  var leftImage = new Img();
  leftImage.src = "images/blank-character-left.png";


  // DO NOT CREATE OBJECTS IN HERE!
  function renderEntities (ctx) {
    var all = [];
    for (var user in users) {
      all.push(users[user]);
    }
    for (var monster in monsters) {
      all.push(monsters[monster]);
    }

    all.sort(function (a, b) {

      if (a.x === b.x && a.y === b.y && a.type !== b.type) {
        return a.type === 'monster' ? 1 : -1;
      }
      else {
        if (a.y === b.y) {
          return a.x > b.x ? 1 : a.x < b.x ? -1 : 0;
        }
        else {
          return a.y > b.y ? 1 : -1;
        }
      }
    });

    var ent;
    for (var i=0, len = all.length; i < len; i++) {

      ent = all[i];
      if (ent.type === 'player' && !ent.isDead && ent.isConnected) {
        renderPlayer(ctx, ent);
      }
      else if (ent.type === 'monster') {
        renderMonster(ctx, ent);
      }
    }
  }

  function renderPlayer(ctx, player) {

    var img;

    if (player.hitCountdown && player.hitCountdown % 10 === 1) {
      player.show = !player.show;
    }

    player.hitCountdown--;

    if (!player.hitCountdown) {
      player.show = 1;
    }

    if (!player.show) {
      return;
    }

    colorSprite(ctx, player);

    // dis is the white line for facing
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.fillStyle = 'white';


    if (userData.id === player.id) {

      ctx.fillText("You", player.x + 12, player.y + 65);
    }
    else {
      ctx.fillText(player.name, player.x + 12, player.y + 65);
    }

    img = rightImage;

    switch (player.facing) {
      case 'up':
        ctx.moveTo(player.x, player.y - 5);
        ctx.lineTo(player.x + 50, player.y - 5);
      break;
      case 'up-left':
        ctx.moveTo(player.x - 25, player.y + 20);
        ctx.lineTo(player.x + 20, player.y - 25);
      break;
      case 'down':
        ctx.moveTo(player.x , player.y + 55);
        ctx.lineTo(player.x + 50, player.y + 55);
      break;
      case 'down-left':
        ctx.moveTo(player.x - 30, player.y + 35);
        ctx.lineTo(player.x + 25, player.y + 70);
      break;
      case 'left':
        ctx.moveTo(player.x - 5, player.y);
        ctx.lineTo(player.x - 5, player.y + 50);
        img = leftImage;
      break;
      case 'right':
        ctx.moveTo(player.x + 55, player.y);
        ctx.lineTo(player.x + 55, player.y + 50);
        img = rightImage;
      break;
      case 'up-right':
        ctx.moveTo(player.x + 75, player.y + 20);
        ctx.lineTo(player.x + 25, player.y - 25);
      break;
      case 'down-right':
        ctx.moveTo(player.x + 70, player.y + 25);
        ctx.lineTo(player.x + 35, player.y + 70);
      break;
    }

    ctx.drawImage(img, player.x, player.y, 50, 50);

    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  function renderMonster (ctx, monster) {
    ctx.drawImage(monsterImage, monster.x, monster.y, monster.width, monster.height);
  }

  function render () {

    // ctx.fillStyle = '#000';

    // BG
    if (pattern) {
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = pattern;
      ctx.fill();
    }

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderEntities(ctx);

    var thisBullet, owner;
    for (var bullet in bullets) {

      thisBullet = bullets[bullet];
      owner = thisBullet && users[thisBullet.owner];
      if (thisBullet && owner && !owner.isDead) {
        updateBullet(thisBullet);

        thisBullet && (ctx.fillStyle = '#d62822');
        thisBullet && (ctx.fillRect(thisBullet.x, thisBullet.y, 3, 3));

        thisBullet && (ctx.fillStyle = '#f2b830');
        thisBullet && (ctx.fillRect(thisBullet.x + 4, thisBullet.y, 3, 3));
      }
    }

    // render health
    var health = users[userId].health;
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    var incr = (canvas.width - 10) / 10;
    var value = incr * health;
    ctx.fillRect(5, 5, value, 15);
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
})();
