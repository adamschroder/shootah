// Runs on a loop
// Spawns monsters on the edges of the map
// Monsters are always moving, chasing a target

module.exports = (function () {

  var interval = 1000;
  var targetX, targetY;

  //stub
  var numPlayers = 1;

  function spawnMonsters () {


  }
  
  function loop () {

    spawnMonsters();
    setTimeout(loop, interval);
  }

  setTimeout(loop, interval);

  return {};
})();