# Clipper for Chrome

This extension lets you create short video clips from Twitch live streams, YouTube vidoes, and a number of other sites.

When installed, a blue button will show up in the address bar if you're on a supported site. Just click on the button, set your desired crop/speed/duration settings, and click "Create Clip".

If you're logged into Streamable, video clips are saved to your account. If not, clips will be posted anonymously.

### Supported sites

* [Twitch](http://www.twitch.tv/)
* [YouTube](https://www.youtube.com/)
* [Dailymotion](http://www.dailymotion.com/)
* [Gfycat](https://gfycat.com/)
* [Vimeo](https://vimeo.com/)
* [Vine](https://vine.co/)

## Install

Install the extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/streamable-clipper/lfiibbceomojcojoaidegomjakaglgke).

## Development

Want to help out? [Open an issue](https://github.com/streamablevideo/chrome-extension/issues) or send us a [pull request](https://github.com/streamablevideo/chrome-extension/pulls)!

### Setup

Clone the repository. Install dependencies with `npm install`.

### Workflow

Load the src directory as an unpacked extension in [chrome://extensions](chrome://extensions). When you make changes, they are not automatically applied, but you can reload the extension from that page.

As you develop, run `make lint` to check code for issues.

### Distributing

Run `make` to generate a build of the extension.

To update the list of supported sites, update the patterns in sites.patterns.json and then run `make deploy-sites`.
