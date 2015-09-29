(function(w, document, chrome) {
  var onTwitch = /^https?:\/\/www\.twitch\.tv/.test(window.location.href), twitchAdNoticeEl;
  var hideClipIt = false;

  function cumulativeOffset(element) {
    var top = 0, left = 0;
    do {
      top += (element.offsetTop || 0) - (element.scrollTop || 0);
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while(element);
    return {
      top: top,
      left: left
    };
  }

  function shouldEnableHover() {
    var hasVideo = !!(document.body && document.body.querySelector('video'));
    return !hideClipIt && (hasVideo || onTwitch);
  }

  function adIsShowing() {
    return twitchAdNoticeEl && getComputedStyle(twitchAdNoticeEl, null).display !== 'none';
  }

  function shouldShowHover(el) {
    if (el.getAttribute('data-streamable-noclip') !== null) {
      return false;
    }
    if (adIsShowing()) {
      return false;
    }
    var hoveringVideo = el.tagName.toLowerCase() === 'video';
    var hoveringTwitchStream = onTwitch && (el.matches('object[id^=player]') || el.matches('.player-overlay'));
    return hoveringVideo || hoveringTwitchStream;
  }

  function getVideoSourceUrl(el) {
    var sourceUrls = [];
    if (el.src) {
      sourceUrls.push(el.src);
    }
    var sourceNodes = el.querySelectorAll('source');
    for (var i = 0; i < sourceNodes.length; i++) {
      sourceUrls.push(sourceNodes[i].src);
    }
    sourceUrls = sourceUrls.filter(function(url) {
      return !/^blob:/.test(url);
    });
    if (sourceUrls.length > 0) {
      return sourceUrls[0];
    }
  }

  function videoIsClippable(el) {
    return onTwitch || !!getVideoSourceUrl(el);
  }

  function getStreamTitle() {
    var title;
    if (onTwitch) {
      var titleNode = document.querySelector('#channel .info .title .real');
      if (titleNode) {
        title = titleNode.innerText;
      }
    }
    if (!title) {
      title = document.title;
    }
    return title;
  }

  function init() {
    var hover = {
      btn: null,
      video: null,
      showing: false,
      enabled: shouldEnableHover()
    }

    if (!hover.enabled) {
      return;
    }

    var btn = document.createElement('span');
    btn.style.display = 'none';
    btn.style.position = 'absolute';
    btn.style.top = 0;
    btn.style.left = 0;
    btn.style.width = '62px';
    btn.style.height = '21px';
    btn.style.backgroundImage = 'url(data:image/png;base64,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)';
    btn.style.backgroundSize = '62px 21px';
    btn.style.zIndex = '16777271';
    btn.style.cursor = 'pointer';
    btn.style.border = 'none';
    document.body.appendChild(btn);
    hover.btn = btn;

    function adjustHoverPosition(relativeEl) {
      var offset = cumulativeOffset(relativeEl);
      hover.btn.style.top = offset.top + 6 + 'px';
      hover.btn.style.left = offset.left + 6 + 'px';
    }

    document.body.addEventListener('mouseover', function(e) {
      if (e.target === hover.btn) {
        w.clearTimeout(hover.timer);
      }
      else if (shouldShowHover(e.target)) {
        if (!hover.showing && videoIsClippable(e.target)) {
          w.clearTimeout(hover.timer);
          hover.showing = true;
          adjustHoverPosition(e.target);
          hover.btn.style.display = 'block';
          hover.video = e.target;
        }
      }
    });

    document.body.addEventListener('mouseout', function() {
      if (hover.showing) {
        hover.showing = false;
        hover.timer = w.setTimeout(function() {
          hover.btn.style.display = 'none';
        }, 10);
      }
    });

    document.body.addEventListener('click', function(e) {
      if (e.target !== hover.btn) {
        return;
      }
      if (onTwitch) {
        chrome.runtime.sendMessage({
          clipStream: true,
          title: getStreamTitle(),
          source: window.location.href
        });
      } else if (videoIsClippable(hover.video)) {
        var sourceUrl = getVideoSourceUrl(hover.video);
        if (sourceUrl) {
          chrome.runtime.sendMessage({
            clipVideo: sourceUrl,
            title: document.title,
            source: window.location.href
          });
        }
      }
    });

    if (onTwitch) {
      var mainScrollEl = document.querySelector('#main_col .tse-scroll-content');
      if (!mainScrollEl) {
        return;
      }
      twitchAdNoticeEl = document.querySelector('.player .player-ad-notice');
      mainScrollEl.addEventListener('scroll', function() {
        var playerVideoEl = mainScrollEl.querySelector('.player .player-video');
        if (playerVideoEl) {
          adjustHoverPosition(playerVideoEl);
        }
      });
    }
  }

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var response = {};
    if (request.getStreamTitle) {
      response.streamTitle = getStreamTitle()
    }
    sendResponse(response);
  });

  chrome.storage.sync.get({hideClipIt: false}, function(items) {
    hideClipIt = items.hideClipIt;
    init();
  });
}(window, window.document, chrome));
