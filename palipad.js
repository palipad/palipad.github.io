(function() {
    'use strict';

    // According to http://www.accesstoinsight.org/lib/diacritics.html#unicode
    var charMap = {
        'A': {'A': 'Ā', 'a': 'ā'},
        'a': {'A': 'Ā', 'a': 'ā'},
        'I': {'I': 'Ī', 'i': 'ī'},
        'i': {'I': 'Ī', 'i': 'ī'},
        'U': {'U': 'Ū', 'u': 'ū'},
        'u': {'U': 'Ū', 'u': 'ū'},
        '.': {
            'M': 'Ṃ', 'm': 'ṃ',
            'T': 'Ṭ', 't': 'ṭ',
            'D': 'Ḍ', 'd': 'ḍ',
            'N': 'Ṇ', 'n': 'ṇ',
            'L': 'Ḷ', 'l': 'ḷ'
        },
        '~': {'N': 'Ñ', 'n': 'ñ'},
        '"': {'N': 'Ṅ', 'n': 'ṅ'}
    };
    var pali2Raw = {
        'Ā': 'AA',
        'ā': 'aa',
        'Ī': 'II',
        'ī': 'ii',
        'Ū': 'UU',
        'ū': 'uu',
        'Ṃ': '.M',
        'ṃ': '.m',
        'Ṭ': '.T',
        'ṭ': '.t',
        'Ḍ': '.D',
        'ḍ': '.d',
        'Ṇ': '.N',
        'ṇ': '.n',
        'Ḷ': '.L',
        'ḷ': '.l',
        'Ñ': '~N',
        'ñ': '~n',
        'Ṅ': '"N',
        'ṅ': '"n'
    };

    var secondCharIndex = {};

    for (var firstChar in charMap) {
        for (var secondChar in charMap[firstChar]) {
            secondCharIndex[secondChar] = true;
        }
    }

    var KC_SHIFT = 16;
    var EC_KEY = 'EC_KEY';
    var EC_CLICK = 'EC_CLICK';
    var EC_FOCUS = 'EC_FOCUS';

    function Pad(elem) {
        this.elem = queryFirst(null, elem);
        this.menu = new Menu(this);

        this.shiftWait = false;  // shift down and waiting for pure shift up
        this.paliMode = true;
        this.maxCaretPosAge = 300;  // half second
        this.caretPosUpdatedTime = -this.maxCaretPosAge;  // force early update
        this.menuBlurDelay = 100;

        var pad = this;

        function listen(type, eventCat, func) {
            pad.elem.addEventListener(type, function(e) {
                pad.preUpdate(eventCat);

                if (func) {
                    func(e);
                }
                pad.update();
            });
        }

        listen('focus', EC_FOCUS, function(e) {
            pad.focus = true;
        });
        listen('blur', EC_FOCUS, function(e) {
            pad.focus = false;
        });
        listen('keydown', EC_KEY, function(e) {
            pad.shiftDown = e.shiftKey;
            pad.keyDown = true;
            pad.keyCode = e.keyCode;
        });
        listen('keyup', EC_KEY, function(e) {
            pad.shiftDown = e.shiftKey;
            pad.keyDown = false;
            pad.keyCode = e.keyCode;
        });
        listen('mouseup', EC_CLICK);
        listen('mousedown', EC_CLICK);
        listen('mouseenter', EC_CLICK);
        listen('mouseleave', EC_CLICK);

        this.preUpdate(EC_KEY);
        this.update();
    }
    Pad.prototype = {
        preUpdate: function(eventCat) {
            this.eventCat = eventCat;
            this.shiftDown = false;
            this.keyDown = false;
            this.keyCode = null;
        },
        update: function() {
            var menu = this.menu;

            if (this.eventCat === EC_FOCUS) {
                menu.setPaliMode(this.paliMode);
            }
            if (this.eventCat === EC_KEY || this.eventCat === EC_CLICK) {
                this.updatePaliMode();

                if (this.paliMode && !this.isTextSelected()) {
                    this.convertTyping();
                }
                this.updateMenuContent();
            }

            // getCaretCoordinates() is heavy, limiting its usage
            if (this.isTextSelected() || this.isCaretPositionExpired()) {
                this.updateCaretPosition();
                menu.setLeft(this.caretPos.left);
                menu.setTop(this.caretPos.top);
            }
            if (this.eventCat === EC_FOCUS) {
                if (this.focus) {
                    menu.setVisible(this.focus);
                } else {
                    var pad = this;
                    // Delay hiding menu to allow button to be clicked
                    setTimeout(function() {
                        menu.setVisible(pad.focus || menu.beingClicked);
                    }, this.menuBlurDelay);
                }
            }
        },
        updatePaliMode: function() {
            var updated = false;

            if (this.keyDown) {
                if (this.shiftDown || this.keyCode === KC_SHIFT) {
                    this.shiftWait = true;
                }
                if (this.keyCode !== KC_SHIFT) {
                    this.shiftWait = false;
                }
            } else {
                if (this.shiftWait && this.keyCode == KC_SHIFT) {
                    this.shiftWait = false;
                    this.paliMode = !this.paliMode;
                    updated = true;
                }
            }
            if (updated) {
                this.menu.setPaliMode(this.paliMode);
            }
        },
        isTextSelected: function() {
            return this.elem.selectionStart !== this.elem.selectionEnd;
        },
        updateMenuContent: function() {
            var contentMode = 'NOOP';

            if (this.isTextSelected()) {
                contentMode = 'CONVERT';
            } else {
                contentMode = this.paliMode ? 'TYPING' : 'NOOP';
            }
            this.menu.setContentMode(contentMode);
        },
        convertTyping: function() {
            // TODO: use convert() to reduce duplicate logic
            var end = this.elem.selectionEnd;
            var text = this.elem.value;
            var menu = this.menu;
            var lastPair = '  ';

            if (end > 1) {
                lastPair = text.substr(end - 2, 2);
            } else if (end > 0) {
                lastPair = ' ' + text.substr(end - 1, 1);
            }

            var paliChar = this.getPaliChar(lastPair);

            menu.chars = Object.keys(charMap);

            if (paliChar) {
                var keyChar = String.fromCharCode(this.keyCode);

                if (secondCharIndex[keyChar]) {
                    this.elem.value = text.substring(0, end - 2) + paliChar + text.substring(end);
                    this.elem.setSelectionRange(end - 1, end -1);
                } else {
                    // Don't convert if it's irrelevant key entered (e.g. arrow key)
                }
            } else {
                var charMap2 = charMap[lastPair[1]];

                if (charMap2) {
                    menu.chars = [];

                    for (var key in charMap2) {
                        menu.chars.push(charMap2[key]);
                    }
                }
            }
        },
        convertSelection: function() {
            var elem = this.elem;
            var value = elem.value;
            var left = value.substring(0, elem.selectionStart);
            var middle = convert(value.substring(elem.selectionStart, elem.selectionEnd));
            var right = value.substring(elem.selectionEnd);
            elem.value = left + middle + right;
            elem.selectionStart = left.length;
            elem.selectionEnd = left.length + middle.length;
        },
        isCaretPositionExpired: function() {
            var caretPosAge = performance.now() - this.caretPosUpdatedTime;
            return caretPosAge > this.maxCaretPosAge;
        },
        updateCaretPosition: function() {
            var el = this.elem;
            var pos = getCaretCoordinates(el, el.selectionEnd);
            var rect = el.getBoundingClientRect();
            var fontSize = parseInt(getComputedStyle(this.elem).fontSize);

            this.caretPos = {
                left: pos.left + rect.left - el.scrollLeft + fontSize,
                top: pos.top + rect.top - el.scrollTop + fontSize * 1.5
            };
            this.caretPosUpdatedTime = performance.now();
        },
        getPaliChar: function(pair) {
            var charMap2 = charMap[pair[0]];
            return charMap2 ? charMap2[pair[1]] : null;
        }
    };

    function Menu(pad) {
        this.pad = pad;
        this.chars = [];
        this.beingClicked = false;

        if (pad.elem.menuElem) {
            this.elem = pad.elem.menuElem;
        } else {
            this.elem = this.createElem();
            pad.elem.parentNode.insertBefore(this.elem, pad.elem);
            pad.elem.menuElem = this.elem;  // prevent duplicate menus
        }

        var menu = this

        this.elem.addEventListener('mousedown', function(e) {
            menu.beingClicked = true;
        });
        this.elem.addEventListener('mouseup', function(e) {
            menu.beingClicked = false;
        });
        this.query('kbd', function(elem) {
            elem.addEventListener('click', function() {
                var pad = menu.pad;
                // XXX: looks confusing
                pad.paliMode = !pad.paliMode;
                menu.setPaliMode(pad.paliMode);
                pad.updateMenuContent();
            });
        });
        this.query('button.convert', function(elem) {
            elem.addEventListener('click', function() {
                var pad = menu.pad;
                pad.convertSelection();
                pad.elem.focus();
            })
        });
        this.applyStyle();
    }
    Menu.prototype = {
        createElem: function() {
            var elem = document.createElement('div');
            elem.innerHTML = '\
                <h5 class="title">\
                    <div class="mode">\
                        ☸ <a target="_blank" href="https://palipad.github.io">Palipad</a>\
                        is <span class="on">on</span><span class="off">OFF</span>\
                    </div>\
                    <kbd>⇧Shift</kbd>\
                </h5>\
                <div class="content">\
                    <pre class="chars"></pre>\
                    <button class="convert btn btn-primary button">Convert selection</button>\
                </div>\
            ';
            return elem;
        },
        query: function(selectors, callback) {
            var menu = this;

            return query(this.elem, selectors, function(elem) {
                callback.call(menu, elem);
            });
        },
        queryStyle: function(selectors, callback) {
            return this.query(selectors, function(elem) {
                callback(elem.style);
            });
        },
        display: function(selectors, visible, visibleStyle) {
            this.queryStyle(selectors, function(style) {
                if (visible === undefined) {
                    visible = true;
                }
                if (visibleStyle === undefined) {
                    visibleStyle = 'block';
                }
                style.display = visible ? visibleStyle : 'none';
            });
        },
        applyStyle: function() {
            var style = this.elem.style;
            style.display = 'none';
            style.position = 'absolute';
            style.padding = '0.25em';
            style.backgroundColor = '#fff';
            style.boxShadow = '0 0 0.25em 0.1em rgba(0,0,0,0.5)';
            style.borderRadius = '0.25em';

            this.queryStyle('.title', function(style) {
                style.margin = '0.25em';
                style.padding = '0';
            });
            this.display('.mode', true, 'inline-block');
            this.queryStyle('.content', function(style) {
                style.display = 'none';
                style.padding = '0.25em';
            });
            this.queryStyle('.chars', function(style) {
                style.margin = '0';
            });
            this.queryStyle('button.convert', function(style) {
                style.margin = 'auto';
            });
            this.queryStyle('kbd', function(style) {
                style.float = 'right';
                style.marginLeft = '0.5em';
                style.cursor = 'pointer';
            });
        },
        setVisible: function(visible) {
            this.elem.style.display = visible ? 'inline-block' : 'none';
        },
        setLeft: function(left) {
            this.elem.style.left = left + 'px';
        },
        setTop: function(top) {
            this.elem.style.top = top + 'px';
        },
        setPaliMode: function(paliMode) {
            this.display('.on', paliMode, 'inline-block');
            this.display('.off', !paliMode, 'inline-block');
        },
        setContentMode: function(contentMode) {
            this.display('.chars', false);
            this.display('button.convert', false);

            if (contentMode === 'TYPING') {
                this.display('.content');
                this.display('.chars', true);
                this.query('.chars', function(elem) {
                    elem.textContent = this.chars.join(' ');
                });
            } else if (contentMode === 'CONVERT') {
                this.display('.content');
                this.display('button.convert');
            } else if (contentMode === 'NOOP') {
                this.display('.content', false);
            } else {
                throw new Error('Invalid contentMode ' + JSON.stringify(contentMode));
            }
        }
    };

    function query(root, selectors, callback) {
        if (!root) {
            root = document;
        }

        if (typeof selectors === 'string') {
            var elems = root.querySelectorAll(selectors);
        } else {
            var elems = [selectors];  // assume it's element
        }

        if (callback) {
            for (var i = 0; i < elems.length; i++) {
                callback.call(root, elems[i]);
            }
        }
        return elems;
    }

    function queryFirst(rootElem, selectors, callback) {
        var elems = query(rootElem, selectors, callback);

        if (elems.length < 1) {
            throw new Error('Could not find first ' + selectors + ' in ' + rootElem)
        }
        return elems[0];
    }

    function convert(str) {
        function pair(ch, ch2) {
            var charMap2 = charMap[ch];

            if (charMap2) {
                return charMap2[ch2];
            }
        }

        if (str.length < 2) {
            return str;
        }

        var res = [str[0]];

        for (var i = 1; i < str.length; i++) {
            var ch = res.pop();
            var ch2 = str[i];
            var paliCh = pair(ch, ch2);

            if (paliCh) {
                res.push(paliCh);
            } else {
                res.push(ch);
                res.push(ch2);
            }
        }
        return res.join('');
    }

    function create(selectors) {
        query(null, selectors, function(elem) {
            console.log(elem);
            new Pad(elem);
        });
    }

    window.palipad = {
        Pad: Pad,
        Menu: Menu,
        convert: convert,
        create: create
    };
})();

// Source: https://raw.githubusercontent.com/component/textarea-caret-position/master/index.js
// Commit: 57ba3607ea3d060d7571e6a74d6700ec88f29974
(function () {

  // The properties that we copy into a mirrored div.
  // Note that some browsers, such as Firefox,
  // do not concatenate properties, i.e. padding-top, bottom etc. -> padding,
  // so we have to do every single property specifically.
  var properties = [
    'direction',  // RTL support
    'boxSizing',
    'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
    'height',
    'overflowX',
    'overflowY',  // copy the scrollbar for IE

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    // https://developer.mozilla.org/en-US/docs/Web/CSS/font
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',  // might not make a difference, but better be safe

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize'

  ];

  var isBrowser = (typeof window !== 'undefined');
  var isFirefox = (isBrowser && window.mozInnerScreenX != null);

  function getCaretCoordinates(element, position, options) {
    if(!isBrowser) {
      throw new Error('textarea-caret-position#getCaretCoordinates should only be called in a browser');
    }

    var debug = options && options.debug || false;
    if (debug) {
      var el = document.querySelector('#input-textarea-caret-position-mirror-div');
      if ( el ) { el.parentNode.removeChild(el); }
    }

    // mirrored div
    var div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    var style = div.style;
    var computed = window.getComputedStyle? getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9

    // default textarea styles
    style.whiteSpace = 'pre-wrap';
    if (element.nodeName !== 'INPUT')
      style.wordWrap = 'break-word';  // only for textarea-s

    // position off-screen
    style.position = 'absolute';  // required to return coordinates properly
    if (!debug)
      style.visibility = 'hidden';  // not 'display: none' because we want rendering

    // transfer the element's properties to the div
    properties.forEach(function (prop) {
      style[prop] = computed[prop];
    });

    if (isFirefox) {
      // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
      if (element.scrollHeight > parseInt(computed.height))
        style.overflowY = 'scroll';
    } else {
      style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
    }

    div.textContent = element.value.substring(0, position);
    // the second special handling for input type="text" vs textarea: spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    if (element.nodeName === 'INPUT')
      div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    var span = document.createElement('span');
    // Wrapping must be replicated *exactly*, including when a long word gets
    // onto the next line, with whitespace at the end of the line before (#7).
    // The  *only* reliable way to do that is to copy the *entire* rest of the
    // textarea's content into the <span> created at the caret position.
    // for inputs, just '.' would be enough, but why bother?
    span.textContent = element.value.substring(position) || '.';  // || because a completely empty faux span doesn't render at all
    div.appendChild(span);

    var coordinates = {
      top: span.offsetTop + parseInt(computed['borderTopWidth']),
      left: span.offsetLeft + parseInt(computed['borderLeftWidth'])
    };

    if (debug) {
      span.style.backgroundColor = '#aaa';
    } else {
      document.body.removeChild(div);
    }

    return coordinates;
  }

  if (typeof module != 'undefined' && typeof module.exports != 'undefined') {
    module.exports = getCaretCoordinates;
  } else if(isBrowser){
    window.getCaretCoordinates = getCaretCoordinates;
  }

}());
