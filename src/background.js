var MAX_SEGMENTS = 10; // each segment is 3 seconds long
//var APP_URL = 'https://streamable.com';
var APP_URL = 'http://localhost:5000';

var VIDEO_SITES_RE = /streamable\.com/;
var STREAMING_SITES_RE = /streamable\.com/;
loadStoredSiteUrls();

$.ajaxSetup({cache: false});

function isVideoSite(url) {
  return VIDEO_SITES_RE.test(url);
}

function isStreamingSite(url) {
  return STREAMING_SITES_RE.test(url);
}

var manager = {
  busy: {},
  streams: {},

  trackSegment: function(tab, url) {
    if (!manager.streams[tab.id]) {
      manager.streams[tab.id] = {urls: []};
    }
    var stream = manager.streams[tab.id];
    stream.urls.push(url);
    if (stream.urls.length > MAX_SEGMENTS) {
      stream.urls = stream.urls.slice(-MAX_SEGMENTS);
    }
    updatePageAction(tab);
  },

  hasSegments: function(tabId) {
    var stream = manager.streams[tabId];
    return stream && stream.urls.length > 0;
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
    delete manager.busy[tabId];
  }
};

function updatePageAction(tab) {
  var clipVideoReady = isVideoSite(tab.url);
  var clipStreamReady = isStreamingSite(tab.url) && manager.isAvailable(tab.id) && manager.hasSegments(tab.id);
  var inClipper = /^https?:\/\/(?:.+\.)?streamable\.com\/clipper/.test(tab.url);
  if (!inClipper && (clipVideoReady || clipStreamReady)) {
    chrome.pageAction.show(tab.id);
  } else {
    chrome.pageAction.hide(tab.id);
  }
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
  params = $.extend({url: url, upload_source: 'chrome extension'}, params);
  var qs = $.param(params).replace(/\+/g, '%20');
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

function canClipStream(tab) {
  var stream = manager.streams[tab.id];
  return !!(stream && stream.urls);
}

function clipStream(tab, title, source) {
  if (!canClipStream(tab)) {
    return;
  }

  var stream = manager.streams[tab.id];

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
    manager.trackSegment(tab, req.url);
  });
}, {urls: ["*://*.ttvnw.net/*.ts", "*://*.googlevideo.com/videoplayback?id=*itag=302&source=yt_live_broadcast*"]});

chrome.pageAction.onClicked.addListener(function(tab) {
  if (isStreamingSite(tab.url) && canClipStream(tab)) {
    if (manager.isAvailable(tab.id)) {
      chrome.tabs.sendMessage(tab.id, {'getStreamTitle': true}, function(response) {
        clipStream(tab, response ? response.streamTitle : "", tab.url);
      });
    }
  }
  else {
    clipVideo(tab.url, {source: tab.url});
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

chrome.runtime.onMessage.addListener(function(request, sender) {
  if (request.clipVideo) {
    clipVideo(request.clipVideo, {source: request.source});
  } else if (request.clipStream && manager.isAvailable(sender.tab.id)) {
    clipStream(sender.tab, request.title, request.source);
  }
});

function buildSitesRegExp(sitePatterns) {
  return new RegExp(sitePatterns.join('|'), 'i');
}

function updateSitesRegExps(items) {
  VIDEO_SITES_RE = buildSitesRegExp(items.videoSites);
  STREAMING_SITES_RE = buildSitesRegExp(items.streamingSites);
}

function loadStoredSiteUrls() {
  chrome.storage.local.get({
    videoSites: [
      "(^https?://(?:.+\\.)?dailymotion\\.com\\/video\\/[^/]+$)",
      "(^https?://(?:.+\\.)?gfycat\\.com\\/[^/]+$)",
      "(^https?://(?:.+\\.)?vimeo\\.com\\/[^/]+$)",
      "(^https?://(?:.+\\.)?vimeo\\.com\\/channels\\/[^/]+\\/[^/]+$)",
      "(^https?://(?:.+\\.)?vimeo\\.com\\/groups\\/[^/]+\\/videos\\/[^/]+$)",
      "(^https?://(?:.+\\.)?vine\\.co\\/v\\/[^/]+$)",
      "(^https?://(?:.+\\.)?youtube\\.com\\/watch[^/]+$)"
    ],
    streamingSites: [
      "(^https?://(?:.+\\.)?twitch\\.tv\\/[^/]+$)",
      "(^https?://(?:.+\\.)?youtube\\.com\\/watch[^/]+$)"
    ]
  }, updateSitesRegExps);
}

function updateSiteUrls() {
  $.getJSON('http://streamable-extension.s3.amazonaws.com/chrome/sites.json', function(data) {
    chrome.storage.local.set(data, function() {
      updateSitesRegExps(data);
    });
  });
}

chrome.runtime.onInstalled.addListener(function() {
  //updateSiteUrls();
});

chrome.runtime.onStartup.addListener(function() {
  //updateSiteUrls();
});
