// Runs on a loop
// Spawns monsters on the edges of the map
// Monsters are always moving, chasing a target

module.exports = (function () {

  var events = require('events');
  var self = new events.EventEmitter();

  self.wave = 0;
  var interval = 1000;
  var rate = 1;
  var monsters = {};
  var monsterIds = {};
  var maxMonsters = 50;
  var speed = 50;
  var userCount = 0;
  var time = Date.now();
  var mod;
  var monsterCount = 0;
  var monsterMultiplier = 10;

  var oshit = Math.round(Math.random() * 100);

  // 0 before, 1 during, 2 after
  var waveState;
  var monstersInWave = 0;
  var killedMonstersInWave = 0;

  var board = {
    'height': 600,
    'width': 800
  };
  var target = {
    'x': 400,
    'y': 300
  };
  var badLuckUser;

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

    superBadLuck = Math.round(Math.random() * 100) === 1;

    if (superBadLuck) {
      badLuckUser = data.id;
    }

    changeTarget = Math.round(Math.random() * 10);

    if (superBadLuck || !badLuckUser && changeTarget === 1 || badLuckUser === data.id) {
      target.x = data.x;
      target.y = data.y;
    }
  }

  function moveMonsters () {

    var monster;
    for (var id in monsters) {
      
      monster = monsters[id];
      if (monster.x < target.x) {
        monster.x += monster.speed * mod;
      }
      else {
        monster.x -= monster.speed * mod;
      }

      if (monster.y < target.y) {
        monster.y += monster.speed * mod;
      }
      else {
        monster.y -= monster.speed * mod;
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
    this.speed = speed;
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

    console.log('DEPL', monstersDeployed, 'max', max, Object.keys(monsters).length);

    for (var i = 0; i < max; i++) {
      monster = new Monster();
      monsters[monster.id] = monster;
      monsterCount++;
    }
  }

  function updateUserCount (count) {
    userCount = count;
  }

  function start () {
    if (self.wave === 0) {
      nextWave();
      loop();
    }
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

    setTimeout(loop, interval);
  }

  self.updateTarget = updateTarget;
  self.damageMonster = damageMonster;
  self.updateUserCount = updateUserCount;

  self.start = start;

  return self;
})();

// TODO:
// - cache monsters and only send directions
// - monsters should follow in packs, not all at once