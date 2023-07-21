import EdoEditor from "../edo_editor";

export function changeFont(size: number) {
  document.execCommand("fontSize", false, "7");
  const fontElements = document.getElementsByTagName("font");
  for (const font of Array.from(fontElements)) {
    if (font.size == "7") {
      font.removeAttribute("size");
      font.style.fontSize = `${size}`;
    }
  }
}

export function insertSnippet(sp: string) {
  const snippetWrapper = document.createElement("div");
  snippetWrapper.innerHTML = sp.replace(/<\/?html>/g, "");
  // below algorithm:
  // a) insert snippet at caret
  // b) place caret at the end of snippet inserted
  const childNodes = Array.from(snippetWrapper.childNodes);
  let lastChild: ChildNode;
  childNodes.reverse().forEach(function (item, index) {
    if (index === 0) {
      lastChild = item;
      EdoEditor.insertNodeAtCaret(item);
    } else {
      lastChild.before(item);
      lastChild = item;
    }
  });
}
