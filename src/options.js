function saveOptions() {
  var hideClipItEl = document.getElementById('hide-clip-it');
  hideClipItEl.disabled = true;
  chrome.storage.sync.set({
    hideClipIt: hideClipItEl.checked
  }, function() {
    hideClipItEl.disabled = false;
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    hideClipIt: false
  }, function(items) {
    document.getElementById('hide-clip-it').checked = items.hideClipIt;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('hide-clip-it').addEventListener('change', saveOptions);
