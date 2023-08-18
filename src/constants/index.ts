export const EventName = {
  IsMounted: "isMounted",
  EditorChange: "editorChange",
  ContentChange: "contentChange",
  ActiveStyleChange: "activeStyleChange",
  SizeChange: "sizeChange",
  EditPosition: "editPosition",
  OnFocus: "onFocus",
  OnBlur: "onBlur",
  OnPastedImage: "onPastedImage",
  AfterFocusLeaveEditor: "afterFocusLeaveEditor",
  Debugger: "debugger",
} as const;

export type FormatType =
  | "CLEAR"
  | `Color-${string}`
  | `Font-${string}`
  | `Size-${string}`
  | `BackgroundColor-${string}`
  | "Bold"
  | "Italic"
  | "Strikethrough"
  | "Underline"
  | "IndentIncrease"
  | "IndentDecrease"
  | "UnorderedList"
  | "OrderedList";
