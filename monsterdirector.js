// Runs on a loop
// Spawns monsters on the edges of the map
// Monsters are always moving, chasing a target

module.exports = (function () {

  var events = require('events');
  var self = new events.EventEmitter();

  var loopCount = 0;
  var interval = 10;
  var rate = 5;
  var monsters = [];
  var targetX, targetY;

  var board = {
    'height': 600,
    'width': 600
  };

  //stub
  var numPlayers = 1;

  function moveMonsters () {
    
  }

  function spawnMonsters () {

    var amount = numPlayers * rate;
    var monster;

    console.log('spawn')

    for (var i = 0, max = amount; i < max; i++) {

      // TODO: make spawn x/y random, to the edges of the board
      monster = {
        'x': board.height/2,
        'y': board.width/2
      };

      monsters.push(monster);

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

  return self;
})();