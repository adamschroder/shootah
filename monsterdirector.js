// Runs on a loop
// Spawns monsters on the edges of the map
// Monsters are always moving, chasing a target

module.exports = (function () {

  var events = require('events');
  var self = new events.EventEmitter();

  var loopCount = 0;
  var interval = 100;
  var rate = 3;
  var monsters = [];

  var board = {
    'height': 600,
    'width': 800
  };

  var target = {
    'x': 400,
    'y': 300
  };

  var speed = 10;

  //stub
  var numPlayers = 1;

  function moveMonsters () {

    var monster;

    for (var i = 0, max = monsters.length; i < max; i++) {
      
      monster = monsters[i];
      
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
    this.height = this.width = 10;
    this.x = this.y = 0;

    // start point: TL, TR, BL, BR
    // offset path: x or y
    // offset value: between 0 and (max - 100)

    var left = Math.round(Math.random() * 1);
    var top = Math.round(Math.random() * 1);
    var offsetDirection = !!Math.round(Math.random() * 1) ? 'x': 'y';
    var offsetAmount;

    if (offsetDirection === 'x') {

      offsetAmount = (Math.round(Math.random() * (board.width - 100)));
      this.x += offsetAmount;
    }
    else {

      offsetAmount = (Math.round(Math.random() * (board.height - 100)));
      this.y += offsetAmount;
    }

    // console.log(offsetAmount)

    // var offset = 25;
    // var halfSize = this.height / 2;

    // this.x = left ? (offset - halfSize) : ((board.width - offset));
    // this.y = top ? offset : (board.height - offset);
  }

  function spawnMonsters () {

    var amount = numPlayers * rate;
    var monster;

    for (var i = 0, max = amount; i < max; i++) {

      monster = new Monster();
      monster.id = monsters.push(monster);

      self.emit('move', monster);
    }
  }
  
  function loop () {

    loopCount++;
    
    moveMonsters();

    if (loopCount === 10) {
      loopCount = 0;
      spawnMonsters();
    }

    setTimeout(loop, interval);
  }

  loop();

  return self;
})();