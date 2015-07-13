document.addEventListener('DOMContentLoaded', onReady, false);

function onReady() {
  document.querySelector('.save-clip').onclick = function() {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.runtime.sendMessage({ message: 'save-clip', tabTitle: tab.title, tabId: tab.id, url: tab.url });
    });
  }
}
