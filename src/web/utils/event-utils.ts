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

let contentIsChangeFlag = false;
let contentHasSetFlag = false;

export const flagContentHasSet = () => {
  contentHasSetFlag = true;
};

const checkContentIsChange = () => {
  if (contentIsChangeFlag) {
    return;
  }
  if (!contentHasSetFlag) {
    return;
  }
  contentIsChangeFlag = true;
  postMessage(EventName.ContentChange, true);
};

export const onContentChange = () => {
  checkContentIsChange();
  postMessage(
    EventName.EditorChange,
    document.getElementById("edo-container")?.innerHTML
  );
  postMessage(EventName.SizeChange, document.body.offsetHeight);
  const pos = getSelectionPosition();
  if (pos) {
    postMessage(EventName.EditPosition, pos);
  }
};

function to16(str: number) {
  const str16 = "00" + str.toString(16);
  return str16.substring(str16.length - 2);
}

const formatColor = (color: string) => {
  if (color.startsWith("#")) {
    return color;
  }
  const s = color.split("(")[1];
  const ns = s.substring(0, s.length - 1).split(",");
  const [r, g, b, a] = ns.map((n) => +n.trim());
  return `#${to16(r)}${to16(g)}${to16(b)}`;
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
    if (s.startsWith("fontSize:")) {
      const size = s.replace("fontSize:", "");
      formats.push(`Size-${size}` as const);
      return;
    }
    if (s.startsWith("textColor:")) {
      const color = s.replace("textColor:", "");
      formats.push(`Color-${formatColor(color)}` as const);
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

export const onPastedImage = (src: string | null) => {
  if (src) {
    postMessage(EventName.OnPastedImage, src);
  }
};
