import { FormatType, EventName } from "../constants";
import EdoEditor from "./edo_editor";
import $ from "./jQuery.js";
import {
  isMounted,
  onBlur,
  onContentChange,
  onFocus,
} from "./utils/event-utils";
import { detectPaste } from "./utils/image-utils";
// import { placeCaretAtEnd } from "./utils/cursor-utils";
import Theme from "./utils/theme-util";

let shouldInitDarkMode = true;

$(document).ready(function () {
  // clean style on <html> tag which merged from inner <html> tag of origin mail while forwarding
  // should do this on document-ready (rather than body-onload) to avoid screen flashing
  $("html").removeAttr("style");

  // apply dark mode style before image downloaded
  if (shouldInitDarkMode) {
    Theme.createDarkModeColorMappingCSS();
  }
  isMounted();
});

// when has smartReply
// document.addEventListener("DOMContentLoaded", function () {
//   const el = document.getElementById("edo-sr");
//   placeCaretAtEnd(el);
// });

document.body.onload = () => {
  const containerBox = document.querySelector("#edo-container") as HTMLElement;

  const option = {
    childList: true, // 子节点的变动（新增、删除或者更改）
    characterData: true, // 节点内容或节点文本的变动
    subtree: true, // 是否将观察器应用于该节点的所有后代节点
  };
  const mutationObserver = new MutationObserver(function (mutations) {
    onContentChange();
  });
  mutationObserver.observe(containerBox, option);

  containerBox?.addEventListener("paste", () => {
    detectPaste();
  });

  window.onfocus = () => {
    onFocus();
  };
  window.onblur = () => {
    onBlur();
  };

  EdoEditor.init();
};

window.format = (format: FormatType) => {
  switch (format) {
    case "CLEAR":
      EdoEditor.removeFormating();
      break;
    case "Bold":
      EdoEditor.setBold();
      break;
    case "Italic":
      EdoEditor.setItalic();
      break;
    case "Strikethrough":
      EdoEditor.setStrikeThrough();
      break;
    case "Underline":
      EdoEditor.setUnderline();
      break;
    case "IndentIncrease":
      EdoEditor.setIndent();
      break;
    case "IndentDecrease":
      EdoEditor.setOutdent();
      break;
    case "UnorderedList":
      EdoEditor.setUnorderedList();
      break;
    case "OrderedList":
      EdoEditor.setOrderedList();
      break;
    default:
      break;
  }
  if (format.startsWith("Color-")) {
    const color = format.replace("Color-", "");
    EdoEditor.setTextColor(color);
  }
  if (format.startsWith("Size-")) {
    const size = format.replace("Size-", "");
    EdoEditor.setFontSize(size);
  }
  if (format.startsWith("Font-")) {
    const font = format.replace("Font-", "");
    EdoEditor.setFontFamily(font);
  }
  if (format.startsWith("BackgroundColor-")) {
    const color = format.replace("BackgroundColor-", "");
    EdoEditor.setBackgroundColor(color);
  }
};

window.addImage = () => {};
window.addLink = () => {};
window.setDefaultValue = () => {};
window.setStyle = () => {};
window.setIsDarkMode = () => {};
window.setFontSize = () => {};
window.setPadding = () => {};
window.setEditorPlaceholder = () => {};

window.focusTextEditor = () => {};
window.blurTextEditor = () => {};

window.disableInputImage = () => {};
