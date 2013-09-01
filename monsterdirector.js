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
  var targetX, targetY;

  var board = {
    'height': 600,
    'width': 600
  };

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

  function spawnMonsters () {

    var amount = numPlayers * rate;
    var monster;

    // console.log('SPAWN NEW MONSTERS');

    for (var i = 0, max = amount; i < max; i++) {

      // TODO: make spawn x/y random, to the edges of the board
      monster = {
        'type': 'monster',
        'x': board.height/2,
        'y': board.width/2,
        'height': 100,
        'width': 100
      };

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