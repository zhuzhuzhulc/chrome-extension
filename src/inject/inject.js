chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
  	if (document.readyState === "complete") {
  		clearInterval(readyStateCheckInterval);

  		// ----------------------------------------------------------
  		// This part of the script triggers when page is done loading
  		console.log("Hello. This message was sent from scripts/inject.js");
  		// ----------------------------------------------------------

  	}
	}, 10);
});

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request);
  switch (request.message) {
    case "file-ready":
      var x = new XMLHttpRequest();
      x.open('GET', request.url);
      x.responseType = 'blob';
      x.onload = function() {
        var formData = new FormData();
        formData.append("file", x.response);

        $.ajax({
          url: "https://api.streamable.com/upload",
          method: "POST",
          data: formData,
          processData: false,
          contentType: false,
          beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa('switz:123456'));
          },
          success: function(data) {
            console.log(data);
            if (!data || !data.length) return;

            window.location = "http://streamable.com/" + data[0].shortcode;
          },
          error: function(err) {
            console.log(err);
          }
        });

        /*
        var url = URL.createObjectURL(x.response);
        var video = document.createElement('video');

        video.src = url;
        video.controls = true;
        document.body.appendChild(video);
        */
      };
      x.send();
      break;
  }
});
