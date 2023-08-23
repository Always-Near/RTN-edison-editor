export function debounce(fn: () => void, delay: number) {
  let timeout: number;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn();
    }, delay);
  };
}

function to16(str: number) {
  const str16 = "00" + str.toString(16);
  return str16.substring(str16.length - 2);
}

export const formatColor = (color: string) => {
  if (color.startsWith("#")) {
    return color;
  }
  const s = color.split("(")[1];
  const ns = s.substring(0, s.length - 1).split(",");
  const [r, g, b, a] = ns.map((n) => +n.trim());
  return `#${to16(r)}${to16(g)}${to16(b)}`;
};

export const removeObject = () => {
  const objectNodes = document.getElementsByTagName("object");
  Array.from(objectNodes).forEach((obj) => {
    obj.remove();
  });
};
