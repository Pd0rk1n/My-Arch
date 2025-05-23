/*
 * This file is part of Privacy Badger <https://privacybadger.org/>
 * Copyright (C) 2014 Electronic Frontier Foundation
 *
 * Derived from ShareMeNot
 * Copyright (C) 2011-2014 University of Washington
 *
 * Privacy Badger is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Privacy Badger is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Privacy Badger.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * ShareMeNot is licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright (c) 2011-2014 University of Washington
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function () {

// don't inject into non-HTML documents (such as XML documents)
// but do inject into XHTML documents
if (document instanceof HTMLDocument === false && (
  document instanceof XMLDocument === false ||
  document.createElement('div') instanceof HTMLDivElement === false
)) {
  return;
}

function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// widget data
let widgetList;

// cached chrome.i18n.getMessage() results
const TRANSLATIONS = {};

// references to widget page elements
const WIDGET_ELS = {};

let doNotReplace = new WeakSet();

// if the widget element lacks a src property,
// try to use the following dataset properties instead
const lazyLoadDatasetSrcProps = [
  "src",
  "ezsrc"
];

/**
 * @param {Object} response response to checkWidgetReplacementEnabled
 */
function init(response) {
  const FRAME_ID = response.frameId;

  for (const key in response.translations) {
    TRANSLATIONS[key] = response.translations[key];
  }

  widgetList = response.widgetList;

  // check for widgets blocked before we got here
  replaceInitialTrackerButtonsHelper(response.widgetsToReplace);

  // set up listener for dynamically created widgets
  chrome.runtime.onMessage.addListener(function (request) {
    // blocked something, see if this is a widget domain that should be replaced
    if (request.type == "replaceWidget") {
      if (request.frameId === FRAME_ID) {
        replaceSubsequentTrackerButtonsHelper(request.trackerDomain);
      }

    // widget replacement initiated by a surrogate script
    } else if (request.type == "replaceWidgetFromSurrogate") {
      if (request.frameId === FRAME_ID) {
        replaceIndividualButton(request.widget);
      }
    }
  });
}

/**
 * Creates a replacement placeholder element for the given widget.
 *
 * @param {Object} widget the SocialWidget object
 * @param {Element} trackerElem the button/widget element we are replacing
 * @param {Function} callback called with the replacement element
 */
function createReplacementElement(widget, trackerElem, callback) {
  let buttonData = widget.replacementButton;

  // no image data to fetch
  if (!hasOwn(buttonData, 'imagePath')) {
    return setTimeout(function () {
      _createReplacementElementCallback(widget, trackerElem, callback);
    }, 0);
  }

  // already have replacement button image URI cached
  if (buttonData.buttonUrl) {
    return setTimeout(function () {
      _createReplacementElementCallback(widget, trackerElem, callback);
    }, 0);
  }

  // already messaged for but haven't yet received the image data
  if (buttonData.loading) {
    // check back in 10 ms
    return setTimeout(function () {
      createReplacementElement(widget, trackerElem, callback);
    }, 10);
  }

  // don't have image data cached yet, get it from the background page
  buttonData.loading = true;
  chrome.runtime.sendMessage({
    type: "getReplacementButton",
    widgetName: widget.name
  }, function (response) {
    if (response) {
      buttonData.buttonUrl = response; // cache image data
      _createReplacementElementCallback(widget, trackerElem, callback);
    }
  });
}

function _createReplacementElementCallback(widget, trackerElem, callback) {
  if (widget.replacementButton.buttonUrl) {
    _createButtonReplacement(widget, callback);
  } else {
    _createWidgetReplacement(widget, trackerElem, callback);
  }
}

function _createButtonReplacement(widget, callback) {
  let buttonData = widget.replacementButton,
    button_type = buttonData.type;

  let button = document.createElement("img");
  button.setAttribute("src", buttonData.buttonUrl);

  // TODO use custom tooltip to support RTL locales?
  button.setAttribute(
    "title",
    TRANSLATIONS.social_tooltip_pb_has_replaced.replace("XXX", widget.name)
  );

  let styleAttrs = [
    "border: none",
    "cursor: pointer",
    "height: auto",
    "width: auto",
  ];
  button.setAttribute("style", styleAttrs.join(" !important;") + " !important");

  // normal button type; just open a new window when clicked
  if (button_type === 0) {
    let popup_url = buttonData.details + encodeURIComponent(window.location.href);

    button.addEventListener("click", function (e) {
      if (!e.isTrusted) { return; }
      window.open(popup_url);
    });

  // in place button type; replace the existing button
  // with an iframe when clicked
  } else if (button_type == 1) {
    let iframe_url = buttonData.details + encodeURIComponent(window.location.href);

    button.addEventListener("click", function (e) {
      if (!e.isTrusted) { return; }
      replaceButtonWithIframeAndUnblockTracker(button, widget.name, iframe_url);
    }, { once: true });
  }

  callback(button);
}

function _createWidgetReplacement(widget, trackerElem, callback) {
  let replacementEl;

  // in-place widget types:
  //
  // type 3:
  // reinitialize the widget by reinserting its element's HTML
  //
  // type 4:
  // reinitialize the widget by reinserting its element's HTML
  // and activating associated scripts
  if ([3, 4].includes(widget.replacementButton.type)) {
    replacementEl = createReplacementWidget(widget, trackerElem);
  }

  callback(replacementEl);
}

/**
 * Unblocks the given widget and replaces the given button with an iframe
 * pointing to the given URL.
 *
 * @param {Element} button the DOM element of the button to replace
 * @param {String} widget_name the name of the replacement widget
 * @param {String} iframeUrl the URL of the iframe to replace the button
 */
function replaceButtonWithIframeAndUnblockTracker(button, widget_name, iframeUrl) {
  unblockTracker(widget_name, function () {
    // check is needed as for an unknown reason this callback function is
    // executed for buttons that have already been removed; we are trying
    // to prevent replacing an already removed button
    if (button.parentNode !== null) {
      let iframe = document.createElement("iframe");

      iframe.setAttribute("src", iframeUrl);
      iframe.setAttribute("style", "border: none !important; height: 1.5em !important;");

      button.parentNode.replaceChild(iframe, button);
    }
  });
}

/**
 * Unblocks the given widget and replaces our replacement placeholder
 * with the original third-party widget element.
 *
 * Reruns scripts defined in scriptSelectors, if any.
 *
 * The teardown to the initialization defined in createReplacementWidget().
 */
function restoreWidget(widget) {
  let name = widget.name;

  if (widget.reloadOnActivation) {
    unblockTracker(name, function () {
      location.reload();
    });
    return;
  }

  if (widget.scriptSelectors) {
    if (widget.scriptSelectors.some(i => i.includes("onload\\=vueRecaptchaApiLoaded"))) {
      // we can't do "in-place" activation; reload the page instead
      unblockTracker(name, function () {
        location.reload();
      });
      return;
    }

    // if there are no matching script elements
    if (!document.querySelectorAll(widget.scriptSelectors.join(',')).length) {
      // we can't do "in-place" activation; reload the page instead
      unblockTracker(name, function () {
        location.reload();
      });
      return;
    }
  }

  unblockTracker(name, function () {
    // restore all widgets of this type
    WIDGET_ELS[name].forEach(data => {
      if (!data.origWidgetElem.src) {
        for (let prop of lazyLoadDatasetSrcProps) {
          if (data.origWidgetElem.dataset[prop]) {
            data.origWidgetElem.src = data.origWidgetElem.dataset[prop];
            break;
          }
        }
      }
      data.parentNode.replaceChild(data.origWidgetElem, data.replacement);
      if (data.scriptSelectors) {
        // This is part of "click-to-play" for third-party page widgets:
        // https://privacybadger.org/#How-does-Privacy-Badger-handle-social-media-widgets
        //
        // This is the part where the user chooses to activate the widget.
        // Some widgets are driven by JavaScript; their JavaScript needs
        // to be reloaded in order for the widget to function.
        //
        // Privacy Badger empowers the user to load certain widgets on demand,
        // instead of continuing to let them load by default, without a choice.
        //
        // Any script reinserted here is a script that would have
        // run on the page anyway, had Privacy Badger not blocked it.
        // This should not fall under remote code review considerations.
        chrome.runtime.sendMessage({
          type: "reloadWidgetScripts",
          selectors: data.scriptSelectors
        });
      }
    });
    WIDGET_ELS[name] = [];
  });
}

/**
 * Replaces all tracker buttons on the current web page with the internal
 * replacement buttons, respecting the user's blocking settings.
 *
 * @param {Object} widgetsToReplace an object with keys set to widget names
 */
function replaceInitialTrackerButtonsHelper(widgetsToReplace) {
  widgetList.forEach(function (widget) {
    if (hasOwn(widgetsToReplace, widget.name)) {
      replaceIndividualButton(widget);
    }
  });
}

/**
 * Individually replaces tracker buttons blocked after initial check.
 */
function replaceSubsequentTrackerButtonsHelper(tracker_domain) {
  if (!widgetList) {
    return;
  }
  widgetList.forEach(function (widget) {
    let replace = widget.domains.some(domain => {
      if (domain == tracker_domain) {
        return true;
      // leading wildcard
      } else if (domain[0] == "*") {
        if (tracker_domain.endsWith(domain.slice(1))) {
          return true;
        }
      }
      return false;
    });
    if (replace) {
      replaceIndividualButton(widget);
    }
  });
}

function _make_id(prefix) {
  return prefix + "-" + Math.random().toString().replace(".", "");
}

function createReplacementWidget(widget, elToReplace) {
  if (!elToReplace.parentNode) {
    return null;
  }

  let name = widget.name;

  let widgetFrame = document.createElement('iframe');

  // widget replacement frame styles
  let border_width = 1;
  let styleAttrs = [
    "background-color: #fff",
    "border: " + border_width + "px solid #ec9329",
    "min-width: 220px",
    "min-height: 210px",
    "max-height: 600px",
    "pointer-events: all",
    "z-index: 999",
  ];
  // TODO shouldn't need this (nor !important, nor _make_id, nor ...) if we use shadow DOM
  let elToReplaceStyles = window.getComputedStyle(elToReplace);
  if (elToReplaceStyles.position == "absolute") {
    styleAttrs.push("position: absolute");
    for (let prop of ["width", "height", "top", "right", "bottom", "left"]) {
      let val = elToReplaceStyles[prop];
      if (!val) {
        continue;
      }
      if (prop == "width" || prop == "height") {
        if (elToReplaceStyles['box-sizing'] == 'content-box') {
          if (Number.isInteger(val) || val.endsWith("px")) {
            val = `${parseInt(val, 10) - 2*border_width}px`;
          }
        }
      }
      styleAttrs.push(prop + ": " + val);
    }
  } else {
    if (elToReplace.offsetWidth > 0) {
      if (elToReplaceStyles['box-sizing'] == 'content-box') {
        styleAttrs.push(`width: ${elToReplace.offsetWidth - 2*border_width}px`);
      } else {
        styleAttrs.push(`width: ${elToReplace.offsetWidth}px`);
      }
    }
    if (elToReplace.offsetHeight > 0) {
      if (elToReplaceStyles['box-sizing'] == 'content-box') {
        styleAttrs.push(`height: ${elToReplace.offsetHeight - 2*border_width}px`);
      } else {
        styleAttrs.push(`height: ${elToReplace.offsetHeight}px`);
      }
    }
  }
  widgetFrame.style = styleAttrs.join(" !important;") + " !important";

  let widgetDiv = document.createElement('div');

  // parent div styles
  styleAttrs = [
    "display: flex",
    "flex-direction: column",
    "align-items: center",
    "justify-content: center",
    "width: 100%",
    "height: 100%",
  ];
  if (TRANSLATIONS.rtl) {
    styleAttrs.push("direction: rtl");
  }
  widgetDiv.style = styleAttrs.join(" !important;") + " !important";

  // child div styles
  styleAttrs = [
    "font-family: helvetica, arial, sans-serif",
    "font-size: 16px",
    "display: flex",
    "flex-wrap: wrap",
    "justify-content: center",
    "text-align: center",
    "margin: 10px",
  ];

  let textDiv = document.createElement('div');
  textDiv.style = styleAttrs.join(" !important;") + " !important";

  let summary = TRANSLATIONS.widget_placeholder_pb_has_replaced.replace("XXX", name),
    link_start = "YYY",
    link_end = "ZZZ";

  // get a direct link to widget content when available
  let widget_url,
    node_name = elToReplace.nodeName.toLowerCase();
  if (widget.directLinkUrl) {
    widget_url = widget.directLinkUrl;
  } else if (node_name == 'iframe' && !widget.noDirectLink) {
    // use the frame URL for framed widgets
    if (elToReplace.src) {
      widget_url = elToReplace.src;
      if (widget_url.startsWith("https://embed.bsky.app/embed/")) {
        // Bluesky
        let buri = (new URL(widget_url)).pathname.split("/");
        if (buri[2] && buri[2].startsWith("did:") && buri[4]) {
          widget_url = "https://bsky.app/profile/" + buri[2] + "/post/" + buri[4];
        }
      }
    } else {
      for (let prop of lazyLoadDatasetSrcProps) {
        if (elToReplace.dataset[prop]) {
          widget_url = elToReplace.dataset[prop];
          break;
        }
      }
    }
  } else if (node_name == 'blockquote') {
    if (elToReplace.cite && elToReplace.cite.startsWith('https://www.tiktok.com/@')) {
      // TikTok
      widget_url = elToReplace.cite;
    } else if (elToReplace.className.includes("twitter-tweet") || elToReplace.className.includes("twitter-video")) {
      // Twitter
      let lastLink = Array.from(elToReplace.querySelectorAll("a[href^='https://twitter.com/']")).slice(-1)[0];
      if (lastLink) {
        widget_url = lastLink.href;
      }
    } else if (elToReplace.dataset && elToReplace.dataset.textPostPermalink && elToReplace.dataset.textPostPermalink.startsWith('https://www.threads.net/')) {
      // Threads
      widget_url = elToReplace.dataset.textPostPermalink;
    } else if (elToReplace.dataset && elToReplace.dataset.blueskyUri) {
      // Bluesky
      let buri = elToReplace.dataset.blueskyUri.split('/');
      if (buri[0] && buri[0] == "at:" && buri[2] && buri[2].startsWith("did:") && buri[4]) {
        widget_url = "https://bsky.app/profile/" + buri[2] + "/post/" + buri[4];
      }
    } else if (elToReplace.dataset && elToReplace.dataset.instgrmPermalink && elToReplace.dataset.instgrmPermalink.startsWith('https://www.instagram.com/')) {
      // Instagram
      widget_url = elToReplace.dataset.instgrmPermalink;
    }
  } else if (node_name == 'amp-twitter') {
    // AMP Twitter
    let tweet_id = elToReplace.dataset && elToReplace.dataset.tweetid &&
      elToReplace.dataset.tweetid.replace(/[^0-9]/g, '');
    if (tweet_id) {
      widget_url = "https://twitter.com/x/status/" + tweet_id;
    }
  } else if (node_name == 'amp-instagram') {
    // AMP Instagram
    let shortcode = elToReplace.dataset && elToReplace.dataset.shortcode &&
      elToReplace.dataset.shortcode.replace(/^0-9A-Za-z/g, '');
    if (shortcode) {
      widget_url = "https://www.instagram.com/p/" + shortcode;
    }
  }

  if (widget_url) {
    // construct link to original widget frame
    let text_before = summary.slice(0, summary.indexOf(link_start)),
      text_after = summary.slice(summary.indexOf(link_end) + link_end.length),
      link_text = summary.slice(
        summary.indexOf(link_start) + link_start.length, summary.indexOf(link_end));

    // nest in a wrapper to preserve whitespace (flexbox)
    let wrapperDiv = document.createElement("div");

    if (text_before) {
      wrapperDiv.appendChild(document.createTextNode(text_before));
    }

    let widgetLink = document.createElement("a");
    widgetLink.href = widget_url;
    widgetLink.rel = "noreferrer";
    widgetLink.target = "_blank";
    widgetLink.appendChild(document.createTextNode(link_text));
    wrapperDiv.appendChild(widgetLink);

    if (text_after) {
      wrapperDiv.appendChild(document.createTextNode(text_after));
    }

    textDiv.appendChild(wrapperDiv);

  } else {
    // no link to construct, remove the link markers
    summary = summary.replace(link_start, "").replace(link_end, "");
    textDiv.appendChild(document.createTextNode(summary));
  }

  let closeIcon = document.createElement('a'),
    close_icon_id = _make_id("ico-close");
  closeIcon.id = close_icon_id;
  closeIcon.href = "javascript:void(0)"; // eslint-disable-line no-script-url
  textDiv.appendChild(closeIcon);

  let infoIcon = document.createElement('a'),
    info_icon_id = _make_id("ico-help");
  infoIcon.id = info_icon_id;
  infoIcon.href = "https://privacybadger.org/#How-does-Privacy-Badger-handle-social-media-widgets";
  infoIcon.rel = "noreferrer";
  infoIcon.target = "_blank";
  textDiv.appendChild(infoIcon);
  widgetDiv.appendChild(textDiv);

  let buttonDiv = document.createElement('div');
  styleAttrs.push("width: 100%");
  buttonDiv.style = styleAttrs.join(" !important;") + " !important";

  // allow once button
  let button = document.createElement('button'),
    button_id = _make_id("btn-once");
  button.id = button_id;
  styleAttrs = [
    "transition: background-color 0.25s ease-out, border-color 0.25s ease-out, color 0.25s ease-out",
    "border-radius: 3px",
    "cursor: pointer",
    // systemfontstack.com
    "font-family: -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, liberation sans, Ubuntu, helvetica neue, helvetica, Cantarell, roboto, noto, arial, sans-serif",
    "font-size: 14px",
    "font-weight: bold",
    // fix overly bold text on macOS
    "-webkit-font-smoothing: antialiased",
    "-moz-osx-font-smoothing: grayscale",
    "line-height: 16px",
    "padding: 10px",
    "margin: 4px",
    "width: 70%",
    "max-width: 280px",
  ];
  button.style = styleAttrs.join(" !important;") + " !important";

  // allow on this site button
  let site_button = document.createElement('button'),
    site_button_id = _make_id("btn-site");
  site_button.id = site_button_id;
  site_button.style = styleAttrs.join(" !important;") + " !important";

  button.appendChild(document.createTextNode(TRANSLATIONS.allow_once));
  site_button.appendChild(document.createTextNode(TRANSLATIONS.allow_on_site));

  buttonDiv.appendChild(button);
  buttonDiv.appendChild(site_button);

  widgetDiv.appendChild(buttonDiv);

  // save refs. to elements for use in teardown
  if (!hasOwn(WIDGET_ELS, name)) {
    WIDGET_ELS[name] = [];
  }
  let data = {
    parentNode: elToReplace.parentNode,
    replacement: widgetFrame,
    origWidgetElem: elToReplace
  };
  if (widget.scriptSelectors) {
    data.scriptSelectors = widget.scriptSelectors;
  }
  WIDGET_ELS[name].push(data);

  // set up click handler
  widgetFrame.addEventListener('load', function () {
    let onceButton = widgetFrame.contentDocument.getElementById(button_id),
      siteButton = widgetFrame.contentDocument.getElementById(site_button_id),
      closeLink = widgetFrame.contentDocument.getElementById(close_icon_id);

    onceButton.addEventListener("click", function (e) {
      if (!e.isTrusted) { return; }
      e.preventDefault();
      restoreWidget(widget);
    }, { once: true });

    siteButton.addEventListener("click", function (e) {
      if (!e.isTrusted) {
        return;
      }

      e.preventDefault();

      // first message the background page to record that
      // this widget should always be allowed on this site
      chrome.runtime.sendMessage({
        type: "allowWidgetOnSite",
        widgetName: name
      }, function () {
        restoreWidget(widget);
      });
    }, { once: true });

    closeLink.addEventListener("click", function (e) {
      if (!e.isTrusted) {
        return;
      }
      e.preventDefault();
      WIDGET_ELS[name] = WIDGET_ELS[name].filter(d => d.replacement != widgetFrame);
      doNotReplace.add(elToReplace);
      widgetFrame.replaceWith(elToReplace);
    }, { once: true });

  }, false); // end of click handler

  let head_styles = `
html, body {
  color: #303030 !important;
  height: 100% !important;
  overflow: hidden !important;
}
#${button_id} {
  border: 2px solid #f06a0a !important;
  background-color: #f06a0a !important;
  color: #fefefe !important;
}
#${site_button_id} {
  border: 2px solid #333 !important;
  background-color: #fefefe !important;
  color: #333 !important;
}
#${button_id}:hover {
  background-color: #fefefe !important;
  color: #333 !important;
}
#${site_button_id}:hover {
  background-color: #fefefe !important;
  border: 2px solid #f06a0a !important;
}
#${info_icon_id}, #${close_icon_id} {
  position: absolute;
  ${TRANSLATIONS.rtl ? "left" : "right"}: 4px;
  top: 4px;
  text-align: center;
  text-decoration: none;
}
#${close_icon_id} {
  ${TRANSLATIONS.rtl ? "right" : "left"}: 4px;
  width: 20px;
  ${TRANSLATIONS.rtl ? "left" : "right"}: unset;
}
#${info_icon_id}:before, #${close_icon_id}:before {
  border: 2px solid;
  border-radius: 50%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: #555;
  content: '?';
  font-family: -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, liberation sans, Ubuntu, helvetica neue, helvetica, Cantarell, roboto, noto, arial, sans-serif;
  font-size: 12px;
  font-weight: bold;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 1px;
  height: 1em;
  width: 1em;
}
#${close_icon_id}:before {
  border: 0;
  content: '\u2715';
  padding: 4px;
}
#${info_icon_id}:hover:before, #${close_icon_id}:hover:before {
  color: #ec9329;
}
a {
  text-decoration: underline;
  color: black;
}
a:hover {
  color: #ec9329;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
  }
  body {
    background-color: #333 !important;
    color: #ddd !important;
  }
  a, a:visited {
    color: #ddd !important;
  }
  a:hover {
    color: #f06a0a !important;
  }
  #${info_icon_id}:before, #${close_icon_id}:before {
    color: #aaa;
  }
  #${site_button_id} {
    background-color: #333 !important;
    border: solid 2px #ddd !important;
    color: #ddd !important;
  }
  #${button_id}:hover, #${site_button_id}:hover {
    background-color: #333 !important;
    color: #ddd !important;
  }
}
  `.trim();

  widgetFrame.srcdoc = '<html><head><style>' + head_styles + '</style></head><body style="margin:0">' + widgetDiv.outerHTML + '</body></html>';

  return widgetFrame;
}

/**
 * Replaces buttons/widgets in the DOM.
 */
function replaceIndividualButton(widget) {
  let elsToReplace = [];

  if (widget.buttonSelectors) {
    elsToReplace = document.querySelectorAll(widget.buttonSelectors.join(','));
  } else if (widget.selectors) {
    let selectors = [];
    for (let item of widget.selectors) {
      for (let url of item.urls) {
        selectors.push(`${item.elm}[src^='${url}']`);
        for (let prop of lazyLoadDatasetSrcProps) {
          selectors.push(`${item.elm}[data-${prop}^='${url}']`);
        }
      }
    }
    elsToReplace = document.querySelectorAll(selectors.join(','));
  }

  for (let el of elsToReplace) {
    if (doNotReplace.has(el)) {
      continue;
    }
    // also don't replace if we think we currently have a placeholder
    // for this widget type attached to the same parent element
    if (hasOwn(WIDGET_ELS, widget.name)) {
      if (WIDGET_ELS[widget.name].some(d => d.parentNode == el.parentNode)) {
        // something went wrong, give up
        continue;
      }
    }
    // also don't replace if we're in an AMP frame,
    // as our placeholder sizing doesn't work inside AMP frames,
    // and we can instead replace higher-level <amp-*> elements
    if (document.location.hostname.endsWith(".ampproject.net")) {
      continue;
    }
    createReplacementElement(widget, el, function (replacementEl) {
      if (replacementEl) {
        el.parentNode.replaceChild(replacementEl, el);
      }
    });
  }
}

/**
 * Messages the background page to temporarily allow domains associated with a
 * given replacement widget.
 * Calls the provided callback function upon response.
 *
 * @param {String} name the name of the replacement widget
 * @param {Function} callback the callback function
 */
function unblockTracker(name, callback) {
  chrome.runtime.sendMessage({
    type: "unblockWidget",
    widgetName: name
  }, callback);
}

// END FUNCTION DEFINITIONS ///////////////////////////////////////////////////

chrome.runtime.sendMessage({
  type: "checkWidgetReplacementEnabled"
}, function (response) {
  if (!response) {
    return;
  }

  init(response);

  chrome.runtime.sendMessage({
    type: "widgetReplacementReady"
  });
});

}());
