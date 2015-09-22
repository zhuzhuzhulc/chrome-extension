(function(w, document, chrome) {
  var onTwitch = /^https?:\/\/www\.twitch\.tv/.test(window.location.href);

  function cumulativeOffset(element) {
    var top = 0, left = 0;
    do {
      top += element.offsetTop || 0;
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while(element);
    return {
      top: top,
      left: left
    };
  }

  function shouldEnableHover() {
    var hasVideo = !!document.body.querySelector('video');
    return hasVideo || onTwitch;
  }

  function shouldShowHover(el) {
    var hoveringVideo = el.tagName.toLowerCase() === 'video';
    var hoveringObject = el.tagName.toLowerCase() === 'object'
    return hoveringVideo || (onTwitch && hoveringObject);
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

  var hover = {
    btn: null,
    video: null,
    showing: false,
    enabled: shouldEnableHover()
  }

  if (hover.enabled) {
    var btn = document.createElement('span');
    btn.style.display = 'none';
    btn.style.position = 'absolute';
    btn.style.top = 0;
    btn.style.left = 0;
    btn.style.width = '25px';
    btn.style.height = '25px';
    btn.style.backgroundImage = 'url(data:image/png;base64,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)';
    btn.style.backgroundSize = '25px 25px';
    btn.style.zIndex = '8675309';
    btn.style.cursor = 'pointer';
    btn.style.border = 'none';
    document.body.appendChild(btn);
    hover.btn = btn;

    document.body.addEventListener('mouseover', function(e) {
      if (e.target === hover.btn) {
        w.clearTimeout(hover.timer);
      }
      else if (shouldShowHover(e.target)) {
        if (!hover.showing && videoIsClippable(e.target)) {
          w.clearTimeout(hover.timer);
          hover.showing = true;
          var offset = cumulativeOffset(e.target);
          hover.btn.style.top = offset.top + 5 + 'px';
          hover.btn.style.left = offset.left + 5 + 'px';
          hover.btn.style.display = 'block';
          hover.video = e.target;
        }
      }
    });

    document.body.addEventListener('mouseout', function(e) {
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
          title: document.title,
          source: window.location.href
        });
      } else if (videoIsClippable(e.target)) {
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
  }
}(window, window.document, chrome));
