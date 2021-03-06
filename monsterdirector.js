// Runs on a loop
// Spawns monsters on the edges of the map
// Monsters are always moving, chasing a target

module.exports = (function () {

  var events = require('events');
  var self = new events.EventEmitter();

  var board = {
    'height': 600,
    'width': 800
  };

  var time = Date.now();
  var interval = 250;

  var killedMonstersInWave, monstersInWave, waveState, oshit, monsterMultiplier, monsterCount, mod, userCount, speed, maxMonsters, monsterIds, monsters, rate, looper;

  function reset () {
    
    self.wave = killedMonstersInWave = monstersInWave = userCount = waveState = monsterCount = 0;
    mod = rate = 1;
    monsterMultiplier = 10;
    speed = 25;
    maxMonsters = 50;
    oshit = Math.round(Math.random() * 100);

    targets = {};
    monsterIds = {};
    monsters = {};

    badLuckUser = null;
  }
  reset();

  var rm = Math.PI/180;
  function getNextVector (v, a, m) {

    v.y = v.y + (Math.sin(rm*a) * m);
    v.x = v.x + (Math.cos(rm*a) * m);

    return v;
  }

  function getMonsterId () {

    var id = Math.random();
    while (monsterIds[id]) {
      id = Math.random();
    }
    monsterIds[id] = 1;
    return id;
  }

  function damageMonster (data) {

    var monster = monsters[data.id];
    if (monster) {
      monster.health -= data.damage;
      if (monster.health <= 0) {
        delete monsters[data.id];
        monsterCount--;
        killedMonstersInWave++;
        self.emit('killedMonster', data.id);
        self.emit('updateScore', data.shooter, 1);
      }
    }
  }

  function updateTarget (data) {
    targets[data.id] = data;
  }

  function randomTarget () {

    var possible = [];
    for (var id in targets) {
      if (!targets[id].isDead) possible.push(targets[id]);
    }
    if (possible.length === 1) return possible[0];
    var random = Math.round(Math.random() * possible.length) - 1;
    return possible[random];
  }

  function moveMonsters () {

    var monster, random, vector;
    for (var id in monsters) {
      
      monster = monsters[id];
      random = Math.round(Math.random() * oshit);

      if (!monster.target || random === oshit) {
        monster.target = randomTarget();
      }

      // if all players were dead, just keep wandering...
      if (monster.target) {

        if (monster.nextX !== undefined) {
          monster.x = monster.nextX;
          monster.y = monster.nextY;
        }

        monster.angle = (Math.atan2(monster.y - monster.target.y, monster.x - monster.target.x) * 180 / Math.PI) + 180;

        vector = getNextVector(monster, monster.angle, monster.speed * mod);
        monster.nextX = vector.x;
        monster.nextY = vector.y;

        self.emit('move', {
          'id': monster.id,
          'angle': monster.angle,
          'x': monster.x,
          'y': monster.y,
          'speed': monster.speed
        });
      }
    }

    // TODO:
    // refactor to do on each call:
    // 1. calculate next position and save as m.targetX, m.targetY (instead of assigning to m.x/y)
    // 2. simply copy (if exists) targetX/Y to m.x/y
    // 3. calculate and store angle between m.x/y and targetX/Y
    // 4. send only current id, speed, x, y, and angle to clients as move event

    // clients will animate inbetween frames on own by using current x,y, angle and speed (e.g. bullet animations)

    self.emit('move', monsters);
  }

  function Monster () {

    this.type = 'monster';
    this.id = getMonsterId();
    this.height = this.width = 50;
    this.speed = speed + Math.floor(Math.random() * 50);
    this.x = this.y = 0;

    var left = Math.round(Math.random() * 1);
    var top = Math.round(Math.random() * 1);

    this.x = left ? 0 : board.width;
    this.y = top ? 0 : board.height;

    var offsetDirection = !!Math.round(Math.random() * 1) ? 'x': 'y';
    var offsetAmount;

    if (offsetDirection === 'x') {

      offsetAmount = (Math.round(Math.random() * board.width));
      this.x = left ? this.x + offsetAmount : this.x - offsetAmount;
    }
    else {

      offsetAmount = (Math.round(Math.random() * board.height));
      this.y = top ? this.y + offsetAmount : this.y - offsetAmount;
    }

    this.health = 1;
    this.damage = 2;
  }

  function spawnMonsters () {

    if (waveState !== 1) return;
    
    var limit = userCount * rate * self.wave;
    var max = Math.round(Math.random() * limit);
    var monstersDeployed = monsterCount + killedMonstersInWave;
    var monster;

    if ((monstersDeployed + max) >= monstersInWave) {
      max = monstersInWave - monstersDeployed;
    }

    for (var i = 0; i < max; i++) {
      monster = new Monster();
      monsters[monster.id] = monster;
      monsterCount++;
    }
  }

  function updateUserCount (count) {
    userCount = count;
    if (!userCount) {
      stop();
      reset();
    }
  }

  function start () {
    if (self.wave === 0) {
      nextWave();
      loop();
    }
  }

  function stop () {
    clearTimeout(looper);
  }

  function nextWave () {
    self.wave++;
    waveState = 0;
    self.emit('wave', self.wave);
  }

  function badLuck () {
    var rand = Math.round(Math.random() * 100);
    if (rand === oshit) rate++;
  }

  function loop () {

    mod = (Date.now() - time) / 1000;
    if (waveState === 0) {
      waveState = 1;
      monstersInWave = self.wave * monsterMultiplier;
      killedMonstersInWave = 0;
    }
    else if (waveState === 1 && killedMonstersInWave >= monstersInWave) {
      waveState = 2;
    }
    else if (waveState === 1) {
      spawnMonsters();
      moveMonsters();
    }
    else if (waveState === 2) {
      nextWave();
    }

    badLuck();

    time = Date.now();

    looper = setTimeout(loop, interval);
  }

  self.updateTarget = updateTarget;
  self.damageMonster = damageMonster;
  self.updateUserCount = updateUserCount;

  self.start = start;

  return self;
})();