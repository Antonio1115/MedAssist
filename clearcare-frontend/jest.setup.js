import { TextDecoder, TextEncoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
