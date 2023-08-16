import { FormatType } from "../../constants";
import EdoEditor from "../edo_editor";
import { formatColor } from "./base-utils";

class StyleUtils {
  private activeStyles: FormatType[] = [];
  private activeStyleString = "";

  setActiveStyle = (format: FormatType) => {
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
      const color = this.activeStyles.includes(format)
        ? "rgb(0, 0, 0, 0)"
        : format.replace("BackgroundColor-", "");
      EdoEditor.setBackgroundColor(color);
    }
  };

  getActiveStyle = (styles: string[]) => {
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
    this.activeStyles = formats;
    this.activeStyleString = activeStyleString;
    return formats;
  };
}

export default new StyleUtils();
