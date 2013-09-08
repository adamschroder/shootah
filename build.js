var fs = require("fs");

var uglify = require("uglify-js");

var config = {
  'client': {
    
    'js': [
      'game.js'
    ],
    
    'files': [
      'index.html',
      'images/character-sprite-reg.png',
      'images/grass-tile.png',
      'images/monster-left.png',
      'images/monster-right.png'
      // todo 'images/srpite.png'
    ]
  },

  'server': {
    
    'js': [
      'server.js',
      'monsterdirector.js'
    ],
    
    'files': [
      'package.json'
    ]
  }
};

var pkg;
for (var type in config) {

  pkg = config[type];

  var source, path;
  for (var js in pkg.js) {

    path = pkg.js[js];
    source = uglify.minify(path).code;

    path = 'build/' + type + '/' + path;

    fs.writeFileSync(path, source);

    console.log('wrote ' + path);
  }

  var origin, destination;
  for (var file in pkg.files) {

    origin = pkg.files[file];
    destination = 'build/' + type + '/' + origin;

    fs.createReadStream(origin).pipe(fs.createWriteStream(destination));

    console.log('wrote ', destination);
  }

}