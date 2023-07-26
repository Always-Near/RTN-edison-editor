import { EventName, FormatType } from "../../constants";

export const postMessage = (
  type: (typeof EventName)[keyof typeof EventName],
  data?: any
) => {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type,
        data,
      })
    );
  }
};

export const isMounted = () => {
  postMessage(EventName.IsMounted);
};

const getSelectionPosition = () => {
  // returns a value of 0 on empty lines
  const pos = window
    .getSelection()
    ?.getRangeAt(0)
    .getBoundingClientRect()?.bottom;
  if (pos) {
    return pos + window.scrollY;
  }
  // should catch new line events
  const selectElement = window.getSelection()?.focusNode;
  if (!selectElement) {
    return;
  }
  if (selectElement.nodeType === Node.ELEMENT_NODE) {
    // should catch new line events
    const e = selectElement as Element;
    return e.getBoundingClientRect().bottom + window.scrollY;
  }
};

export const onContentChange = () => {
  postMessage(EventName.ContentChange);
  postMessage(EventName.SizeChange, document.body.offsetHeight);
  postMessage(EventName.SizeChange, document.body.offsetHeight);
  const pos = getSelectionPosition();
  if (pos) {
    postMessage(EventName.EditPosition, pos);
  }
};

export const onActiveStyleChange = (styles: string[]) => {
  const formats: FormatType[] = [];
  styles.forEach((s) => {
    if (s === "bold") {
      formats.push("Bold");
      return;
    }
    if (s === "italic") {
      formats.push("Italic");
      return;
    }
    if (s === "strikeThrough") {
      formats.push("Strikethrough");
      return;
    }
    if (s === "underline") {
      formats.push("Underline");
      return;
    }
    if (s === "orderedList") {
      formats.push("OrderedList");
      return;
    }
    if (s === "unorderedList") {
      formats.push("UnorderedList");
      return;
    }
    if (s === "backgroundColor") {
      formats.push(`BackgroundColor-yellow`);
      return;
    }
  });
  postMessage(EventName.ActiveStyleChange, formats);
};

export const onFocus = () => {
  postMessage(EventName.OnFocus, true);
};

export const onBlur = () => {
  postMessage(EventName.OnBlur, true);
};
