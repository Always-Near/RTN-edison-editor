function desaturate(r: number, g: number, b: number) {
  const gray = r * 0.3086 + g * 0.6094 + b * 0.082;
  const sat = 0.8; //80%
  const nr = Math.round(r * sat + gray * (1 - sat));
  const ng = Math.round(g * sat + gray * (1 - sat));
  const nb = Math.round(b * sat + gray * (1 - sat));
  return "rgb(" + nr + ", " + ng + ", " + nb + ")";
}

function reversedColor(r: number, g: number, b: number, prop: string) {
  const isBackground = prop == "background-color";
  //if color is dark or bright (http://alienryderflex.com/hsp.html)
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  if (hsp < 130 && !isBackground) {
    //foreground dark color
    const delta = 255 - hsp;
    const nr = Math.min(r + delta, 234);
    const ng = Math.min(g + delta, 234);
    const nb = Math.min(b + delta, 234);
    return "rgb(" + nr + ", " + ng + ", " + nb + ")";
  } else if (hsp > 200 && isBackground) {
    //bg color brighter than #cccccc
    const nr = Math.max(r - hsp, 17);
    const ng = Math.max(g - hsp, 17);
    const nb = Math.max(b - hsp, 18);
    return "rgb(" + nr + ", " + ng + ", " + nb + ")";
  } else {
    return desaturate(r, g, b);
  }
}

function RGBColor(color: string) {
  const s = color.split("(")[1];
  const ns = s.substring(0, s.length - 1).split(",");
  return ns.map((n) => +n.trim());
}

class Theme {
  private foregroundColorSet = new Set<string>();
  private backgroundColorSet = new Set<string>();

  createDarkModeColorMappingCSS = () => {
    this.foregroundColorSet = new Set();
    this.backgroundColorSet = new Set();
    const existingDarkModeStyleElement = document.getElementById(
      "edo-dark-mode-color-mapping"
    );
    if (existingDarkModeStyleElement) {
      existingDarkModeStyleElement.remove();
    }

    let darkModeColorMappingCSS = "";
    Array.from(document.querySelectorAll("*"))
      .reverse()
      .forEach((node) => {
        const excludedTags = [
          "html",
          "style",
          "head",
          "script",
          "meta",
          "br",
          "img",
          "a",
          "body",
        ];
        if (excludedTags.includes(node.tagName.toLowerCase())) {
          return;
        }

        const style = window.getComputedStyle(node, null);
        const foregroundColor = style["color"];
        this.foregroundColorSet.add(foregroundColor);
        const [cr, cg, cb, ca] = RGBColor(foregroundColor);
        if (ca !== 0) {
          node.classList.add(
            "edo-dark-mode-override-color-" + cr + "-" + cg + "-" + cb
          );
        }
        const backgroundColor = style["background-color" as any];
        this.backgroundColorSet.add(backgroundColor);
        const [br, bg, bb, ba] = RGBColor(backgroundColor);
        if (ba !== 0) {
          node.classList.add(
            "edo-dark-mode-override-bgcolor-" + br + "-" + bg + "-" + bb
          );
        }
      });

    this.foregroundColorSet.forEach((color) => {
      const [r, g, b, a] = RGBColor(color);
      const darkModeColor = reversedColor(r, g, b, "color");
      const colorCSSSelector =
        ".edo-dark-mode-override-color-" + r + "-" + g + "-" + b;
      const colorCSSContent = " { color: " + darkModeColor + " !important; }";
      darkModeColorMappingCSS += colorCSSSelector + colorCSSContent + "\\n";
    });

    this.backgroundColorSet.forEach((color) => {
      const [r, g, b, a] = RGBColor(color);
      const darkModeColor = reversedColor(r, g, b, "background-color");
      const colorCSSSelector =
        ".edo-dark-mode-override-bgcolor-" + r + "-" + g + "-" + b;
      const colorCSSContent =
        " { background-color: " + darkModeColor + " !important; }";
      darkModeColorMappingCSS += colorCSSSelector + colorCSSContent + "\\n";
    });

    const style = document.createElement("style");
    style.id = "edo-dark-mode-color-mapping";
    style.type = "text/css";
    const headerOfDarkModeMediaQuery =
      "@media (prefers-color-scheme: dark) {\\n";
    const footerOfDarkModeMediaQuery = "}";
    const styleNodeContent =
      headerOfDarkModeMediaQuery +
      darkModeColorMappingCSS +
      footerOfDarkModeMediaQuery;
    style.appendChild(document.createTextNode(styleNodeContent));

    const head = document.head;
    head.appendChild(style);
  };

  applyDarkModeInDraft = () => {
    this.createDarkModeColorMappingCSS();
  };

  removeDarkModeInDraft = () => {
    this.foregroundColorSet.forEach((color) => {
      const [r, g, b, a] = RGBColor(color);
      const colorCSSClass =
        "edo-dark-mode-override-color-" + r + "-" + g + "-" + b;
      const colorCSSSelector = "." + colorCSSClass;
      document.querySelectorAll(colorCSSSelector).forEach((n) => {
        n.classList.remove(colorCSSClass);
        if (n.classList.length === 0) {
          const classAttr = n.getAttributeNode("class");
          classAttr && n.removeAttributeNode(classAttr);
        }
      });
    });

    this.backgroundColorSet.forEach((color) => {
      const [r, g, b, a] = RGBColor(color);
      const colorCSSClass =
        "edo-dark-mode-override-bgcolor-" + r + "-" + g + "-" + b;
      const colorCSSSelector = "." + colorCSSClass;
      document.querySelectorAll(colorCSSSelector).forEach((n) => {
        n.classList.remove(colorCSSClass);
        if (n.classList.length === 0) {
          const classAttr = n.getAttributeNode("class");
          classAttr && n.removeAttributeNode(classAttr);
        }
      });
    });
  };
}

export default new Theme();
