var fs = require('fs');

function escapeRegExp(s) {
  return s.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function makeMatchRe(pattern) {
  var matchRe = /^(\*|https?):\/\/((?:\*\.[^\/*]+)|[^\/*]+|\*)(\/.*)$/;
  var match = pattern.match(matchRe);
  if (!match) {
    return;
  }
  var parts = [];
  parts.push(match[1] === '*' ? 'https?' : match[1]);
  if (match[2] === '*') {
    parts.push('[^/]+');
  } else if (match[2].substr(0, 2) == '*.') {
    parts.push('(?:.+\\.)?' + escapeRegExp(match[2].substr(2)));
  } else {
    parts.push(escapeRegExp(match[2]));
  }
  parts.push(match[3].split('*').map(escapeRegExp).join('[^/]+'));
  return '(^' + parts[0] + '://' + parts[1] + parts[2] + '$)';
}

var sites = {videoSites: [], streamingSites: []};

fs.readFile(process.argv[2], function(err, data) {
  if (err) throw err;
  var patterns = JSON.parse(data);
  var categories = ['videoSites', 'streamingSites'];
  for (var category, c = 0; (category = categories[c++]); category !== undefined) {
    for (var pattern, p = 0; (pattern = patterns[category][p++]); pattern !== undefined) {
      var matchRe = makeMatchRe(pattern);
      if (!matchRe) {
        process.stderr.write("bad " + category + " pattern: " + pattern);
      }
      sites[category].push(matchRe);
    }
  }
  fs.writeFile(process.argv[3], JSON.stringify(sites), function(err) {
    if (err) throw err;
  });
});
