import { append, create } from "stage1/fast";
import { encodeToCanvas, selfTest } from "../qr.ts";

try {
  // run quick verification (throws if any check fails)
  selfTest();
} catch (error) {
  console.error(error);
}

export const QrCode = (url: string): HTMLElement => {
  const root = create("div");

  const canvas = encodeToCanvas(url, 4);
  // document.body.appendChild(canvas);
  append(canvas, root);

  return root;
};

// qr.ts - modern TypeScript, compact QR generator (versions 1..4, EC=L, byte mode)
