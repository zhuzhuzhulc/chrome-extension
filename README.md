# Streamable Clipper Chrome Extension

Instantly clip and share live streams and videos from Twitch, YouTube, and more!

Clip your favorite streams from around the web with the official Streamable Clipper for Chrome.

Just click the blue icon in the address bar to get started. Then set your desired crop, speed, and duration settings to create your shiny new Streamable video. Sweet!

If you're logged into Streamable, clips are saved to your account. If not, clips will be posted anonymously. Happy clipping!

### Supported sites

* [Dailymotion](http://www.dailymotion.com/)
* [Gfycat](https://gfycat.com/)
* [Twitch](http://www.twitch.tv/)
* [Vimeo](https://vimeo.com/)
* [Vine](https://vine.co/)
* [YouTube](https://www.youtube.com/)

## Install

Install the extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/streamable-clipper/lfiibbceomojcojoaidegomjakaglgke).

## Development

If you'd like to see a new site supported, [open an issue](https://github.com/streamablevideo/chrome-extension/issues) or send us a [pull request](https://github.com/streamablevideo/chrome-extension/pulls)!

### Setup

Clone the repository. Install dependencies with `npm install`.

### Workflow

Load the src directory as an unpacked extension in [chrome://extensions](chrome://extensions). When you make changes, they are not automatically applied, but you can reload the extension from that page.

As you develop, run `make lint` to check code for issues.

### Distributing

Run `make` to generate a build of the extension.

To update the list of supported sites, update the patterns in sites.patterns.json and then run `make deploy-sites`.
