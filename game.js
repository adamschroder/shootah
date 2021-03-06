// make the game private, no cheaters!
(function () {

  // var socket = io.connect('http://192.168.2.95:8080');
  // var socket = io.connect('http://localhost:8080');
  // var socket = io.connect('http://shootah-octatone.rhcloud.com:8000');
  var socket = io.connect('http://localhost:8080');

  var doc = document;
  function getElById (id) {
    return doc.getElementById(id);
  }
  function createEl (el) {
    return doc.createElement(el);
  }

  var m = Math;
  var rand = m.random;
  var floor = m.floor;

  var canvas = getElById('canvas');
  var scoreBoard = getElById('st'); // score table, get it?

  var ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;

  var respawn = getElById('r');
  var message = getElById('m');
  var mod, sessionId, userData, userId, respawnTime, bulletTimer, itemRemoveTimer;
  var gunTypeTimeout = 150;
  var users = {};
  var powerUps = {};
  var bullets = {};
  var ids = {};
  var monsters = {};
  var keysDown = {};
  var scores = {};
  var timed = 0;
  var time = Date.now();
  var shotgunAvailable = 0;
  var healthAvailable = 0;

  try {

    var oldUser = window.localStorage.getItem('user');
    userData = oldUser ? JSON.parse(oldUser) : {};
    userData.isDead = 0;
    userData.health = 10;

    if (!userData.name) {
      canvas.style.display = 'none';
      getElById('c').style.display = 'block';
      getElById('submit').addEventListener('click', function () {

        var val = doc.getElementsByTagName('input')[0].value;
        if (val) {
          userData.name = val;
          canvas.style.display = 'block';
          getElById('c').style.display = 'none';
          socket.emit('userJoined', userData);
        }
      });
    }
    else {

      socket.emit('userJoined', userData);
    }
  }
  catch (e) {

    throw new Error(e);
  }

  // server events

  socket.on('join', function (data) {

    sessionId = socket.socket.sessionid;
    if (data.socketId === sessionId) {

      console.log(data);

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
      if (mover && userData && id !== userId) {
        mover.x = data.x;
        mover.y = data.y;
      }

      isMonster ? (monsters[id] = data) : mover && (mover.facing = data.facing);
    }
  }

  socket.on('move', function (data) {

    if (data.id === userId) {
      return;
    }

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

    if (!bullets[data.id] && data.owner !== userId) {
      bullets[data.id] = data;
      bang(data.x);
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
    if (user && !user.isDead) {
      user.health = data.health;
      user.hitCountdown = 100;
    }
  });

  socket.on('shotgunPowerUpDrop', function (data) {

    powerUps[data.id] = data;
    shotgunAvailable = 1;
  });

  socket.on('healthPowerUpDrop', function (data) {

    powerUps[data.id] = data;
    healthAvailable = 1;
  });

  socket.on('userDeath', function (id, msg) {

    var user = users[id];
    if (user && !user.isDead) {
      user.isDead = 1;
      if (id === userId) {
        message.innerHTML = msg;
        respawnTimer();
        killOwnBullets();
      }
    }
  });

  socket.on('userNotInvincible', function (id) {
    var user = users[id];
    if (user) {
      user.isInvincible = 0;
    }
  });

  socket.on('wave', function (wave) {
    console.log('WAVE ' + wave);
  });

  socket.on('userPickup', function (id, powerUp) {

    var user = users[id];
    if (user.isDead) {
      return;
    }

    delete powerUps[powerUp.id];

    shotgunAvailable = 0;
    healthAvailable = 0;

    if (powerUp.type === 'health') {
      user.health = 10;
    }

    if (user.id === userId) {

      user.powerup = powerUp;
      gunTypeTimeout = user.powerup.type === 'shotgun' ? 500: 150;
      initBulletTimer();

      if (user.powerup && user.powerup.type === 'shotgun') {

        var itemTimer = 10000;

        gunTypeTimeout = user.powerup.type === 'shotgun' ? 500: 150;

        clearTimeout(itemRemoveTimer);
        itemRemoveTimer = setTimeout(function () {

          user.powerup = '';
          socket.emit('powerUpEnd', {'id': user.id});
          gunTypeTimeout = user.powerup.type === 'shotgun' ? 500: 150;
          initBulletTimer();
          itemTimer = itemTimer - 1000;
        }, itemTimer);
      }
    }
  });

  socket.on('updateScore', function (_scores) {
    scores = _scores;
    renderScores();
  });

  // key events
  window.addEventListener('keydown', function (e) {

    if (userData.name && !userData.isDead) {

      e.preventDefault();
    }

    keysDown[e.keyCode] = true;
  });

  window.addEventListener('keyup', function (e) {

    if (userData.name && !userData.isDead) {

      e.preventDefault();
    }

    delete keysDown[e.keyCode];
  });

  function respawnSelf (e) {

    if (!respawnTime) {

      var user = users[userId];
      user.health = 10;
      user.isDead = 0;

      socket.emit('userRespawn', {'id': userId});
      timed = 0;
      respawnTime = 10;
      respawn.style.display = 'none';
      canvas.className = '';
    }
  }
  respawn.addEventListener('click', respawnSelf);

  // methods

  // rate limiting
  var canShoot = 1;
  function initBulletTimer () {

    bulletTimer && clearInterval(bulletTimer);
    bulletTimer = setInterval(function () {
      canShoot = 1;
    }, gunTypeTimeout);
  }
  initBulletTimer();

  // limit monster damage to every half second
  var canTakeDamage = true;
  var damageTimer = setInterval(function () {
    canTakeDamage =  true;
  }, 500);

  function respawnTimer () {

    if (!timed) {

      timed = 1;
      respawnTime = 10;
      var dt = getElById('timer');
      dt.innerHTML = respawnTime;
      var timer = setInterval(function () {

        dt.innerHTML = --respawnTime;

        if (respawnTime === 0) {

          dt.innerHTML = 'Respawn';
          clearTimeout(timer);
        }
      }, 1000);
    }
  }

  function checkUserCollisions () {

    // powerups
    var powerUp = collidesWithPowerUp(userData);
    if (powerUp) {

      socket.emit('userPickup', {
        'id': userId,
        'powerUp': powerUp
      });
    }

    // monsters
    if (!canTakeDamage || userData.isInvincible) {
      return;
    }
    else {
      canTakeDamage = false;
    }

    var monster = collidesWithMonster(userData);
    if (monster) {

      userData.health -= monster.damage;
      if ((userData.health <= 0)) {

        canvas.className = 'd';
        respawn.style.display = 'block';
      }

      socket.emit('hitUser', {
        'id': userId,
        'damage': monster.damage,
        'fromMonster': 1
      });
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

      if (!respawnTime && 32 in keysDown) respawnSelf();
      return;
    }

    var updateData = {'id': userId};

    // movement
    var angle = false;
    if (checkBounds()) {
      var offset = Object.keys(keysDown).length !== 0 && userData.speed * mod;
      var movement = false;
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

        updateData.x = userData.x;
        updateData.y = userData.y;
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
    if (facing) {
      userData.facing = facing;
      updateData.facing = facing;
    }

    if (angle || facing) {
      sendMovement(updateData);
    }

    // space
    angle = 0;
    var xOffset = 0;
    var yOffset = 0;
    if (32 in keysDown) {

      if (canShoot) {
        if (userData.facing === 'up') {
          angle = 270;
          xOffset = -10;
          yOffset = -30;
        }
        else if (userData.facing === 'up-left') {
          angle = 225;
          xOffset = -25;
          yOffset = -15;
        }
        else if (userData.facing === 'up-right') {
          angle = 315;
          xOffset = 10;
          yOffset = -20;
        }
        else if (userData.facing === 'down') {
          angle = 90;
          xOffset = -10;
          yOffset = 0;
        }
        else if (userData.facing === 'down-left') {
          angle = 135;
          xOffset = -15;
          yOffset = 5;
        }
        else if (userData.facing === 'down-right') {
          angle = 45;
          xOffset = 5;
          yOffset = 5;
        }
        else if (userData.facing === 'left') {
          angle = 180;
          xOffset = - 25;
        }
        else if (userData.facing === 'right') {
          angle = 0;
        }

        if (userData.powerup && userData.powerup.type === 'shotgun') {

          createBullet(xOffset, yOffset, angle-15);
          createBullet(xOffset, yOffset, angle+15);
        }

        createBullet(xOffset, yOffset, angle);
      }

      canShoot = false;
    }
  }

  var shouldSendMovement = 1;
  // debounced to about 30fps
  function sendMovement (movementData) {

    if (shouldSendMovement) {
      shouldSendMovement = 0;
      socket.emit('updateMovement', movementData);
      setTimeout(function () {
        shouldSendMovement = 1;
      }, 33);
    }
  }

  function createBullet (xOffset, yOffset, angle) {

    var bullet = new Bullet(userData.x + (userData.height / 2) + xOffset, userData.y + (userData.width / 2) + yOffset, userData.facing, angle, userId);
    bullets[bullet.id] = bullet;
    socket.emit('newBullet', bullet);
    bang(bullet.x);
  }

  function getUID () {

    var id = rand();
    while (ids[id]) {
      id = rand();
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

  function Bullet (x, y, direction, angle, owner) {

    var b = this;
    b.owner = owner;
    b.id = owner + getUID();
    b.x = x;
    b.y = y;
    b.width = 5;
    b.height = 5;
    b.direction = direction;
    b.angle = angle;
    b.speed = 500;
  }

  function killOwnBullets () {
    var b;
    for (var bullet in bullets) {
      b = bullets[bullet];
      (b.owner === userId) && delete bullets[bullet];
    }
  }

  var bv = {'x': 0, 'y': 0};
  function updateBullet (b) {

    var dir = b.direction;
    var spd = b.speed * mod;
    bv.x = b.x;
    bv.y = b.y;

    bv = getNextVector(bv, b.angle, spd);
    b.x = bv.x;
    b.y = bv.y;

    // only manage bullet collision for self
    if (b.owner === userId) {

      var shooter = userId;

      var isInbounds = isOnBoard(b);

      if (!isInbounds) {

        delete bullets[b.id];
        socket.emit('killBullet', b.id);
        return;
      }

      var user = collidesWithUser(b);
      if (user && !user.isInvincible && !user.isDead) {
        user.health -= 1;
        (user.health <= 0) && (user.isDead = 1);
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

      if (collide && !thisUser.isDead) {
        return thisUser;
      }
    }
    return false;
  }

  function collidesWithMonster (obj) {

    if (obj.isDead) return false;
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

  function collidesWithPowerUp (obj) {

    if (obj.isDead) return false;
    var thisPowerup;
    var collide;
    var allowed;

    for (var powerUp in powerUps) {

      thisPowerup = powerUps[powerUp];
      collide = doBoxesIntersect(obj, thisPowerup);
      allowed = thisPowerup.type === 'shotgun' ? shotgunAvailable : healthAvailable;
      if (collide && allowed) {
        return thisPowerup;
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
  patternImg.src = 'images/grass-tile.png';

  var monsterImage = new Img();
  monsterImage.src = 'images/monster-right.png';

  var characterSprite = new Img();
  characterSprite.src = 'images/c-sprite.png';

  function renderPlayerFacing (ctx, player) {

    ctx.drawImage(characterSprite, player.x, player.y, 26, 23);
  }

  function renderShotgun (gunData) {

    var shotgun = new Img();
    shotgun.src = 'images/shotgun.png';
    ctx.drawImage(shotgun, gunData.x, gunData.y, 70, 25);
  }

  function renderHealth (hpData) {

    var hp = new Img();
    hp.src = 'images/hp.png';
    ctx.drawImage(hp, hpData.x, hpData.y, 45, 45);
  }

  // DO NOT CREATE OBJECTS IN HERE!
  function renderEntities (ctx) {
    var all = [];
    for (var user in users) {
      all.push(users[user]);
    }
    for (var monster in monsters) {
      all.push(monsters[monster]);
    }

    if (shotgunAvailable || healthAvailable) {

      for (var powerUp in powerUps) {

        all.push(powerUps[powerUp]);
      }
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
      else if (ent.type === 'shotgun') {

        renderShotgun(ent);
      }
      else if (ent.type === 'health') {

        renderHealth(ent);
      }
    }
  }

  function renderPlayer(ctx, player) {

    var img;

    if (player.hitCountdown && player.hitCountdown % 10 === 1) {
      player.show = !player.show;
    }

    player.hitCountdown--;

    if (!player.hitCountdown || player.hitCountdown < 0) {
      player.hitCountdown = 0;
      player.show = 1;
    }

    if (!player.show) {
      return;
    }

    colorSprite(ctx, player);

    ctx.beginPath();
    ctx.fillStyle = 'white';
    img = characterSprite;

    var name = userId === player.id ? "You": player.name;
    ctx.fillText(name, player.x + 12, player.y + 65);
    var offsetFacing = 0;
    
    var offset = 26;
    var yOffset = 0;

    switch (player.facing) {
      case 'up':
        // no offset
        break;
      case 'up-left':
        offsetFacing = offset * 1;
        yOffset = -4;
        break;
      case 'down':
        offsetFacing = offset * 4;
        break;
      case 'down-left':
        offsetFacing = offset * 3;
        yOffset = -4;
        break;
      case 'left':
        offsetFacing = offset * 2;
        yOffset = -4;
        break;
      case 'right':
        offsetFacing = offset * 6;
        yOffset = 4;
        break;
      case 'up-right':
        offsetFacing = offset * 5;
        yOffset = 4;
        break;
      case 'down-right':
        offsetFacing = offset * 7;
        yOffset = 2;
        break;
    }

    ctx.drawImage(img,
      0,
      offsetFacing,
      23,
      26,
      player.x + yOffset,
      player.y,
      40,
      45
    );

    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  function renderMonster (ctx, monster) {

    var speed = monster.speed * mod;
    var vector = getNextVector(monster, monster.angle, speed);
    monster.x = vector.x;
    monster.y = vector.y;
    
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
    var health = userData.health;
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    var incr = (canvas.width - 10) / 10;
    var value = incr * health;
    ctx.fillRect(5, 5, value, 15);
  }

  function colorSprite (ctx, user) {

    var offset = user.facing === 'left' || user.facing === 'down-left' || user.facing === 'up-left' ? 15 : user.facing === 'down' || user.facing === 'up' ? 12 : 9;

    // var otherOffset = 0;
    // if (user.facing === 'left' || user.facing === 'down-left' || user.facing === 'up-left') {
    //   // yOffset = -4;
    // }
    // else if (user.facing === 'down' || user.facing === 'up') {
    //   // yOffset = 0;
    // }


    ctx.fillStyle = user.color;
    ctx.fillRect(user.x + offset,  user.y + 23, 17, 15); // shirt
    ctx.fillStyle = user.eyeColor;
    ctx.fillRect(user.x + offset + 3, user.y + 10, 14, 10); // eyes
    ctx.fillStyle = user.pantsColor;
    ctx.fillRect(user.x -1 + offset + 2, user.y + 35, 16, 7); // pants
  }

  function renderScores () {

    var frag = doc.createDocumentFragment();

    var tr;
    var td;
    var score;

    // highest on top
    scores.sort(function (a, b) {
      return a.score > b.score ? -1 : a.score < b.score ? 1 : 0;
    });

    for (var id in scores) {

      score = scores[id];
      tr = createEl('tr');
      tr.style.outline = 'thin solid ' + score.color;

      td = createEl('td');
      td.innerText = score.name;

      tr.appendChild(td);

      td = createEl('td');
      td.innerText = score.score;

      tr.appendChild(td);

      frag.appendChild(tr);
    }

    scoreBoard.innerHTML = '';
    scoreBoard.appendChild(frag);
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

  // AUDIO
  // DO IT PROGRAMATICALLY LIKE A BOSS
  var audioContext = new webkitAudioContext();

  // white noise buffer for bullets, other sounds
  function createNoiseBuffer () {
    var bufferSize = 2 * audioContext.sampleRate,
        noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate),
        output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      output[i] = rand() * 2 - 1;
    }

    return noiseBuffer;
  }
  var noiseBuffer = createNoiseBuffer();

  // BULLETS
  // filter for bullets!
  var bulletFilter = audioContext.createBiquadFilter();
  bulletFilter.type = 0; // Low-pass filter. See BiquadFilterNode docs
  bulletFilter.frequency.value = 900;
  bulletFilter.connect(audioContext.destination);

  function bang (xPos) {
    var whiteNoise = audioContext.createBufferSource();
    var panner = audioContext.createPanner();
    xPan(xPos, panner);
    whiteNoise.connect(panner);
    // try to give bullets their own timbre
    bulletFilter.frequency.value = 900 + floor(rand() * 201) - 100;
    panner.connect(bulletFilter);
    // whiteNoise.connect(bulletFilter);
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    // try to give bullets their own timbre
    whiteNoise.loopStart = rand() * (noiseBuffer.duration / 2);
    whiteNoise.start(0);
    whiteNoise.stop(audioContext.currentTime + 0.04);
  }

  // helpers, set the pan on a given panner node based on the entities x position
  // relative to the canvas width
  function xPan (entityX, pannerNode) {

    var width = canvas.width;
    var middle = floor(canvas.width / 2);
    var max = 22;
    var angle;

    if (entityX === middle) {
      angle = 0;
    }
    else if (entityX < middle) {
      angle = (middle - entityX) / middle * -max;
    }
    else if (entityX > middle) {
      angle = (entityX - middle) / middle * max;
    }

    var xDeg = angle;
    var zDeg = xDeg + 90;
    if (zDeg > 90) {
      zDeg = 180 - zDeg;
    }
    var x = Math.sin(xDeg * (Math.PI / 180));
    var z = Math.sin(zDeg * (Math.PI / 180));
    pannerNode.setPosition(x, 0, z);
  }

  // MUSIC
  // Convert this metronome's timer clock: https://raw.github.com/cwilso/metronome/master/js/metronome.js
  // In to a very, very basic music loop

  var tracks =  [
    [30,,,, 30,,,, 30,,,, 30,,,,   30,,,, 30,,25,, 30,,25,, 30,,32], // bass
    [  ,,,, 54,,,, ,,52,, 54,,56,, 57,,,, ,,,,     ,,49], // lead
    [  ,,,, ,,,,   ,,,,   ,,,,     ,,,,   ,69,66,69,     ,69]// idk
  ];

  function keyToHz (key) {
    var x = key - 49;
    return 440 * Math.pow(2, x/12);
  }

  var isPlaying = false;      // Are we currently playing?
  var startTime;              // The start time of the entire sequence.
  var current16thNote;        // What note is currently last scheduled?
  var tempo = 132.0;          // tempo (in beats per minute)
  var lookahead = 25.0;       // How frequently to call scheduling function 
                              //(in milliseconds)
  var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
                              // This is calculated from lookahead, and overlaps 
                              // with next interval (in case the timer is late)
  var nextNoteTime = 0.0;     // when the next note is due.
  var noteLength = 0.04;      // length of "beep" (in seconds)
  var timerID = 0;            // setInterval identifier.

  var last16thNoteDrawn = -1; // the last "box" we drew on the screen
  var notesInQueue = [];      // the notes that have been put into the web audio,
                              // and may or may not have played yet. {note, time}

  function nextNote() {
      // Advance current note and time by a 16th note...
      var secondsPerBeat = 60.0 / tempo;    // Notice this picks up the CURRENT 
                                            // tempo value to calculate beat length.
      nextNoteTime += 0.25 * secondsPerBeat;    // Add beat length to last beat time

      current16thNote++;    // Advance the beat number, wrap to zero
      if (current16thNote == 32) { // two bar pattern
          current16thNote = 0;
      }
  }

  function scheduleNote( beatNumber, time ) {
      
      var osc, keyNumb;
      var length = noteLength;
      
      // push the note on the queue, even if we're not playing.
      notesInQueue.push( { note: beatNumber, time: time } );

      for (var track in tracks) {

        keyNumb = tracks[track][beatNumber];
        if (keyNumb !== undefined) {

          // create an oscillator
          osc = musicContext.createOscillator();
          osc.type = 1;
          osc.connect(musicGainNode);
          osc.frequency.value = keyToHz(keyNumb);

          osc.start(time);
          osc.stop(time + noteLength);
        }
      }
  }

  function scheduler() {
      // while there are notes that will need to play before the next interval, 
      // schedule them and advance the pointer.
      while (nextNoteTime < musicContext.currentTime + scheduleAheadTime ) {
          scheduleNote( current16thNote, nextNoteTime );
          nextNote();
      }
      timerID = window.setTimeout( scheduler, lookahead );
  }

  function play() {
      isPlaying = !isPlaying;

      if (isPlaying) { // start playing
          current16thNote = 0;
          nextNoteTime = musicContext.currentTime;
          scheduler();    // kick off scheduling
          return "stop";
      } else {
          window.clearTimeout( timerID );
          return "play";
      }
  }

  function timerLoop() {
      var currentNote = last16thNoteDrawn;
      var currentTime = musicContext.currentTime;

      while (notesInQueue.length && notesInQueue[0].time < currentTime) {
          currentNote = notesInQueue[0].note;
          notesInQueue.splice(0,1);   // remove note from queue
      }
      // set up to draw again
      requestAnimationFrame(timerLoop);
  }


  musicContext = new webkitAudioContext();
  musicGainNode = musicContext.createGain();
  musicGainNode.connect(musicContext.destination);
  musicGainNode.gain.value = 0.15;

  timerLoop();
  play();
})();
