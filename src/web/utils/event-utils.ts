import { EventName, FormatType } from "../../constants";
import { debounce, formatColor } from "./base-utils";

class EventUtils {
  private postMessage = (
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

  isMounted = () => {
    this.postMessage(EventName.IsMounted);
  };

  onFocus = () => {
    this.postMessage(EventName.OnFocus, true);
  };

  onBlur = () => {
    this.postMessage(EventName.OnBlur, true);
  };

  private getSelectionPosition = () => {
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

  private contentIsChangeFlag = false;
  private contentHasSetFlag = false;

  private checkContentIsChange = () => {
    if (this.contentIsChangeFlag) {
      return;
    }
    if (!this.contentHasSetFlag) {
      return;
    }
    this.contentIsChangeFlag = true;
    this.postMessage(EventName.ContentChange, true);
  };

  private onContentChangeDebounce = debounce(() => {
    this.postMessage(
      EventName.EditorChange,
      document.getElementById("edo-container")?.innerHTML
    );
    this.postMessage(EventName.SizeChange, document.body.offsetHeight);
    const pos = this.getSelectionPosition();
    if (pos) {
      this.postMessage(EventName.EditPosition, pos);
    }
  }, 300);

  flagContentHasSet = () => {
    this.contentHasSetFlag = true;
  };

  onContentChange = () => {
    this.checkContentIsChange();
    this.onContentChangeDebounce();
  };

  private activeStyleString = "";

  onActiveStyleChange = (styles: string[]) => {
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
    const activeStyleString = formats.join("|");
    if (activeStyleString === this.activeStyleString) {
      return;
    }
    this.activeStyleString = activeStyleString;
    this.postMessage(EventName.ActiveStyleChange, formats);
  };

  onPastedImage = (src: string | null) => {
    if (src) {
      postMessage(EventName.OnPastedImage, src);
    }
  };
}

export default new EventUtils();
