(function(w, document, chrome) {
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
    return !!document.body.querySelector('video');
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
    return !!getVideoSourceUrl(el);
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
    btn.style.width = '24px';
    btn.style.height = '24px';
    btn.style.backgroundImage = 'url(data:image/png;base64,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)';
    btn.style.backgroundSize = '24px 24px';
    btn.style.zIndex = '8675309';
    btn.style.cursor = 'pointer';
    btn.style.border = 'none';
    document.body.appendChild(btn);
    hover.btn = btn;

    document.body.addEventListener('mouseover', function(e) {
      if (e.target === hover.btn) {
        w.clearTimeout(hover.timer);
      }
      else if (e.target.tagName.toLowerCase() === 'video') {
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
      if (e.target === hover.btn && hover.video) {
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
