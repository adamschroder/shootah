// Runs on a loop
// Spawns monsters on the edges of the map
// Monsters are always moving, chasing a target

module.exports = (function () {

  var events = require('events');
  var self = new events.EventEmitter();

  var loopCount = 0;
  var interval = 10;
  var rate = 3;
  var monsters = {};
  var monsterIds = {};
  var maxMonsters = 100;
  var speed = 1;
  var numPlayers = 1;

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
        self.emit('killedMonster', data.id);
      }
    }
  }

  function updateTarget (data) {

    superBadLuck = Math.round(Math.random() * 100) === 1;

    if (superBadLuck) {
      badLuckUser = data.id;
    }

    changeTarget = Math.round(Math.random() * 10);

    if (superBadLuck || !badLuckUser && changeTarget === 1) {
      target.x = data.x;
      target.y = data.y;
    }
  }

  function moveMonsters () {

    var monster;


    for (var id in monsters) {
      
      monster = monsters[id];
      
      if (monster.x < target.x) {
        monster.x += speed;
      }
      else {
        monster.x -= speed;
      }

      if (monster.y < target.y) {
        monster.y += speed;
      }
      else {
        monster.y -= speed;
      }

      self.emit('move', monster);
    }
  }

  function Monster () {

    this.type = 'monster';
    this.id = getMonsterId();
    this.height = this.width = 10;
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
  }

  function spawnMonsters () {

    var amount = numPlayers * rate;
    var monster;

    for (var i = 0, max = amount; i < max; i++) {

      if (Object.keys(monsters).length >= maxMonsters) {
        return false;
      }

      monster = new Monster();
      monsters[monster.id] = monster;

      self.emit('move', monster);
    }
  }
  
  function loop () {

    loopCount++;
    
    moveMonsters();

    if (loopCount === 100) {
      loopCount = 0;
      spawnMonsters();
    }

    setTimeout(loop, interval);
  }

  loop();

  self.updateTarget = updateTarget;
  self.damageMonster = damageMonster;
  return self;
})();