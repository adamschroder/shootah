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
    'x': 300,
    'y': 400
  };

  var speed = 10;

  //stub
  var numPlayers = 1;

  function moveMonsters () {

    // console.log('MOVE THE MONSTERS');
    var monster;

    for (var i = 0, max = monsters.length; i < max; i++) {
      
      monster = monsters[i];
      
      // calculate movement towards target
      // emit move event
    }
  }

  function Monster () {

    this.type = 'monster';
    this.height = this.width = 10;

    var left = Math.round(Math.random() * 1);
    var top = Math.round(Math.random() * 1);
    var offset = 25;
    var position = {};
    var halfSize = this.height / 2;

    this.x = left ? (offset - halfSize) : ((board.width - offset));
    this.y = top ? offset : (board.height - offset);
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