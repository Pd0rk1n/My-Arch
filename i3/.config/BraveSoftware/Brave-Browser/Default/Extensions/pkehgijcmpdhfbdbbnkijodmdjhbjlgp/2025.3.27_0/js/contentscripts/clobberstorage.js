/*
 * This file is part of Privacy Badger <https://privacybadger.org/>
 * Copyright (C) 2024 Electronic Frontier Foundation
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

(function () {

// don't inject into non-HTML documents (such as XML documents)
// but do inject into XHTML documents
if (document instanceof HTMLDocument === false && (
  document instanceof XMLDocument === false ||
  document.createElement('div') instanceof HTMLDivElement === false
)) {
  return;
}

// don't bother asking to run when trivially in first-party context
// proceed only if in a nested frame
if (window.top == window) {
  return;
}

// TODO race condition
chrome.runtime.sendMessage({
  type: "checkClobberingEnabled",
  frameUrl: window.FRAME_URL,
});

}());
