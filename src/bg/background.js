// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var MAX_CLIPS = 10; // each clip is 3 seconds long

var saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (blob, fileName) {
      var url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      //a.click();
      console.log(url);

      chrome.tabs.create({ url: "http://streamable.com/clipper/twitch" }, function(tab) {
        setTimeout(function() {
          console.log(tab.id);
          chrome.tabs.sendMessage(tab.id, { message: "file-ready", url: url }, function(response) {});
        }, 2500);
      });
      //window.URL.revokeObjectURL(url);
    };
}());

var BlobBuilder = function() {
  this.parts = [];
}

BlobBuilder.prototype.append = function(part) {
  this.parts.push(part);
  this.blob = undefined; // Invalidate the blob
}

BlobBuilder.prototype.getBlob = function() {
  if (!this.blob) {
    this.blob = new Blob(this.parts, { type: "application/octet-stream" });
  }

  return this.blob;
}

var StreamManager = function() {
  this.streams = {};
}

StreamManager.prototype.getUsername = function(title) {
  return title.split(' - ')[0];
}

StreamManager.prototype.setUsername = function(tabId, username) {
  if (!(this.streams[tabId] && this.streams[tabId].urls)) return;
  this.streams[tabId].user = username;
}

// Force url to be highest quality format (source)
StreamManager.prototype.forceQuality = function(url) {
  // Example url format:
  // http://video3.jfk01.hls.ttvnw.net/hls146/faceittv_15209368192_268286797/chunked/index-0000001233-TxeV.ts
  var segments = url.split('/');

  segments[segments.length - 2] = "chunked";

  return segments.join('/');
}

StreamManager.prototype.addURL = function(tabId, url) {
  if (!(this.streams[tabId] && this.streams[tabId].urls)) this.streams[tabId] = { urls: [], notified: false };

  var stream = this.streams[tabId];

  console.log(stream.urls.indexOf(this.forceQuality(url)));
  stream.urls.push(this.forceQuality(url));

  if (stream.urls.length >= MAX_CLIPS) {
    stream.urls = stream.urls.slice(-MAX_CLIPS);

    if (!stream.notified) {
      stream.notified = true;

      chrome.notifications.create('', {
        type: "basic",
        title: "Stream ready",
        message: stream.user + "'s stream is ready to clip!",
        iconUrl: "icons/icon48.png"
      }, function() {});
    }
  }

  console.log(this.streams);
}

StreamManager.prototype.downloadClips = function(clips) {
  var self = this;
  var blobTheBuilder = new BlobBuilder();
  var localClips = clips.slice();

  var processNext = function() {
    if (localClips.length === 0) {
      // no more clips to process
      return saveData(blobTheBuilder.getBlob(), 'file.ts');
    }

    var clip = localClips.shift();

    var xhr = new XMLHttpRequest();
    xhr.open("GET", clip + "?highlight=true");
    xhr.responseType = "blob";

    xhr.onload = function() {
      blobTheBuilder.append(xhr.response);
      processNext();
    }

    xhr.send();
  }

  processNext();
}

StreamManager.prototype.saveClip = function(tabId) {
  if (!(this.streams[tabId] && this.streams[tabId].urls)) return;

  var stream = this.streams[tabId];

  console.log("saving clip:", stream.user, '\n', stream.urls.join('\n'));
  // send clips to backend
  // send user to streamable clipper
  this.downloadClips(stream.urls);
}

StreamManager.prototype.closeTab = function(tabId) {
  delete this.streams[tabId];
}

var manager = new StreamManager();

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.message) {
    case "save-clip":
      manager.saveClip(request.tabId);
      break;
  }

  sendResponse();
});

chrome.webRequest.onCompleted.addListener(function(req) {
  // only get URLs that end in .ts
  if (!/\.ts$/.test(req.url)) return;

  chrome.tabs.get(req.tabId, function(tab) {
    var username = manager.getUsername(tab.title);

    manager.setUsername(tab.id, username);
    manager.addURL(tab.id, req.url);
  });

}, { urls: ["http://*.ttvnw.net/*"] });

chrome.tabs.onRemoved.addListener(function(tabId) {
  manager.closeTab(tabId);
  console.log(manager);
});

// On extension icon click (top right of browser)
chrome.browserAction.onClicked.addListener(function(tab) {
  manager.saveClip(tab.id);
});
