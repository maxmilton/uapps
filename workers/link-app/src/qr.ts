// oxlint-disable no-bitwise, no-continue, typescript/prefer-for-of, unicorn/no-new-array, unicorn/numeric-separators-style

type Matrix = Int8Array; // -1 = reserved (function), 0 = white, 1 = black, -2 = unset

// --- Tables for versions 1..4 at EC Level L (index by version)
const DATA_CODEWORDS_L = [0, 19, 34, 55, 80]; // total data codewords
const EC_PER_BLOCK_L = [0, 7, 10, 15, 20]; // EC codewords per block
const ALIGN_POS: Record<number, number[]> = { 2: [6, 18], 3: [6, 22], 4: [6, 26] };

// --- GF(256) for RS (poly 0x11d)
const EXP = new Uint8Array(512);
const LOG = new Int16Array(256);
(() => {
  let x = 1;

  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }

  for (let i = 255; i < 512; i++) {
    EXP[i] = EXP[i - 255];
  }

  LOG[0] = -1;
})();

const gfMul = (a: number, b: number) => {
  if (!a || !b) {
    return 0;
  }
  return EXP[(LOG[a] + LOG[b]) % 255];
};

// Generator polynomial of degree ec
function rsGenerator(ec: number): number[] {
  let g = [1];

  for (let i = 0; i < ec; i++) {
    const a = EXP[i];
    const ng = new Array<number>(g.length + 1).fill(0);

    for (const [j, element] of g.entries()) {
      ng[j] ^= element;
      ng[j + 1] ^= gfMul(element, a);
    }
    g = ng;
  }

  return g; // length ec+1
}

// Systematic RS encode (returns parity bytes)
function rsEncode(data: Uint8Array, ec: number): Uint8Array {
  const gen = rsGenerator(ec);
  const poly = new Uint8Array(data.length + ec);
  poly.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = poly[i];
    if (!coef) continue;

    for (const [j, element] of gen.entries()) {
      poly[i + j] ^= gfMul(element, coef);
    }
  }

  return poly.slice(data.length);
}

// Verify RS remainder is zero for (data + parity)
function rsRemainderIsZero(full: Uint8Array, ec: number): boolean {
  const gen = rsGenerator(ec);
  const poly = new Uint8Array(full.length);
  poly.set(full);

  for (let i = 0; i < full.length - ec; i++) {
    const coef = poly[i];
    if (!coef) continue;

    for (const [j, element] of gen.entries()) {
      poly[i + j] ^= gfMul(element, coef);
    }
  }

  for (let i = full.length - ec; i < full.length; i++) {
    if (poly[i] !== 0) {
      return false;
    }
  }
  return true;
}

// --- Build data codewords (byte mode)
function buildCodewords(payload: Uint8Array, version: number) {
  // mode (0100), length (8 bits for v<=9), payload bytes
  const bits: number[] = [];
  const pushBits = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(payload.length, 8);
  for (let i = 0; i < payload.length; i++) pushBits(payload[i], 8);
  // terminator up to 4 zeros
  for (let i = 0; i < 4; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const dataBytesNeeded = DATA_CODEWORDS_L[version];
  const data = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < data.length; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | (bits[i * 8 + b] || 0);
    data[i] = v;
  }
  const final = new Uint8Array(dataBytesNeeded);
  final.set(data);
  const pad = [0xec, 0x11];
  for (let i = data.length; i < dataBytesNeeded; i++) final[i] = pad[(i - data.length) % 2];
  const ecCount = EC_PER_BLOCK_L[version];
  const ecc = rsEncode(final, ecCount);
  const cw = new Uint8Array(final.length + ecc.length);
  cw.set(final);
  cw.set(ecc, final.length);
  return { codewords: cw, ecCount, dataLen: final.length };
}

function createMatrix(version: number) {
  const size = 21 + 4 * (version - 1);
  const mat = new Int8Array(size * size).fill(-2); // -2 unset, -1 reserved/function, 0 white, 1 black
  const reserved = new Uint8Array(size * size); // 1 = reserved (function), 0 = data
  const set = (r: number, c: number, v: number, res = 1) => {
    mat[r * size + c] = v;
    if (res) reserved[r * size + c] = 1;
  };

  // Finder + separator (top-left, top-right, bottom-left)
  const putFinder = (r: number, c: number) => {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const rr = r + y;
        const cc = c + x;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        // Outside box = separator (white); inside 7x7 pattern
        if (y === -1 || y === 7 || x === -1 || x === 7) {
          set(rr, cc, 0);
          continue;
        }
        const inside =
          x === 0 || x === 6 || y === 0 || y === 6
            ? 1
            : x >= 2 && x <= 4 && y >= 2 && y <= 4
              ? 1
              : 0;
        set(rr, cc, inside ? 1 : 0);
      }
    }
  };
  putFinder(0, 0);
  putFinder(0, size - 7);
  putFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 ? 0 : 1);
    set(i, 6, i % 2 ? 0 : 1);
  }

  // Alignment patterns (version >= 2)
  const aligns = ALIGN_POS[version];
  if (aligns) {
    for (const ay of aligns) {
      for (const ax of aligns) {
        // Skip if overlapping a finder
        if (
          (ay === 6 && ax === 6)
          || (ay === 6 && ax === size - 7)
          || (ay === size - 7 && ax === 6)
        )
          continue;
        for (let y = -2; y <= 2; y++) {
          for (let x = -2; x <= 2; x++) {
            const inside = Math.abs(x) === 2 || Math.abs(y) === 2 ? 1 : x === 0 && y === 0 ? 1 : 0;
            set(ay + y, ax + x, inside ? 1 : 0);
          }
        }
      }
    }
  }

  // Dark module
  set(8, 4 * version + 9, 1);

  // Reserve format areas (we'll write them later)
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      reserved[8 * size + i] = 1;
      reserved[i * size + 8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[(size - 1 - i) * size + 8] = 1;
    reserved[8 * size + (size - 1 - i)] = 1;
  }

  // Mark any function modules as reserved explicitly
  for (let i = 0; i < size * size; i++) if (mat[i] !== -2) reserved[i] = 1;

  return { size, mat, reserved };
}

// --- place data bits (zig-zag)
function placeDataBits(matrix: Matrix, reserved: Uint8Array, size: number, dataBits: number[]) {
  let col = size - 1;
  let dirUp = true;
  let bitIdx = 0;

  while (col > 0) {
    if (col === 6) col--; // skip timing column
    for (let r = 0; r < size; r++) {
      const row = dirUp ? size - 1 - r : r;
      for (let c = col; c >= col - 1; c--) {
        const idx = row * size + c;
        if (reserved[idx]) continue;
        matrix[idx] = dataBits[bitIdx++] ?? 0;
      }
    }
    col -= 2;
    dirUp = !dirUp;
  }
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penaltyScore(matrix: Matrix, size: number) {
  let score = 0;

  // Rule 1 rows
  for (let r = 0; r < size; r++) {
    let run = 1;
    let last = matrix[r * size + 0];

    for (let c = 1; c < size; c++) {
      const cur = matrix[r * size + c];
      if (cur === last) {
        run++;
      } else {
        if (run >= 5) {
          score += 3 + (run - 5);
        }
        run = 1;
        last = cur;
      }
    }
    if (run >= 5) {
      score += 3 + (run - 5);
    }
  }

  // Rule 1 cols
  for (let c = 0; c < size; c++) {
    let run = 1;
    let last = matrix[c];

    for (let r = 1; r < size; r++) {
      const cur = matrix[r * size + c];

      if (cur === last) {
        run++;
      } else {
        if (run >= 5) {
          score += 3 + (run - 5);
        }
        run = 1;
        last = cur;
      }
    }
    if (run >= 5) {
      score += 3 + (run - 5);
    }
  }

  // Rule 2 (2x2)
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r * size + c];
      if (
        v === matrix[r * size + c + 1]
        && v === matrix[(r + 1) * size + c]
        && v === matrix[(r + 1) * size + c + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 3 finder-like patterns
  const pattern = [1, 0, 1, 1, 1, 0, 1];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let ok = true;
      for (let k = 0; k < 7; k++) {
        if (matrix[r * size + c + k] !== pattern[k]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Check 4 white modules before or after
      const beforeWhite =
        c >= 4 && matrix.slice(r * size + c - 4, r * size + c).every((x) => x === 0);
      const afterWhite =
        c + 7 <= size - 4
        && matrix.slice(r * size + c + 7, r * size + c + 11).every((x) => x === 0);
      if (beforeWhite || afterWhite) {
        score += 40;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let ok = true;
      for (let k = 0; k < 7; k++) {
        if (matrix[(r + k) * size + c] !== pattern[k]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const beforeWhite = r >= 4 && [0, 1, 2, 3].every((d) => matrix[(r - 4 + d) * size + c] === 0);
      const afterWhite =
        r + 7 <= size - 4 && [0, 1, 2, 3].every((d) => matrix[(r + 7 + d) * size + c] === 0);
      if (beforeWhite || afterWhite) score += 40;
    }
  }

  // Rule 4 dark ratio
  let dark = 0;
  for (const element of matrix) {
    if (element === 1) {
      dark++;
    }
  }
  const pct = Math.round((dark * 100) / (size * size));
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

// --- format bits (BCH + mask)
function formatBitsFor(mask: number): number[] {
  const ecBits = 0b01; // L
  const five = (ecBits << 3) | (mask & 0b111);
  const g = 0b10100110111;
  let v = five << 10;

  for (let i = 14; i >= 10; i--) {
    if ((v >> i) & 1) {
      v ^= g << (i - 10);
    }
  }

  const remainder = v & 0x3ff;
  const format = ((five << 10) | remainder) ^ 0b101010000010010;
  const arr = new Array<number>(15);

  for (let i = 14; i >= 0; i--) {
    arr[14 - i] = (format >> i) & 1;
  }

  return arr;
}

function putFormatBits(matrix: Matrix, reserved: Uint8Array, size: number, bits: number[]) {
  // Places bits[] into the two format locations (mapping per spec / Thonky)
  // First copy (around top-left finder)
  for (let i = 0; i <= 5; i++) {
    matrix[8 * size + i] = bits[i];
    reserved[8 * size + i] = 1;
  }
  matrix[8 * size + 7] = bits[6];
  reserved[8 * size + 7] = 1;
  matrix[8 * size + 8] = bits[7];
  reserved[8 * size + 8] = 1;
  matrix[7 * size + 8] = bits[8];
  reserved[7 * size + 8] = 1;
  for (let i = 9; i < 15; i++) {
    matrix[(15 - i) * size + 8] = bits[i];
    reserved[(15 - i) * size + 8] = 1;
  }

  // Second copy (top-right & bottom-left)
  for (let i = 0; i < 8; i++) {
    matrix[(size - 1 - i) * size + 8] = bits[i];
    reserved[(size - 1 - i) * size + 8] = 1;
  }
  for (let i = 8; i < 15; i++) {
    matrix[8 * size + (size - 15 + i)] = bits[i];
    reserved[8 * size + (size - 15 + i)] = 1;
  }
}

export function encodeToCanvas(text: string, scale = 4): HTMLCanvasElement {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 80) {
    throw new Error(
      "payload too long for versions 1..4 (this generator supports up to ~80 bytes at L).",
    );
  }

  // pick smallest version
  const neededBits = 4 + 8 + bytes.length * 8 + 4;
  const neededBytes = Math.ceil(neededBits / 8);
  let version = 1;
  while (version <= 4 && DATA_CODEWORDS_L[version] < neededBytes) version++;
  if (version > 4) throw new Error("need larger version - not supported here");

  const { codewords, ecCount, dataLen } = buildCodewords(bytes, version);
  // data bits (MSB-first per codeword)
  const dataBits: number[] = [];
  for (let i = 0; i < codewords.length; i++)
    for (let b = 7; b >= 0; b--) dataBits.push((codewords[i] >> b) & 1);

  const { size, mat, reserved } = createMatrix(version);
  placeDataBits(mat, reserved, size, dataBits);

  // choose best mask
  let best: Int8Array | null = null;
  let bestScore = Infinity;
  let bestMask = 0;

  for (let m = 0; m < 8; m++) {
    const test = Int8Array.from(mat);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        if (reserved[idx]) continue;
        if (MASKS[m](r, c)) test[idx] ^= 1;
      }
    }
    // put format bits & dark module
    const format = formatBitsFor(m);
    putFormatBits(test, reserved, size, format);
    test[8 * size + (4 * version + 9)] = 1; // dark module (also reserved)
    const sc = penaltyScore(test, size);
    if (sc < bestScore) {
      bestScore = sc;
      best = test;
      bestMask = m;
    }
  }
  if (!best) throw new Error("masking failed");

  // Write final format bits with chosen mask
  const finalFormat = formatBitsFor(bestMask);
  putFormatBits(best, reserved, size, finalFormat);
  best[8 * size + (4 * version + 9)] = 1;

  // Render to canvas (quiet zone 4)
  const quiet = 4;
  const canv = document.createElement("canvas");
  canv.width = (size + quiet * 2) * scale;
  canv.height = (size + quiet * 2) * scale;
  const ctx = canv.getContext("2d", { alpha: false })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canv.width, canv.height);
  ctx.fillStyle = "#000";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (best[r * size + c] === 1)
        ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    }
  }
  return canv;
}

// --- Self-tests you can run in the browser console (throws if anything fails)
export function selfTest(): void {
  // GF table property
  for (let a = 1; a < 256; a++) {
    const e = EXP[LOG[a]];
    if (e !== a) throw new Error(`GF tables mismatch for ${a}: exp[log[a]]=${e}`);
  }

  // RS encode remainder test (random test)
  const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
  const ec = 7;
  const parity = rsEncode(payload, ec);
  const full = new Uint8Array(payload.length + parity.length);
  full.set(payload);
  full.set(parity, payload.length);
  if (!rsRemainderIsZero(full, ec)) throw new Error("RS parity check failed");

  // build & placement small real-case: ensure reserved cells not overwritten by data placement
  const text = "https://ex.com/ok";
  const bytes = new TextEncoder().encode(text);
  let ver = 1;
  const neededBits = 4 + 8 + bytes.length * 8 + 4;
  const neededBytes = Math.ceil(neededBits / 8);
  while (ver <= 4 && DATA_CODEWORDS_L[ver] < neededBytes) ver++;
  const { codewords } = buildCodewords(bytes, ver);
  const bits: number[] = [];
  for (let i = 0; i < codewords.length; i++)
    for (let b = 7; b >= 0; b--) bits.push((codewords[i] >> b) & 1);
  const { size, mat, reserved } = createMatrix(ver);
  placeDataBits(mat, reserved, size, bits);
  for (const [i, element] of mat.entries()) {
    if (reserved[i]) {
      // reserved cells must still equal 0 or 1 (function modules), not left as unset (-2)
      if (element === -2) throw new Error(`Reserved function module left unset at index ${i}`);
    }
  }
  console.info("selfTest: GF, RS parity, and reserved-placement checks passed.");
}
