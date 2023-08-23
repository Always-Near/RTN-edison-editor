declare interface Window {
  ReactNativeWebView: any;
  format: (format: any) => void;
  addImage: (params: string) => void;
  replaceImage: (params: string) => void;
  addLink: (text: string, link: string) => void;
  setDefaultValue: (html: string) => void;
  setStyle: (style: string) => void;
  setIsDarkMode: (style: string) => void;
  setFontSize: (fontSize: string) => void;
  setPadding: (padding: string) => void;
  setEditorPlaceholder: (placeholder: string) => void;
  focusTextEditor: () => void;
  blurTextEditor: () => void;
  disableInputImage: (disable: string) => void;
}
