chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if (request && request.message === "save-clip") {
    var data = $('.chat-lines li').map(function() {
      var $this = $(this);

      return {
        timestamp: $this.find('.timestamp').text(),
        from: $this.find('.from').text(),
        message: $this.find('.message').text()
      }
    });

    sendResponse({ message: 'save-chat', data: data });
  }
});
