import { EventName } from "../../constants";
import { debounce } from "./base-utils";
import StyleUtils from "./style-utils";

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

  onActiveStyleChange = (styles: string[]) => {
    const formatStyles = StyleUtils.getActiveStyle(styles);
    if (formatStyles) {
      this.postMessage(EventName.ActiveStyleChange, formatStyles);
    }
  };

  onPastedImage = (src: string | null) => {
    if (src) {
      postMessage(EventName.OnPastedImage, src);
    }
  };
}

export default new EventUtils();
