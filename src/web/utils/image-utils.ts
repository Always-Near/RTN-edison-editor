import EventUtils from "./event-utils";
import Theme from "./theme-util";

function imageElements() {
  const imageNodes = document.getElementsByTagName("img");
  return Array.from(imageNodes);
}

function img_diff(
  oriImageNodes: HTMLImageElement[],
  newImageNodes: HTMLImageElement[]
) {
  return newImageNodes.find((newImageItem) => {
    return !oriImageNodes.includes(newImageItem);
  });
}

export function replacePastedImageUrl(webdata: string, localpath: string) {
  const imageNodes = document.getElementsByClassName("edo-image");
  const imagesList = Array.from(imageNodes) as HTMLImageElement[];
  for (const image of imagesList) {
    if (image.src == webdata) {
      image.src = localpath;
      break;
    }
  }
}

export function replaceImageSrc(info: {
  URLKey: string;
  LocalPathKey: string;
}) {
  const images = imageElements();
  const targetImage = images.find((image) => {
    const url = image.getAttribute("src");
    return url && url.indexOf(info.URLKey) == 0;
  });
  if (targetImage) {
    let path = info.LocalPathKey;
    if (!path.startsWith("file")) {
      path = "file://" + path;
    }
    targetImage.setAttribute("src", path);
  }
}

function downloadBlobImage(url: string) {
  return new Promise<string>((resolve, reject) => {
    fetch(url)
      .then((res) => {
        res
          .blob()
          .then((blob) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64data = reader.result as string;
              resolve(base64data);
            };
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export function replaceImage(sourceSrc: string, targetSrc: string) {
  const allImages = imageElements();
  allImages.forEach((img) => {
    if (img.getAttribute("src") === sourceSrc) {
      img.setAttribute("src", targetSrc);
    }
  });
  EventUtils.onContentChange();
}

function onPastedImage(src: string | null) {
  if (!src) {
    return;
  }
  if (/^https?:\/\//.test(src)) {
    // src does not rely on local images
    return;
  }
  if (/^blob:/.test(src)) {
    // pasted image in ios
    downloadBlobImage(src).then((base64String) => {
      replaceImage(src, base64String);
      EventUtils.onPastedImage(base64String);
    });
    return;
  }
  // image is a local path or is a base64 image
  EventUtils.onPastedImage(src);
}

export function detectPaste() {
  const oldImages = imageElements();
  setTimeout(function () {
    const newImages = imageElements();
    const insertedImg = img_diff(oldImages, newImages);
    if (insertedImg) {
      insertedImg.classList.add("edo-image");
      insertedImg.setAttribute(
        "style",
        "width:100%; max-width: 600px; height: auto;"
      );
      const parent = insertedImg.parentNode!;
      const newlineBefore = document.createElement("br");
      parent.insertBefore(newlineBefore, insertedImg);
      const src = insertedImg.getAttribute("src");
      onPastedImage(src);
      addOnload();
    }
    if (document.body.classList.contains("edison-dark")) {
      Theme.applyDarkModeInDraft();
    }
  });
}

export function findCIDImageURL() {
  const images = imageElements();
  const imgLinks = [];
  for (const image of images) {
    const url = image.getAttribute("src");
    if (!url) {
      continue;
    }
    if (url.indexOf("cid:") == 0 || url.indexOf("x-mailcore-image:") == 0) {
      imgLinks.push(url);
    }
  }
  return JSON.stringify(imgLinks);
}

export function addOnload() {
  const images = imageElements();
  // resize the editor height after image loaded
  images.forEach((ele) => {
    ele.addEventListener("load", () => {
      EventUtils.onImageLoad();
    });
  });
}
