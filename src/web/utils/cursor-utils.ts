export function placeCaretAtEnd(el: HTMLElement | null) {
  if (!el) {
    return;
  }
  el.focus();
  if (window.getSelection && document.createRange) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else if (typeof (document.body as any).createTextRange === "function") {
    const textRange = (document.body as any).createTextRange();
    textRange.moveToElementText(el);
    textRange.collapse(false);
    textRange.select();
  }
}
