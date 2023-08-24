import { FormatType } from "../constants";
import EdoEditor from "./edo_editor";
import $ from "./jQuery.js";
import { removeObject } from "./utils/base-utils";
import EventUtils from "./utils/event-utils";
import { detectPaste, replaceImage, addOnload } from "./utils/image-utils";
import StyleUtils from "./utils/style-utils";
// import { placeCaretAtEnd } from "./utils/cursor-utils";
import Theme from "./utils/theme-util";

const DefaultFontSize = 16;

window.onerror = (
  event: Event | string,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
) => {
  EventUtils.log("window error:" + error?.message);
};

$(document).ready(function () {
  // clean style on <html> tag which merged from inner <html> tag of origin mail while forwarding
  // should do this on document-ready (rather than body-onload) to avoid screen flashing
  $("html").removeAttr("style");
  EventUtils.isMounted();
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
    EventUtils.onContentChange();
  });
  mutationObserver.observe(containerBox, option);

  containerBox?.addEventListener("paste", () => {
    detectPaste();
    setTimeout(function () {
      removeObject();
    });
  });

  window.onfocus = () => {
    EventUtils.onFocus();
  };
  window.onblur = () => {
    EventUtils.onBlur();
  };

  EdoEditor.init();
};

window.format = (format: FormatType) => {
  StyleUtils.setActiveStyle(format);
};

window.addLink = (json: string) => {
  const { url, text }: { url: string; text: string } = JSON.parse(json);
  EdoEditor.insertLink(url, text);
};

window.addImage = (params: string) => {
  const paramsParse = JSON.parse(params) as {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  EdoEditor.insertImage(paramsParse);
};

window.replaceImage = (params: string) => {
  const { sourceSrc, targetSrc } = JSON.parse(params) as {
    sourceSrc: string;
    targetSrc: string;
  };
  replaceImage(sourceSrc, targetSrc);
};

window.setDefaultValue = (html: string) => {
  EdoEditor.setHTML(decodeURIComponent(html));
  addOnload();
  Theme.applyDark();
  setTimeout(() => {
    EventUtils.flagContentHasSet();
  }, 300);
};

window.setStyle = (customCSS: string) => {
  EdoEditor.setCustomCSS(customCSS);
};

window.setFontSize = (size: string) => {
  $("#edo-container").css("font-size", parseInt(size) || DefaultFontSize);
};

window.setPadding = (padding: string) => {
  $("#edo-container").css("padding", padding);
};

window.setIsDarkMode = (isDarkMode: string) => {
  // apply dark mode style before image downloaded
  Theme.setDark(isDarkMode === "true");
};

window.setEditorPlaceholder = (placehold: string) => {
  EdoEditor.setPlaceholder(placehold);
};

window.focusTextEditor = () => {
  EdoEditor.focusEditorBeginning();
};

window.blurTextEditor = () => {
  EdoEditor.blurEditor();
};

window.disableInputImage = () => {};
