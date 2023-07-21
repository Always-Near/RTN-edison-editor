type SavedSelection = { start: number; end: number };

class MySelection {
  private savedSelection: SavedSelection | undefined;

  private saveSelectionV1 = (containerEl: Node): SavedSelection | undefined => {
    const range = window.getSelection()?.getRangeAt(0);
    if (!range) {
      return;
    }
    const preSelectionRange = range.cloneRange();
    if (!preSelectionRange) {
      return;
    }
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return {
      start: start,
      end: start + range.toString().length,
    };
  };

  private saveSelectionV2 = (containerEl: Node): SavedSelection | undefined => {
    const selectedTextRange = (document as any).selection.createRange();
    const preSelectionTextRange = (document as any).body.createTextRange();
    preSelectionTextRange.moveToElementText(containerEl);
    preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
    const start = preSelectionTextRange.text.length;
    return {
      start: start,
      end: start + selectedTextRange.text.length,
    };
  };

  private saveSelection = (containerEl: Node | null) => {
    if (!containerEl) {
      return;
    }
    if ((window.getSelection as any) && (document.createRange as any)) {
      return this.saveSelectionV1(containerEl);
    } else if ("selection" in document) {
      return this.saveSelectionV2(containerEl);
    }
  };

  private restoreSelectionV1 = (
    containerEl: Node,
    savedSel: SavedSelection
  ) => {
    let charIndex = 0;
    const range = document.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);

    let nodeStack = [containerEl],
      node,
      foundStart = false,
      stop = false;
    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType == 3) {
        const nextCharIndex = charIndex + (node.nodeValue || "").length;
        if (
          !foundStart &&
          savedSel.start >= charIndex &&
          savedSel.start <= nextCharIndex
        ) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (
          foundStart &&
          savedSel.end >= charIndex &&
          savedSel.end <= nextCharIndex
        ) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  private restoreSelectionV2 = (
    containerEl: Node,
    savedSel: SavedSelection
  ) => {
    const textRange = (document as any).body.createTextRange();
    textRange.moveToElementText(containerEl);
    textRange.collapse(true);
    textRange.moveEnd("character", savedSel.end);
    textRange.moveStart("character", savedSel.start);
    textRange.select();
  };

  private restoreSelection = (
    containerEl: Node | null,
    savedSel: SavedSelection
  ) => {
    if (
      containerEl &&
      (window.getSelection as any) &&
      (document.createRange as any)
    ) {
      return this.restoreSelectionV1(containerEl, savedSel);
    } else if (containerEl && "selection" in document) {
      return this.restoreSelectionV2(containerEl, savedSel);
    }
  };

  doSave = () => {
    this.savedSelection = this.saveSelection(
      document.getElementById("edo-container")
    );
  };

  doRestore = () => {
    if (this.savedSelection) {
      this.restoreSelection(
        document.getElementById("edo-container"),
        this.savedSelection
      );
    }
  };
}

export default new MySelection();
