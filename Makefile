SRC=src
ICONSRC=$(SRC)/icons
ICONS=$(addprefix $(ICONSRC)/,icon16.png icon19.png icon32.png icon38.png icon48.png icon96.png icon128.png)
MANIFEST=$(SRC)/manifest.json
MESSAGES=$(wildcard $(SRC)/_locales/*/*.json)
SCRIPTS=$(wildcard $(SRC)/*.js)
EXTENSION=streamable.crx
SITES=sites.json

all: $(ICONS) $(SITES) $(EXTENSION)

$(EXTENSION): key.pem $(MANIFEST) $(ICONS) $(MESSAGES) $(SCRIPTS)
	npm run crx -- pack -o $@ -p key.pem $(SRC)

$(ICONSRC)/icon%.png: $(ICONSRC)/logo.png
	convert $< -resize $*x$* $@

$(SITES): sites.patterns.json
	node build-sites.js $< $@

deploy-sites: $(SITES)
	npm run s3-put -- $< s3://streamable-extension/chrome/$< --acl-public

lint:
	npm run lint -- $(SRC)

clean:
	-rm $(EXTENSION)
	-rm $(SITES)

.PHONY: all deploy-sites lint clean
