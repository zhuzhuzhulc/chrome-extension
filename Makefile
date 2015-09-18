SRC=src
ICONSRC=$(SRC)/icons
ICONS=$(addprefix $(ICONSRC)/,icon16.png icon19.png icon32.png icon38.png icon48.png icon96.png icon128.png)
MANIFEST=$(SRC)/manifest.json
MESSAGES=$(wildcard $(SRC)/_locales/*/*.json)
SCRIPTS=$(wildcard $(SRC)/*.js)
EXTENSION=streamable.crx

all: $(ICONS) $(EXTENSION)

$(EXTENSION): key.pem $(MANIFEST) $(ICONS) $(MESSAGES) $(SCRIPTS)
	npm run crx -- pack -o $@ -p key.pem $(SRC)

$(ICONSRC)/icon%.png: $(ICONSRC)/logo.png
	convert $< -resize $*x$* $@

lint:
	npm run lint -- $(SRC)

clean:
	rm $(EXTENSION)

.PHONY: all icons lint clean
