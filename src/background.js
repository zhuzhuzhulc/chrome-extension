var MAX_SEGMENTS = 10; // each segment is 3 seconds long
var WEBSITE_REGEX = /(youtube)|(twitch\.tv)|(.mp4)|(.webm)|(gfycat.com)|(vimeo.com)|(streamable.com)|(instagram.com)|(twitter.com)|(facebook)|(dailymotion.com)|(vine.co)/i
var APP_URL = 'http://staging.streamable.com';

function isSupportedSite(url) {
  return WEBSITE_REGEX.test(url);
}

function isStreamingSite(url) {
  var match = url.match(WEBSITE_REGEX);
  if (!(match && match.length)) {
    return false;
  }
  return match[0] === "twitch.tv";
}

var manager = {
  busy: {},
  streams: {},

  trackSegment: function(tabId, url) {
    if (!manager.streams[tabId]) {
      manager.streams[tabId] = {urls: []};
    }
    var stream = manager.streams[tabId];
    stream.urls.push(url);
    if (stream.urls.length > MAX_SEGMENTS) {
      stream.urls = stream.urls.slice(-MAX_SEGMENTS);
    }
  },

  startProcessing: function(segmentUrls, callback) {
    $.get(APP_URL + '/ajax/transcoder', function(transcoderUrl) {
      var concatPayload = {
        userAgent: 'Streamable Chrome Extension',
        cookies: {},
        segments: segmentUrls
      };
      $.ajax({
        type: 'post',
        url: 'http://' + transcoderUrl + '/concat',
        data: concatPayload,
        success: function(concatData) {
          callback('http://' + transcoderUrl + '/events/' + concatData.job_id);
        }
      });
    });
  },

  available: function(tabId) {
    manager.busy[tabId] = false;
  },

  unavailable: function(tabId) {
    manager.busy[tabId] = true;
  },

  isAvailable: function(tabId) {
    return !manager.busy[tabId];
  },

  cleanup: function(tabId) {
    delete manager.streams[tabId];
  }
};

function updatePageAction(tab) {
  if (isSupportedSite(tab.url) && manager.isAvailable(tab.id)) {
    chrome.pageAction.show(tab.id);
  }
  else {
    chrome.pageAction.hide(tab.id);
  }
}

function notify(title, message, callback) {
  chrome.notifications.create({
    type: "basic",
    title: chrome.i18n.getMessage(title),
    message: chrome.i18n.getMessage(message),
    iconUrl: "icons/icon128-square.png"
  }, callback);
}

function notifyProgress(title, message, callback) {
  chrome.notifications.create({
    type: 'progress',
    title: chrome.i18n.getMessage(title),
    message: chrome.i18n.getMessage(message),
    iconUrl: "icons/icon128-square.png",
    priority: 2,
    progress: 0
  }, callback);
}

function updateProgress(notificationId, percent, callback) {
  var progress = Math.min(100, Math.max(Math.round(percent), 0));
  chrome.notifications.update(notificationId, {progress: progress}, callback);
}

function popup(url, callback) {
  chrome.tabs.create({
    url: url
  }, callback);
}

function clipVideo(url, params, callback) {
  params.url = url;
  var qs = $.param(params);
  var clipperUrl = APP_URL + '/clipper?' + qs;
  popup(clipperUrl, callback);
}

function startClipping(tab) {
  manager.unavailable(tab.id);
  updatePageAction(tab);
}

function stopClipping(tab) {
  manager.available(tab.id);
  updatePageAction(tab);
}

function clipStream(tab, title, source) {
  var stream = manager.streams[tab.id];
  if (!(stream && stream.urls)) {
    return;
  }

  startClipping(tab);

  notifyProgress('clipStreamNotifyTitle', 'clipStreamNotifyMessage', function(notificationId) {
    manager.startProcessing(stream.urls, function(eventSourceUrl) {
      var clipEvents = new EventSource(eventSourceUrl);

      clipEvents.addEventListener('progress', function(evt) {
        var evtData = JSON.parse(evt.data);
        updateProgress(notificationId, evtData.percent);
      });

      clipEvents.addEventListener('finish', function(evt) {
        var evtData = JSON.parse(evt.data);
        clipEvents.close();
        updateProgress(notificationId, 100, function() {
          clipVideo(evtData.videoUrl, {title: title, source: source, mime: 'video/mp4'}, function() {
            chrome.notifications.clear(notificationId);
            stopClipping(tab);
          });
        });
      });

      clipEvents.addEventListener('error', function() {
        stopClipping(tab);
        clipEvents.close();
      });
    });
  });
}

chrome.webRequest.onCompleted.addListener(function(req) {
  chrome.tabs.get(req.tabId, function(tab) {
    manager.trackSegment(tab.id, req.url);
  });
}, {urls: ["http://*.ttvnw.net/*.ts"]});

chrome.pageAction.onClicked.addListener(function(tab) {
  if (isStreamingSite(tab.url)) {
    if (manager.isAvailable(tab.id)) {
      clipStream(tab, tab.title, tab.url);
    }
  }
  else {
    clipVideo(tab.url, {title: tab.title, source: tab.url});
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
  updatePageAction(tab);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  manager.cleanup(tabId);
});

chrome.tabs.onActivated.addListener(function(info) {
  chrome.tabs.get(info.tabId, function(tab) {
    updatePageAction(tab);
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.clipVideo) {
    clipVideo(request.clipVideo, {title: request.title, source: request.source});
  } else if (request.clipStream && manager.isAvailable(sender.tab.id)) {
    clipStream(sender.tab, request.title, request.source);
  }
});
