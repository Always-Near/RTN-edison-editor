import React, { Component } from "react";
import {
  ViewStyle,
  Animated,
  Platform,
  TextInput,
  InteractionManager,
  EmitterSubscription,
  Keyboard,
} from "react-native";
import WebView, {
  WebViewMessageEvent,
  WebViewProps,
} from "react-native-webview";
import RNFS from "react-native-fs";
import {
  WebViewErrorEvent,
  WebViewError,
} from "react-native-webview/lib/WebViewTypes";
import "./index.html";
import { EventName, FormatType } from "./constants";
export type { FormatType } from "./constants";

class Variables {
  static readonly packageName = "rn-edison-editor";
  static readonly draftJsFileTargetPath = `file://${RNFS.CachesDirectoryPath}/draftjs.html`;
  static copyFinish = false;
  static draftJsFilePath = Variables.draftJsFileTargetPath;
}

async function copyFileForIos() {
  const htmlPath = `file://${RNFS.MainBundlePath}/assets/node_modules/${Variables.packageName}/lib/index.html`;
  try {
    const fileHasExists = await RNFS.exists(Variables.draftJsFileTargetPath);
    if (fileHasExists) {
      await RNFS.unlink(Variables.draftJsFileTargetPath);
    }
    await RNFS.copyFile(htmlPath, Variables.draftJsFileTargetPath);
    return Variables.draftJsFileTargetPath;
  } catch (err) {
    // badcase remedy
    return htmlPath;
  }
}

async function copyFileForAndroid() {
  const htmlResPath = `raw/node_modules_${Variables.packageName.replace(
    /-/g,
    ""
  )}_lib_index.html`;
  try {
    const fileHasExists = await RNFS.exists(Variables.draftJsFileTargetPath);
    if (fileHasExists) {
      await RNFS.unlink(Variables.draftJsFileTargetPath);
    }
    await RNFS.copyFileRes(htmlResPath, Variables.draftJsFileTargetPath);
    return Variables.draftJsFileTargetPath;
  } catch (err) {
    // badcase remedy
    return `file:///android_res/${htmlResPath}`;
  }
}

async function copyFile() {
  if (Platform.OS === "ios") {
    const filePath = await copyFileForIos();
    Variables.draftJsFilePath = filePath;
  } else if (Platform.OS === "android") {
    const filePath = await copyFileForAndroid();
    Variables.draftJsFilePath = filePath;
  }
  Variables.copyFinish = true;
}

copyFile();

// It must be consistent with `web/types.d.ts`
const InjectScriptName = {
  Format: "format",
  AddImage: "addImage",
  AddLink: "addLink",
  SetDefaultValue: "setDefaultValue",
  SetStyle: "setStyle",
  SetIsDarkMode: "setIsDarkMode",
  SetFontSize: "setFontSize",
  SetPadding: "setPadding",
  SetEditorPlaceholder: "setEditorPlaceholder",
  FocusTextEditor: "focusTextEditor",
  BlurTextEditor: "blurTextEditor",
  DisableInputImage: "disableInputImage",
} as const;

const DoSometingAfterkeyboardDidShowItemDeadTime = 1000 * 10;

export type File = {
  name: string;
  size: number;
  type: string;
  data: string;
};

type DoSometingAfterkeyboardDidShowItem = {
  endTime: number;
  func: () => void;
};

type PropTypes = {
  style?: ViewStyle;
  contentStyle?: React.CSSProperties;
  defaultValue?: string;
  disableInputImage?: boolean;
  placeholder?: string;
  isDarkMode?: boolean;
  defaultFontSize?: number;
  padding?: { paddingVertical: number; paddingHorizontal: number };
  androidLayerType?: "none" | "software" | "hardware";
  onEditorReady?: () => void;
  onActiveStyleChange?: (styles: FormatType[]) => void;
  onSizeChange?: (size: number) => void;
  editPosition?: (pos: number) => void;
  onEditorChange?: (content: string) => void;
  onContentChange?: () => void;
  onPastedImage?: (src: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onError?: (error: WebViewError) => void;
};

type DraftViewState = {
  webviewSource: WebViewProps["source"];
  editorState: string;
  loading: boolean;
};

class RNDraftView extends Component<PropTypes, DraftViewState> {
  timeoutMap: Map<string, NodeJS.Timeout> = new Map();
  webviewMounted: boolean = false;
  private webViewRef = React.createRef<WebView>();
  private textInputRef = React.createRef<TextInput>();
  private maxCheckTime = 100;
  private keyboardDidShowListener: EmitterSubscription | undefined;
  private keyboardDidHideListener: EmitterSubscription | undefined;
  private keyboardShow = false;
  private doSometingAfterkeyboardDidShow: Array<DoSometingAfterkeyboardDidShowItem> =
    [];
  loadingOpacity = new Animated.Value(1);

  constructor(props: any) {
    super(props);
    this.state = {
      webviewSource: undefined,
      editorState: "",
      loading: true,
    };
  }

  componentDidMount() {
    this.getDraftJsFilePath();
    this.keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      this.keyboardDidShow
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      this.keyboardDidHide
    );
  }

  componentWillUnmount() {
    this.keyboardDidShowListener?.remove();
    this.keyboardDidHideListener?.remove();
  }

  keyboardDidShow = () => {
    this.keyboardShow = true;
    while (this.doSometingAfterkeyboardDidShow.length && this.keyboardShow) {
      const doItem = this.doSometingAfterkeyboardDidShow.pop();
      if (!doItem || doItem.endTime < Date.now()) {
        continue;
      }
      doItem.func();
    }
  };

  keyboardDidHide = () => {
    this.keyboardShow = false;
  };

  private AddToDoSometingAfterkeyboardDidShow = (func: () => void) => {
    if (this.keyboardShow) {
      func();
      return;
    }
    this.doSometingAfterkeyboardDidShow.push({
      endTime: Date.now() + DoSometingAfterkeyboardDidShowItemDeadTime,
      func: func,
    });
  };

  UNSAFE_componentWillReceiveProps = (nextProps: PropTypes) => {
    if (!this.webviewMounted) {
      return;
    }
    if (
      nextProps.isDarkMode !== undefined &&
      nextProps.isDarkMode !== this.props.isDarkMode
    ) {
      this.executeScript(
        InjectScriptName.SetIsDarkMode,
        nextProps.isDarkMode.toString()
      );
    }
    if (
      nextProps.defaultFontSize !== undefined &&
      nextProps.defaultFontSize !== this.props.defaultFontSize
    ) {
      this.executeScript(
        InjectScriptName.SetFontSize,
        nextProps.defaultFontSize.toString()
      );
    }
    if (
      nextProps.padding !== undefined &&
      nextProps.padding !== this.props.padding
    ) {
      this.executeScript(
        InjectScriptName.SetPadding,
        this.calcPaddingPx(nextProps.padding)
      );
    }
    if (
      nextProps.defaultValue &&
      nextProps.defaultValue !== this.props.defaultValue
    ) {
      const formatHtml = encodeURIComponent(nextProps.defaultValue);
      this.executeScript(InjectScriptName.SetDefaultValue, formatHtml);
    }

    if (
      typeof nextProps.placeholder === "string" &&
      nextProps.placeholder !== this.props.placeholder
    ) {
      this.executeScript(
        InjectScriptName.SetEditorPlaceholder,
        nextProps.placeholder
      );
    }
  };

  private getDraftJsFilePath = () => {
    this.maxCheckTime = this.maxCheckTime - 1;
    if (Variables.copyFinish) {
      this.setState({ webviewSource: { uri: Variables.draftJsFilePath } });
      return;
    }
    if (this.maxCheckTime <= 0) {
      return;
    }
    setTimeout(() => {
      this.getDraftJsFilePath();
    }, 200);
  };

  private doSomethingAfterMounted = (id: string, func: () => void) => {
    const timeout = this.timeoutMap.get(id);
    if (timeout) {
      clearTimeout(timeout);
    }
    if (!this.webviewMounted) {
      this.timeoutMap.set(
        id,
        setTimeout(() => {
          this.doSomethingAfterMounted(id, func);
        }, 100)
      );
      return;
    }
    func();
  };

  private executeScript = (
    functionName: typeof InjectScriptName[keyof typeof InjectScriptName],
    parameter?: string
  ) => {
    this.doSomethingAfterMounted(`executeScript-${functionName}`, () => {
      if (!this.webViewRef.current) {
        return;
      }
      this.webViewRef.current.injectJavaScript(
        `window.${functionName} && window.${functionName}(${
          parameter ? `\`${parameter}\`` : ""
        });true;`
      );
    });
  };

  private onMessage = (event: WebViewMessageEvent) => {
    const {
      onEditorChange,
      onActiveStyleChange,
      editPosition,
      onSizeChange,
      onBlur,
      onFocus,
      onContentChange,
      onPastedImage,
    } = this.props;
    try {
      const {
        type,
        data,
      }: {
        type: typeof EventName[keyof typeof EventName];
        data: any;
      } = JSON.parse(event.nativeEvent.data);
      if (type === EventName.IsMounted) {
        this.widgetMounted();
        return;
      }
      if (type === EventName.EditorChange) {
        this.setState(
          { editorState: data.replace(/(\r\n|\n|\r)/gm, "") },
          () => {
            onEditorChange && onEditorChange(this.state.editorState);
          }
        );
        return;
      }
      if (type === EventName.ActiveStyleChange) {
        onActiveStyleChange && onActiveStyleChange(data);
        return;
      }
      if (type === EventName.EditPosition && editPosition) {
        editPosition(data);
        return;
      }
      if (type === EventName.SizeChange && onSizeChange) {
        onSizeChange(data);
        return;
      }
      if (type === EventName.OnBlur && onBlur) {
        onBlur();
        return;
      }
      if (type === EventName.OnFocus && onFocus) {
        if (Platform.OS === "android") {
          // android must focus webview first
          this.webViewRef.current?.requestFocus();
          this.executeScript(InjectScriptName.FocusTextEditor);
        }
        onFocus();
        return;
      }
      if (type === EventName.ContentChange && onContentChange) {
        onContentChange();
        return;
      }
      if (type === EventName.OnPastedImage && onPastedImage) {
        onPastedImage(data);
        return;
      }
      if (type === EventName.AfterFocusLeaveEditor) {
        this.afterFocusLeaveEditor(data);
        return;
      }
    } catch (err) {}
  };

  private onError = (event: WebViewErrorEvent) => {
    if (this.props.onError) {
      this.props.onError(event.nativeEvent);
    }
  };

  private widgetMounted = () => {
    this.webviewMounted = true;

    const {
      placeholder,
      disableInputImage,
      defaultValue,
      contentStyle,
      isDarkMode = false,
      defaultFontSize,
      padding,
      onEditorReady = () => null,
    } = this.props;

    if (defaultValue) {
      const formatHtml = encodeURIComponent(defaultValue);
      this.executeScript(InjectScriptName.SetDefaultValue, formatHtml);
    }
    if (contentStyle) {
      this.executeScript(
        InjectScriptName.SetStyle,
        JSON.stringify(contentStyle)
      );
    }
    if (placeholder) {
      this.executeScript(InjectScriptName.SetEditorPlaceholder, placeholder);
    }

    if (disableInputImage) {
      this.executeScript(InjectScriptName.DisableInputImage, "1");
    }

    this.executeScript(InjectScriptName.SetIsDarkMode, isDarkMode.toString());
    if (defaultFontSize) {
      this.executeScript(
        InjectScriptName.SetFontSize,
        defaultFontSize.toString()
      );
    }
    if (padding !== undefined) {
      this.executeScript(
        InjectScriptName.SetPadding,
        this.calcPaddingPx(padding)
      );
    }
    onEditorReady();
    setTimeout(() => {
      Animated.timing(this.loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 200);
  };

  private calcPaddingPx = ({
    paddingVertical,
    paddingHorizontal,
  }: {
    paddingVertical: number;
    paddingHorizontal: number;
  }) => {
    return `${paddingVertical}px ${paddingHorizontal}px`;
  };

  private afterFocusLeaveEditor = async (pos: number) => {
    await this.focusSpecialHandleForSpecialPlatform();
    this.AddToDoSometingAfterkeyboardDidShow(() => {
      setTimeout(() => {
        this.props.editPosition && this.props.editPosition(pos);
      }, 500);
    });
  };

  private focusSpecialHandleForSpecialPlatform = () => {
    return new Promise<void>((resolve) => {
      if (Platform.OS != "android") {
        resolve();
        return;
      }
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          // focus the textinput to wake up the keyborad
          this.textInputRef.current?.focus();
          // android must focus webview first
          this.webViewRef.current?.requestFocus();
          resolve();
        }, 200);
      });
    });
  };

  focus = () => {
    this.doSomethingAfterMounted(`focusAndShowKeyboard`, async () => {
      await this.focusSpecialHandleForSpecialPlatform();
      this.executeScript(InjectScriptName.FocusTextEditor);
    });
  };

  blur = () => {
    this.textInputRef.current?.focus();
    this.textInputRef.current?.blur();
    // to fix blur editor will pop up keyboard twice in tablet(ON-4651)
    if (Platform.OS === "android") {
      setTimeout(() => {
        this.executeScript(InjectScriptName.BlurTextEditor);
      }, 1000);
    } else {
      this.executeScript(InjectScriptName.BlurTextEditor);
    }
  };

  setStyle = (style: FormatType) => {
    this.executeScript(InjectScriptName.Format, style);
  };

  addImage = (src: string) => {
    this.executeScript(InjectScriptName.AddImage, src);
  };

  addLink = (text: string, url: string) => {
    this.executeScript(InjectScriptName.AddLink, JSON.stringify({ text, url }));
  };

  getEditorState = () => {
    return this.state.editorState;
  };

  shouldForceDarkOn = () => {
    const { isDarkMode } = this.props;
    if (Platform.OS === "android" && Platform.Version >= 29) {
      return false;
    }
    return isDarkMode;
  };

  render() {
    const { style = { flex: 1 }, androidLayerType } = this.props;
    return (
      <>
        <WebView
          ref={this.webViewRef}
          style={style}
          source={this.state.webviewSource}
          hideKeyboardAccessoryView
          allowFileAccess
          allowingReadAccessToURL={"file://"}
          keyboardDisplayRequiresUserAction={false}
          originWhitelist={["*"]}
          onMessage={this.onMessage}
          contentMode={"mobile"}
          onError={this.onError}
          scrollEnabled={false}
          forceDarkOn={this.shouldForceDarkOn()}
          androidLayerType={androidLayerType}
          mixedContentMode={"always"}
        />
        <TextInput
          ref={this.textInputRef}
          style={{
            height: 0,
            width: 0,
            position: "absolute",
            left: -1000,
            backgroundColor: "transparent",
          }}
        />
        <Animated.View
          style={{
            ...style,
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 2500,
            alignItems: "center",
            justifyContent: "center",
            opacity: this.loadingOpacity,
          }}
          pointerEvents={"none"}
        ></Animated.View>
      </>
    );
  }
}

export default RNDraftView;
