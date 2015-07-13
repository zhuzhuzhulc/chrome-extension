// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var MAX_CLIPS = 10; // each clip is 3 seconds long
var WEBSITE_REGEX = /(youtube)|(twitch\.tv)|(.mp4)|(.webm)|(gfycat.com)|(vimeo.com)|(streamable.com)|(instagram.com)|(twitter.com)|(facebook)|(dailymotion.com)|(vine.co)/i

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

StreamManager.prototype.addURL = function(tabId, url) {
  if (!(this.streams[tabId] && this.streams[tabId].urls)) this.streams[tabId] = { urls: [] };

  var stream = this.streams[tabId];

  stream.urls.push(url);

  if (stream.urls.length >= MAX_CLIPS) {
    stream.urls = stream.urls.slice(-MAX_CLIPS);
  }
}

StreamManager.prototype.uploadClip = function(blob) {
  var formData = new FormData();
  formData.append("file", blob);

  $.ajax({
    url: "https://api.streamable.com/upload",
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    beforeSend: function (xhr) {
      xhr.setRequestHeader("Authorization", "Basic " + btoa('chrome:chrome')); // user:pass
    },
    success: function(data) {
      if (!data || !data.length) return;

      chrome.tabs.create({ url: "http://streamable.com/" + data[0].shortcode });
    },
    error: function(err) {
      console.log(err);
    }
  });
}

StreamManager.prototype.downloadTwitchClips = function(clips) {
  var self = this;
  var blobTheBuilder = new BlobBuilder();
  var localClips = clips.slice();

  var processNext = function() {
    if (localClips.length === 0) {
      // no more clips to process
      return self.uploadClip(blobTheBuilder.getBlob());
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

StreamManager.prototype.saveTwitchClip = function(tabId) {
  var stream = this.streams[tabId];
  if (!(stream && stream.urls)) return;

  chrome.notifications.create('', {
    type: "basic",
    title: "Processing clip",
    message: "Please wait. We'll open the video when it's ready.",
    iconUrl: "icons/icon48.png"
  }, function() {});

  console.log("saving clip:", stream.user, '\n', stream.urls.join('\n'));
  // send clips to backend
  // send user to streamable clipper
  this.downloadTwitchClips(stream.urls);
}

StreamManager.prototype.closeTab = function(tabId) {
  delete this.streams[tabId];
}

var manager = new StreamManager();

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
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
});

// On extension icon click (top right of browser)
chrome.browserAction.onClicked.addListener(function(tab) {
  var match = tab.url.match(WEBSITE_REGEX);
  if (!(match && match.length)) return;

  if (match[0] === "twitch.tv")
    manager.saveTwitchClip(tab.id);
  else // send to clipper
    chrome.tabs.create({ url: "http://streamable.com/clipper/" + tab.url });
});

var updateIcon = function(url) {
  if (!url) return chrome.browserAction.setIcon({ path: "icons/logo128-off.png" });

  var match = url.match(WEBSITE_REGEX);
  if (match && match.length > 1)
    chrome.browserAction.setIcon({ path: "icons/logo128-on.png" });
  else
    chrome.browserAction.setIcon({ path: "icons/logo128-off.png" });
}

chrome.tabs.onUpdated.addListener(function(tabId, info) {
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    if (!(tabs && tabs.length)) return;

    if (tabs[0].id === tabId) updateIcon(tabs[0].url);
  })
});

chrome.tabs.onActivated.addListener(function(info) {
  chrome.tabs.get(info.tabId, function(tab) {
    updateIcon(tab.url);
  });
});

