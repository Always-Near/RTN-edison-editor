import $ from "./jQuery.js";

/*!
 *
 * ZSSRichTextEditor v0.5.2
 * http://www.zedsaid.com
 *
 * Copyright 2014 Zed Said Studio LLC
 *
 */

var edo_editor = {};

// If we are using iOS or desktop
edo_editor.isUsingiOS = true;

// If the user is draging
edo_editor.isDragging = false;

// The current selection
edo_editor.currentSelection = undefined;

// The current editing image
edo_editor.currentEditingImage = undefined;

// The current editing link
edo_editor.currentEditingLink = undefined;

// The objects that are enabled
edo_editor.enabledItems = {};

// Height of content window, will be set by viewController
edo_editor.contentHeight = 244;

// Sets to true when extra footer gap shows and requires to hide
edo_editor.updateScrollOffset = false;

edo_editor.isFocusingVariable = false; // used to avoid duplicate callback for the same focus state
edo_editor.templateVariableClassName = "template-variable";
edo_editor.templateVariableFocusedClassName = "template-variable_focus";

// isEditingSnippet: true for snippet, false for composer. Differences include:
// 1. enable variable focus callback for snippet editing page, which is disabled by default for composer
// 2. while variable is selected, user interaction would not be the same
edo_editor.isEditingSnippet = false;

var predefinedVariables = {
  myFirstName: "My first name",
  recipientsFirstName: "Recipient’s first name",
  myLastName: "My last name",
  recipientsLastName: "Recipient’s last name",
};

edo_editor.placeholder = "Placeholder";

edo_editor.setPredefinedVariables = function (jsonStr) {
  var obj = eval(jsonStr);
  predefinedVariables = obj;
};

/**
 * The initializer function that must be called onLoad
 */
edo_editor.init = function () {
  var editor = $("#edo-container");

  editor.on("touchend", function (e) {
    edo_editor.enabledEditingItems(e);
  });

  $(document).on("click", function (e) {});

  $(document).on("selectionchange", function (e) {
    var sel = window.getSelection();
    if (
      sel === undefined ||
      sel.anchorNode === null ||
      sel.focusNode === null
    ) {
      return;
    }

    var nodeAtStart = sel.anchorNode.parentNode;
    var nodeAtEnd = sel.focusNode.parentNode;
    var isVariableAtStart = $(nodeAtStart).hasClass(
      edo_editor.templateVariableClassName
    );
    var isVariableAtEnd = $(nodeAtEnd).hasClass(
      edo_editor.templateVariableClassName
    );
    // forbid selection from covering variable and normal text, return before backupRange
    if (isVariableAtStart !== isVariableAtEnd) {
      return false;
    }

    if (isVariableAtStart === true && isVariableAtEnd === true) {
      // forbid selection from covering two different variables, return before backupRange
      if (nodeAtStart !== nodeAtEnd) {
        return false;
      }

      // while in composer, variable should be selected as a whole
      if (nodeAtStart === nodeAtEnd && !edo_editor.isEditingSnippet) {
        var node = edo_editor.getSelectedNode();
        if (node.getAttribute("contentEditable") === null) {
          node.setAttribute("contentEditable", "false");
        }

        var range = document.createRange();
        range.selectNode(node);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    edo_editor.backupRange(); // backup-restore mechanism to avoid select part of the Variable, here is the backup step
    // this line of code will cause performance issue when input extremely long text
    //        edo_editor.calculateEditorHeightWithCaretPosition();
    // workaround: following line is necessary to select the variable as a whole
    if (sel.isCollapsed === false) {
      edo_editor.getCaretYPosition();
    }
    edo_editor.enabledEditingItems(e);

    if (edo_editor.isEditingSnippet) {
      edo_editor.checkVariableFocusStatus();
    }
  });

  // Make sure that when we tap anywhere in the document we focus on the editor
  $(window).on("touchmove", function (e) {
    edo_editor.isDragging = true;
    edo_editor.updateScrollOffset = true;
    edo_editor.enabledEditingItems(e);
  });
  $(window).on("touchstart", function () {
    edo_editor.isDragging = false;
  });
  $(window).on("touchend", function (e) {
    if (!edo_editor.isDragging && e.target.nodeName.toLowerCase() === "html") {
      edo_editor.focusEditor();
    }
  });

  editor.on("keydown", function (e) {
    // 'Return' key monitor
    // should blur if 'Return' key is pressed while editing variable
    if (
      e.key === "Enter" &&
      $(edo_editor.getSelectedNode()).hasClass(
        edo_editor.templateVariableClassName
      )
    ) {
      // cancel the default 'Return' behavior, which otherwise would split the Variable and place the right part on a new line
      e.preventDefault();
      edo_editor.blurVariable();

      if (edo_editor.isEditingSnippet) {
        // work around to avoid conflict against 'callback://'
        setTimeout(function () {
          window.location.href = "variable://blur";
        }, 100);
        edo_editor.isFocusingVariable = false;
      }

      return;
    }

    // 'Backspace' key monitor
    if (e.key === "Backspace") {
      // if backspace at the end of a Variable, should remove the Variable as a whole
      var focusNode = window.getSelection().focusNode;
      // the 'zero-width-space' (aka: \u200B, decimal 8203 as char code) node
      // is supposed to be directly after variable node, so 'backspace' on that should remove both of them
      var previousSiblingNode = focusNode.previousSibling;
      if (
        focusNode.textContent.charCodeAt(0) === 8203 &&
        focusNode.textContent.length === 1 &&
        $(previousSiblingNode).hasClass(edo_editor.templateVariableClassName)
      ) {
        previousSiblingNode.remove();
      }

      // when editing template, if all chars deleted (which means variable is removed), should hide toolbar
      if (
        focusNode.textContent.charCodeAt(0) === 8203 &&
        focusNode.textContent.length === 1 &&
        $(edo_editor.getSelectedNode()).hasClass("template-variable")
      ) {
        if (edo_editor.isFocusingVariable) {
          window.location = "variable://blur";
        }
      }
    }
  });

  editor.on("input", function (e) {
    // variable selection ralated
    // should remove the zero-width-space when variable is selected and replaced by input
    var nextSibling = window.getSelection().focusNode.nextSibling;
    if (
      nextSibling &&
      nextSibling.nodeName === "#text" &&
      nextSibling.textContent.charCodeAt(0) === 8203
    ) {
      nextSibling.textContent = nextSibling.textContent.substring(1);
    }

    // for case that variable is at the very beginning of line
    var focusNode = window.getSelection().focusNode;
    var focusOffset = window.getSelection().focusOffset;
    if (focusNode.textContent.charCodeAt(focusOffset) == 8203) {
      // last char is ZWS
      focusNode.textContent =
        focusNode.textContent.substring(0, focusOffset) +
        focusNode.textContent.substring(focusOffset + 1);
      var range = document.createRange();
      range.setStart(focusNode, focusOffset);
      range.setEnd(focusNode, focusOffset);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // hiliteColor related
    // should remove the zero-width-space which stands as placeholder of new span while canceling hiliteColor
    var sel = window.getSelection();
    var prevSiblingNode = sel.anchorNode.previousElementSibling;
    if (
      sel.anchorNode.nodeName.toLowerCase() === "#text" &&
      sel.anchorNode.textContent.charCodeAt(0) === 8203 &&
      !$(prevSiblingNode).hasClass(edo_editor.templateVariableClassName) &&
      prevSiblingNode.style.getPropertyValue("background-color") ===
        "rgb(255, 255, 141)"
    ) {
      sel.anchorNode.deleteData(0, 1);
    }
  });
}; //end

// This will show up in the XCode console as we are able to push this into an NSLog.
edo_editor.debug = function (msg) {
  window.location = "debug://" + msg;
};

edo_editor.setPlaceholder = function (placeholder) {
  var editor = $("#edo-container");

  //set placeHolder
  editor.attr("placeholder", placeholder);

  //set focus
  editor.focusout(function () {
    var element = $(this);
    if (!element.text().trim().length) {
      element.empty();
    }
  });
};

edo_editor.getCaretYPosition = function () {
  var sel = window.getSelection();
  // Next line is commented to prevent deselecting selection.
  // It looks like work but if there are any issues will appear then uncomment it as well as code above.
  //sel.collapseToStart();
  var range = sel.getRangeAt(0);
  var span = document.createElement("span"); // something happening here preventing selection of elements
  range.collapse(false);
  range.insertNode(span);
  var topPosition = span.offsetTop;
  span.parentNode.removeChild(span);
  return topPosition;
};

edo_editor.calculateEditorHeightWithCaretPosition = function () {
  var padding = 50;
  var c = edo_editor.getCaretYPosition();

  var offsetY = window.document.body.scrollTop;
  var height = edo_editor.contentHeight;

  var newPos = window.pageYOffset;

  if (c < offsetY) {
    newPos = c;
  } else if (c > offsetY + height - padding) {
    newPos = c - height + padding - 18;
  }

  window.scrollTo(0, newPos);
};

edo_editor.backupRange = function () {
  var selection = window.getSelection();
  var range = selection.getRangeAt(0);
  edo_editor.currentSelection = {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
  };
};

edo_editor.restoreRange = function () {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.setStart(
    edo_editor.currentSelection.startContainer,
    edo_editor.currentSelection.startOffset
  );
  range.setEnd(
    edo_editor.currentSelection.endContainer,
    edo_editor.currentSelection.endOffset
  );
  selection.addRange(range);
};

edo_editor.getSelectedNode = function () {
  var node, selection;
  if (window.getSelection) {
    selection = getSelection();
    node = selection.anchorNode;
  }
  if (!node && document.selection) {
    selection = document.selection;
    var range = selection.getRangeAt
      ? selection.getRangeAt(0)
      : selection.createRange();
    node = range.commonAncestorContainer
      ? range.commonAncestorContainer
      : range.parentElement
      ? range.parentElement()
      : range.item(0);
  }
  if (node) {
    return node.nodeName === "#text" ? node.parentNode : node;
  }
};

edo_editor.setBold = function () {
  document.execCommand("bold", false, null);
  // fixed EC-6404. Disable callback after execCommand, button background color is toggled directly in native code.
  //    edo_editor.enabledEditingItems();
};

edo_editor.setItalic = function () {
  document.execCommand("italic", false, null);
  // fixed EC-6404. Disable callback after execCommand, button background color is toggled directly in native code.
  //    edo_editor.enabledEditingItems();
};

edo_editor.setSubscript = function () {
  document.execCommand("subscript", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setSuperscript = function () {
  document.execCommand("superscript", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setStrikeThrough = function () {
  document.execCommand("strikeThrough", false, null);
  // fixed EC-6381. Disable callback after execCommand, background color is directly toggled in native.
  //    edo_editor.enabledEditingItems();
};

edo_editor.setUnderline = function () {
  document.execCommand("underline", false, null);
  // fixed EC-6381. Disable callback after execCommand, background color is directly toggled in native.
  //    edo_editor.enabledEditingItems();
};

edo_editor.setBlockquote = function () {
  var range = document.getSelection().getRangeAt(0);
  var formatName =
    range.commonAncestorContainer.parentElement.nodeName === "BLOCKQUOTE" ||
    range.commonAncestorContainer.nodeName === "BLOCKQUOTE"
      ? "<P>"
      : "<BLOCKQUOTE>";
  document.execCommand("formatBlock", false, formatName);
  edo_editor.enabledEditingItems();
};

edo_editor.removeFormating = function () {
  // intensionally remove twice, once will not be sufficient. first for direct node, second for cascade nodes
  document.execCommand("removeFormat", false, null);
  document.execCommand("removeFormat", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setHorizontalRule = function () {
  document.execCommand("insertHorizontalRule", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setHeading = function (heading) {
  var current_selection = $(edo_editor.getSelectedNode());
  var t = current_selection.prop("tagName").toLowerCase();
  var is_heading =
    t === "h1" ||
    t === "h2" ||
    t === "h3" ||
    t === "h4" ||
    t === "h5" ||
    t === "h6";
  if (is_heading && heading === t) {
    var c = current_selection.html();
    current_selection.replaceWith(c);
  } else {
    document.execCommand("formatBlock", false, "<" + heading + ">");
  }

  edo_editor.enabledEditingItems();
};

edo_editor.setParagraph = function () {
  var current_selection = $(edo_editor.getSelectedNode());
  var t = current_selection.prop("tagName").toLowerCase();
  var is_paragraph = t === "p";
  if (is_paragraph) {
    var c = current_selection.html();
    current_selection.replaceWith(c);
  } else {
    document.execCommand("formatBlock", false, "<p>");
  }

  edo_editor.enabledEditingItems();
};

// Need way to remove formatBlock
console.log("WARNING: We need a way to remove formatBlock items");

edo_editor.undo = function () {
  document.execCommand("undo", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.redo = function () {
  document.execCommand("redo", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setOrderedList = function () {
  // workaround for complex li content, specifically, part of content is highlighted
  var originListNode = edo_editor.findEnclosingListNode();

  document.execCommand("insertOrderedList", false, null);

  if (originListNode) {
    edo_editor.fixCancelingList(originListNode);
  } else {
    edo_editor.fixCreatingList();
  }

  edo_editor.enabledEditingItems();
};

edo_editor.setUnorderedList = function () {
  var originListNode = edo_editor.findEnclosingListNode();

  document.execCommand("insertUnorderedList", false, null);

  if (originListNode) {
    edo_editor.fixCancelingList(originListNode);
  } else {
    edo_editor.fixCreatingList();
  }

  edo_editor.enabledEditingItems();
};

edo_editor.findEnclosingListNode = function () {
  var originListNode = edo_editor.getSelectedNode();
  while (
    originListNode !== null &&
    originListNode.id !== "edo-message" &&
    originListNode.id !== "edo-container"
  ) {
    if (
      originListNode.tagName.toLowerCase() === "ol" ||
      originListNode.tagName.toLowerCase() === "ul"
    ) {
      // found
      return originListNode;
    }

    originListNode = originListNode.parentNode;
  }

  return null;
};

edo_editor.fixCancelingList = function (node) {
  while (node !== null) {
    if (
      node.tagName.toLowerCase() === "ul" ||
      node.tagName.toLowerCase() === "ol"
    ) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child !== null && child.innerText === "") {
          child.remove();
        }
      }
    }
    node = node.previousSibling;
  }
};

edo_editor.fixCreatingList = function () {
  var sel = edo_editor.getSelectedNode();
  var liNode;
  var spanNode;
  while (sel !== null) {
    if (sel.tagName.toLowerCase() === "li") {
      liNode = sel;
      spanNode = sel.parentNode.parentNode;
      break;
    }

    sel = sel.parentNode;
  }

  var nextSibling = liNode.nextSibling;
  if (nextSibling !== null && nextSibling.innerText === "") {
    nextSibling.remove();
  }

  var previousSibling = liNode.previousSibling;
  if (previousSibling !== null && previousSibling.innerText === "") {
    previousSibling.remove();
  }

  var spanNextSibling = spanNode.nextSibling;
  if (spanNextSibling !== null && spanNextSibling.innerText === "") {
    spanNextSibling.remove();
  }

  var spanPreviousSibling = spanNode.previousSibling;
  if (spanPreviousSibling !== null && spanPreviousSibling.innerText === "") {
    spanPreviousSibling.remove();
  }
};

edo_editor.setJustifyCenter = function () {
  document.execCommand("justifyCenter", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setJustifyFull = function () {
  document.execCommand("justifyFull", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setJustifyLeft = function () {
  document.execCommand("justifyLeft", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setJustifyRight = function () {
  document.execCommand("justifyRight", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setIndent = function () {
  document.execCommand("indent", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setOutdent = function () {
  document.execCommand("outdent", false, null);
  edo_editor.enabledEditingItems();
};

edo_editor.setFontFamily = function (fontFamily) {
  //    edo_editor.restoreRange();
  document.execCommand("styleWithCSS", null, true);
  document.execCommand("fontName", false, fontFamily);
  document.execCommand("styleWithCSS", null, false);
  edo_editor.sleep(1);
  edo_editor.enabledEditingItems();
};

edo_editor.sleep = function (delay) {
  var start = new Date().getTime();
  while (new Date().getTime() - start < delay) {
    continue;
  }
};

edo_editor.setFontSize = function (fontSize) {
  document.execCommand("styleWithCSS", null, true);
  document.execCommand("fontSize", false, fontSize);
  document.execCommand("styleWithCSS", null, false);
  edo_editor.enabledEditingItems();
};

edo_editor.setTextColor = function (color) {
  //    edo_editor.restoreRange();
  document.execCommand("foreColor", false, color);
  //edo_editor.enabledEditingItems();
  // document.execCommand("removeFormat", false, "foreColor"); // Removes just foreColor
};

edo_editor.setBackgroundColor = function (color) {
  document.execCommand("styleWithCSS", null, true);
  document.execCommand("hiliteColor", false, color);
  document.execCommand("styleWithCSS", null, false);

  // canceling hiliteColor, append an empty <span> node with zero-width-space content, otherwise cannot move selection in it
  if (color === "rgb(0, 0, 0, 0)" && window.getSelection().isCollapsed) {
    var node = document.createTextNode("\u200b");
    $(edo_editor.getSelectedNode()).after(node);

    var range = document.createRange();
    range.selectNode(node);
    range.collapse(false);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
};

edo_editor.insertLink = function (url, title) {
  edo_editor.restoreRange();
  var sel = document.getSelection();
  console.log(sel);
  if (sel.toString().length !== 0) {
    if (sel.rangeCount) {
      var el = document.createElement("a");
      el.setAttribute("href", url);
      el.setAttribute("title", title);

      var range = sel.getRangeAt(0).cloneRange();
      range.surroundContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    var node = document.createElement("a");
    node.setAttribute("href", url);
    node.textContent = title;
    edo_editor.insertNodeAtCaret(node);

    // remove <a> tag while all characters deleted. listener for newly created tag
    const callback = function (mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === "childList") {
          console.log("A child node has been added or removed.");
          if (mutation.target.textContent.length === 0) {
            mutation.target.remove();
            observer.disconnect();
          }
        }
      }
    };

    // Create an observer instance linked to the callback function
    var observer = new MutationObserver(callback);

    const config = { attributes: false, childList: true, subtree: false };
    // Start observing the target node for configured mutations
    observer.observe(node, config);
  }

  edo_editor.enabledEditingItems();
};

edo_editor.updateLink = function (url, title) {
  edo_editor.restoreRange();

  if (edo_editor.currentEditingLink) {
    var c = edo_editor.currentEditingLink;
    c.attr("href", url);
    c.attr("title", title);
  }
  edo_editor.enabledEditingItems();
}; //end

edo_editor.unlink = function () {
  if (edo_editor.currentEditingLink) {
    var c = edo_editor.currentEditingLink;
    c.contents().unwrap();
  }
  edo_editor.enabledEditingItems();
};

edo_editor.quickLink = function () {
  var sel = document.getSelection();
  var link_url;
  var test = String(sel);
  var mailRegexp = new RegExp("^(.+)(@)(.+)$", "gi");
  if (test.search(mailRegexp) === -1) {
    var checkHTTPLink = new RegExp("^http://", "gi");
    if (test.search(checkHTTPLink) === -1) {
      var checkAnchorLink = new RegExp("^#", "gi");
      if (test.search(checkAnchorLink) === -1) {
        link_url = "http://" + sel;
      } else {
        link_url = sel;
      }
    } else {
      link_url = sel;
    }
  } else {
    var checkMailLink = new RegExp("^mailto:", "gi");
    if (test.search(checkMailLink) === -1) {
      link_url = "mailto:" + sel;
    } else {
      link_url = sel;
    }
  }

  var html_code = '<a href="' + link_url + '">' + sel + "</a>";
  edo_editor.insertHTML(html_code);
};

edo_editor.prepareInsert = function () {
  edo_editor.backupRange();
};

edo_editor.setHTML = function (html) {
  var editor = $("#edo-container");
  editor.html(html);
};

edo_editor.insertHTML = function (html) {
  document.execCommand("insertHTML", false, html);
  edo_editor.enabledEditingItems();
};

edo_editor.getHTML = function () {
  // Blockquote
  var bq = $("blockquote");
  if (bq.length !== 0) {
    bq.each(function () {
      var b = $(this);
      if (b.css("border").indexOf("none") !== -1) {
        b.css({ border: "" });
      }
      if (b.css("padding").indexOf("0px") !== -1) {
        b.css({ padding: "" });
      }
    });
  }

  return document.getElementById("edo-container").innerHTML;
};

edo_editor.getText = function () {
  return $("#edo-container").text();
};

edo_editor.isCommandEnabled = function (commandName) {
  return document.queryCommandState(commandName);
};

edo_editor.enabledEditingItems = function (e) {
  var items = [];
  if (edo_editor.isCommandEnabled("bold")) {
    items.push("bold");
  }
  if (edo_editor.isCommandEnabled("italic")) {
    items.push("italic");
  }
  if (edo_editor.isCommandEnabled("subscript")) {
    items.push("subscript");
  }
  if (edo_editor.isCommandEnabled("superscript")) {
    items.push("superscript");
  }
  if (edo_editor.isCommandEnabled("strikeThrough")) {
    items.push("strikeThrough");
  }
  if (edo_editor.isCommandEnabled("underline")) {
    items.push("underline");
  }
  if (edo_editor.isCommandEnabled("insertOrderedList")) {
    items.push("orderedList");
  }
  if (edo_editor.isCommandEnabled("insertUnorderedList")) {
    items.push("unorderedList");
  }
  if (edo_editor.isCommandEnabled("justifyCenter")) {
    items.push("justifyCenter");
  }
  if (edo_editor.isCommandEnabled("justifyFull")) {
    items.push("justifyFull");
  }
  if (edo_editor.isCommandEnabled("justifyLeft")) {
    items.push("justifyLeft");
  }
  if (edo_editor.isCommandEnabled("justifyRight")) {
    items.push("justifyRight");
  }
  if (edo_editor.isCommandEnabled("insertHorizontalRule")) {
    items.push("horizontalRule");
  }
  var formatBlock = document.queryCommandValue("formatBlock");
  if (formatBlock.length > 0) {
    items.push(formatBlock);
  }

  // The target element
  var s = edo_editor.getSelectedNode();
  if (s === undefined) {
    return;
  }

  var t = $(s);
  var nodeName = s.nodeName.toLowerCase();

  // Background Color
  var bgColor = t.css("backgroundColor");
  if (
    bgColor.length !== 0 &&
    bgColor !== "rgba(0, 0, 0, 0)" &&
    bgColor !== "rgb(0, 0, 0)" &&
    bgColor !== "rgb(255,255,141)" &&
    bgColor !== "rgb(255, 255, 255)" &&
    bgColor !== "transparent"
  ) {
    items.push("backgroundColor");
  }

  // should use "queryCommandValue" instead of "t.css('font-size')"
  // because button status should be changed immediately when tapped, however css at the caret will not change until input
  var textFont = document.queryCommandValue("fontSize");
  if (textFont.length !== 0) {
    items.push("fontSize:" + textFont);
  }

  // Text Color
  var textColor = t.css("color");
  if (
    textColor.length !== 0 &&
    textColor !== "rgba(0, 0, 0, 0)" &&
    textColor !== "rgb(0, 0, 0)" &&
    textColor !== "transparent"
  ) {
    items.push("textColor:" + textColor);
  }

  //Fonts
  //use document.queryCommandValue('fontName') fond fontName
  var font = document.queryCommandValue("fontName");
  if (font.length !== 0 && font !== "Arial, Helvetica, sans-serif") {
    items.push("fonts:" + font);
  }

  items.push(
    "selected-title:" + window.getSelection().getRangeAt(0).toString()
  );
  // Link
  if (nodeName === "a") {
    edo_editor.currentEditingLink = t;
    items.push("link:" + t.attr("href"));
    if (t.attr("title") !== undefined) {
      items.push("link-title:" + t.attr("title"));
    }
  } else {
    edo_editor.currentEditingLink = null;
  }
  // Blockquote
  if (nodeName === "blockquote") {
    items.push("indent");
  }

  // start callback
  if (items.length > 0) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(items.join(",,"));
    }
  } else {
    console.log("items count == 0, will not callback.");
  }
};

edo_editor.focusEditor = function () {
  // the following was taken from
  // http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442
  // and ensures we move the cursor to the end of the editor
  var editor = $("#edo-container");
  var range = document.createRange();
  range.selectNodeContents(editor.get(0));
  range.collapse(false);
  var selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
};

edo_editor.focusBody = function () {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.setStart(
    edo_editor.currentSelection.startContainer,
    edo_editor.currentSelection.startOffset
  );
  range.setEnd(
    edo_editor.currentSelection.endContainer,
    edo_editor.currentSelection.endOffset
  );
  selection.addRange(range);
  var editor = $("#edo-container");
  editor.focus();
};

edo_editor.focusEditorBeginning = function () {
  // and ensures we move the cursor to the start of the editor
  var editor = $("#edo-container");
  var range = document.createRange();
  range.selectNodeContents(editor.get(0));
  range.collapse(true);
  var selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
};

edo_editor.blurEditor = function () {
  $("#edo-container").blur();
};

edo_editor.setCustomCSS = function (customCSS) {
  document.getElementsByTagName("style")[0].innerHTML = customCSS;
};

edo_editor.checkVariableFocusStatus = function () {
  $("." + edo_editor.templateVariableClassName).removeClass(
    edo_editor.templateVariableFocusedClassName
  );
  var selectedNode = edo_editor.getSelectedNode();
  if ($(selectedNode).hasClass(edo_editor.templateVariableClassName)) {
    $(selectedNode).addClass(edo_editor.templateVariableFocusedClassName);

    if (edo_editor.isEditingSnippet) {
      if (!edo_editor.isFocusingVariable) {
        setTimeout(function () {
          window.location = "variable://focus";
        }, 100);
      }

      edo_editor.isFocusingVariable = true;
    }
  } else {
    if (edo_editor.isEditingSnippet) {
      if (edo_editor.isFocusingVariable) {
        window.location = "variable://blur";
      }

      edo_editor.isFocusingVariable = false;
    }
  }
};

edo_editor.blurVariable = function () {
  var selectedNode = edo_editor.getSelectedNode();
  if (!$(selectedNode).hasClass(edo_editor.templateVariableClassName)) {
    return;
  }

  var zwsTextNode = selectedNode.nextSibling;
  if (!zwsTextNode || !edo_editor.isZeroWidthSpace(zwsTextNode)) {
    var emptyTextNode = edo_editor.createZeroWidthSpace();
    $(selectedNode).after(emptyTextNode);
    zwsTextNode = emptyTextNode;
  }

  var spaceTextNode = zwsTextNode.nextSibling;
  if (!spaceTextNode) {
    spaceTextNode = document.createTextNode("\u00A0");
    $(zwsTextNode).after(spaceTextNode);
  }

  var range = document.createRange();
  range.setStart(spaceTextNode, 1);
  range.setEnd(spaceTextNode, 1);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
};

edo_editor.createVariable = function () {
  var variableElement = document.createElement("span");
  if (window.getSelection().isCollapsed)
    variableElement.innerHTML = "\u200b" + edo_editor.placeholder;
  else {
    variableElement.innerHTML =
      "\u200b" +
      window.getSelection().getRangeAt(0).cloneContents().firstChild
        .textContent;
    window.getSelection().deleteFromDocument();
  }

  var att = document.createAttribute("class");
  att.value = edo_editor.templateVariableClassName;
  variableElement.setAttributeNode(att);

  edo_editor.insertNodeAtCaret(variableElement);
  var textChildNodes = edo_editor.getSelectedNode().childNodes;
  var lastChlldNode = textChildNodes[textChildNodes.length - 1];
  var range = document.createRange();
  range.setStart(textChildNodes[0], 1);
  range.setEnd(lastChlldNode, lastChlldNode.length);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  var prevSibling = variableElement.previousSibling;
  if (prevSibling && prevSibling.nodeName.toLowerCase() === "#text") {
    if (
      prevSibling.length === 0 ||
      prevSibling.textContent.charCodeAt(prevSibling.length - 1) !== 160
    ) {
      var spaceBefore = document.createTextNode("\u00A0");
      $(variableElement).before(spaceBefore);
    }
  }

  var spaceAfter = document.createTextNode("\u00A0");
  $(variableElement).after(spaceAfter);

  var zeroWidthSpaceElement = edo_editor.createZeroWidthSpace();

  // insert zero-width-space after variableElement
  variableElement.parentNode.insertBefore(
    zeroWidthSpaceElement,
    variableElement.nextSibling
  );

  edo_editor.isFocusingVariable = true;
};

// zero width space. https://en.wikipedia.org/wiki/Zero-width_space
edo_editor.createZeroWidthSpace = function () {
  return document.createTextNode("\u200B");
};

edo_editor.isZeroWidthSpace = function (node) {
  return (
    node.nodeName.toLowerCase() === "#text" &&
    node.textContent.indexOf("\u200b") === 0
  );
};

edo_editor.insertNodeAtCaret = function (node) {
  var sel = window.getSelection();
  if (sel.rangeCount === 0) {
    edo_editor.restoreRange();
    $("#edo-container").focus();
  }

  if (sel.rangeCount) {
    var range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(node);
    range = range.cloneRange();
    range.selectNodeContents(node);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
};

edo_editor.createPredefinedVariable = function (predefinedVariableKey) {
  var selectedNode = edo_editor.getSelectedNode();
  if (!$(selectedNode).hasClass(edo_editor.templateVariableClassName)) {
    console.log("current node is not a Variable, should not replace.");
    return;
  }

  if (predefinedVariables[predefinedVariableKey] !== null) {
    selectedNode.innerText = predefinedVariables[predefinedVariableKey];
    edo_editor.blurVariable();

    selectedNode.setAttribute("contentEditable", "false");

    if (edo_editor.isEditingSnippet) {
      // work around to avoid conflict against 'callback://'
      setTimeout(function () {
        window.location.href = "variable://blur";
      }, 100);
      edo_editor.isFocusingVariable = false;
    }
  } else {
    console.log("unexpected predefinedVariableKey: " + predefinedVariableKey);
  }
};

edo_editor.getUndefinedVariableCount = function () {
  return $("." + edo_editor.templateVariableClassName).length;
};

export default edo_editor;
