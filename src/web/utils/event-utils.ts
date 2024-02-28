import { EventName } from "../../constants";
import StyleUtils from "./style-utils";

class EventUtils {
  private postMessage = (
    type: (typeof EventName)[keyof typeof EventName],
    data?: any
  ) => {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type,
            data,
          })
        );
      }
    } catch (err: any) {
      this.log("Error:" + err.message);
    }
  };

  isMounted = () => {
    this.postMessage(EventName.IsMounted);
  };

  onFocus = () => {
    this.postMessage(EventName.OnFocus, true);
    this.onContentChange(false);
  };

  onBlur = () => {
    this.postMessage(EventName.OnBlur, true);
    this.onContentChange(false);
  };

  private getSelectionPosition = () => {
    try {
      // returns a value of 0 on empty lines
      const pos = window
        .getSelection()
        ?.getRangeAt(0)
        ?.getBoundingClientRect()?.bottom;
      if (pos) {
        return pos + window.scrollY;
      }
    } catch (err) {
      // pass
    }

    // should catch new line events
    const selectElement = window.getSelection()?.focusNode;
    if (!selectElement) {
      return;
    }
    if (selectElement.nodeType === Node.ELEMENT_NODE) {
      // should catch new line events
      let e = selectElement as Element;
      while (e.hasChildNodes()) {
        e = e.firstChild as Element;
      }
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

  private onEditorChange = () => {
    this.postMessage(
      EventName.EditorChange,
      document.getElementById("edo-container")?.innerHTML
    );
  };

  private onLayoutChange = () => {
    setTimeout(() => {
      this.postMessage(EventName.SizeChange, document.body.offsetHeight);
      const pos = this.getSelectionPosition();
      if (pos) {
        this.postMessage(EventName.EditPosition, pos);
      }
    }, 100);
  };

  flagContentHasSet = () => {
    this.contentHasSetFlag = true;
  };

  onContentChange = (changeFlag = true) => {
    if (changeFlag) {
      this.checkContentIsChange();
    }
    this.onEditorChange();
    this.onLayoutChange();
  };

  onImageLoad = () => {
    this.onLayoutChange();
  };

  onActiveStyleChange = (styles: string[]) => {
    const formatStyles = StyleUtils.getActiveStyle(styles);
    if (formatStyles) {
      this.postMessage(EventName.ActiveStyleChange, formatStyles);
    }
  };

  onPastedImage = (src: string) => {
    this.postMessage(EventName.OnPastedImage, src);
  };

  log = (message: string) => {
    this.postMessage(EventName.Debugger, message);
  };
}

export default new EventUtils();
