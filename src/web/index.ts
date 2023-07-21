import EdoEditor from "./edo_editor";
import $ from "./jQuery.js";
// import { placeCaretAtEnd } from "./utils/cursor-utils";
import Theme from "./utils/theme-util";

const shouldInitDarkMode = true;

$(document).ready(function () {
  // clean style on <html> tag which merged from inner <html> tag of origin mail while forwarding
  // should do this on document-ready (rather than body-onload) to avoid screen flashing
  $("html").removeAttr("style");

  // apply dark mode style before image downloaded
  if (shouldInitDarkMode) {
    Theme.createDarkModeColorMappingCSS();
  }
});

// when has smartReply
// document.addEventListener("DOMContentLoaded", function () {
//   const el = document.getElementById("edo-sr");
//   placeCaretAtEnd(el);
// });

document.body.onload = () => {
  EdoEditor.init();
};
