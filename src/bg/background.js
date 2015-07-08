// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var MAX_CLIPS = 5; // each clip is 3 seconds long

var StreamManager = function() {
  this.tabs = {};
  this.streams = {};
}

StreamManager.prototype.getUsername = function(title) {
  return title.split(' - ')[0];
}

// Force url to be highest quality format (source)
StreamManager.prototype.forceQuality = function(url) {
  // Example url format:
  // http://video3.jfk01.hls.ttvnw.net/hls146/faceittv_15209368192_268286797/chunked/index-0000001233-TxeV.ts
  var segments = url.split('/');

  segments[segments.length - 2] = "chunked";

  return segments.join('/');
}

StreamManager.prototype.addURL = function(user, url) {
  if (!(this.streams[user] && this.streams[user].urls)) this.streams[user] = { urls: [], notified: false };

  var stream = this.streams[user];

  stream.urls.push(this.forceQuality(url));

  if (stream.urls.length >= MAX_CLIPS) {
    stream.urls = stream.urls.slice(-MAX_CLIPS);

    if (!stream.notified) {
      stream.notified = true;

      chrome.notifications.create('', {
        type: "basic",
        title: "Stream ready",
        message: user + "'s stream is ready to clip!",
        iconUrl: "icons/icon48.png"
      }, function() {});
    }
  }

  console.log(this.streams);
}

StreamManager.prototype.saveClip = function(user) {
  if (!(this.streams[user] && this.streams[user].urls)) return;

  console.log("saving clip:", user, this.streams[user].urls);
  // send clips to backend
  // send user to streamable clipper
}

StreamManager.prototype.setTab = function(tabId, user) {
  this.tabs[tabId] = user;
}

StreamManager.prototype.closeTab = function(tabId) {
  if (!(this.tabs[tabId])) return;

  var user = this.tabs[tabId];

  delete this.tabs[tabId];
  delete this.streams[user];
}

var manager = new StreamManager();

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.message) {
    case "save-clip":
      var user = manager.getUsername(request.tabTitle);
      manager.saveClip(user);
      break;
  }

  sendResponse();
});

chrome.webRequest.onCompleted.addListener(function(req) {
  // only get URLs that end in .ts
  if (!/\.ts$/.test(req.url)) return;

  chrome.tabs.get(req.tabId, function(tab) {
    var user = manager.getUsername(tab.title);

    manager.setTab(tab.id, user);
    manager.addURL(user, req.url);
  });

}, { urls: ["http://*.ttvnw.net/*"] });

chrome.tabs.onRemoved.addListener(function(tabId) {
  manager.closeTab(tabId);
  console.log(manager);
});
