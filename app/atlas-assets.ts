export const ATLAS_COLUMNS = 4;
export const ATLAS_ROWS = 2;

const atlasCache = new Map<string, Promise<HTMLCanvasElement>>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function atlasCellSizeForHeight(
  atlas: { width: number; height: number },
  height: number,
  rows = ATLAS_ROWS,
  columns = ATLAS_COLUMNS,
): { width: number; height: number } {
  const cellWidth = atlas.width / columns;
  const cellHeight = atlas.height / rows;
  return { width: height * cellWidth / cellHeight, height };
}

export function assetLoadingPercent(completed: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round(Math.max(0, Math.min(completed, total)) / total * 100);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
  imageCache.set(src, request);
  return request;
}

interface BackdropColor {
  red: number;
  green: number;
  blue: number;
}

const DEFAULT_MAGENTA_BACKDROP: BackdropColor = { red: 242, green: 9, blue: 232 };
const MAGENTA_TRANSPARENT_DISTANCE = 45;
const MAGENTA_OPAQUE_DISTANCE = 112;

export function magentaBackdropAlpha(
  red: number,
  green: number,
  blue: number,
  backdrop: BackdropColor = DEFAULT_MAGENTA_BACKDROP,
): number {
  const distance = Math.hypot(red - backdrop.red, green - backdrop.green, blue - backdrop.blue);
  if (distance <= MAGENTA_TRANSPARENT_DISTANCE) return 0;
  if (distance >= MAGENTA_OPAQUE_DISTANCE) return 255;

  const progress = (distance - MAGENTA_TRANSPARENT_DISTANCE) / (MAGENTA_OPAQUE_DISTANCE - MAGENTA_TRANSPARENT_DISTANCE);
  const feathered = progress * progress * (3 - 2 * progress);
  return Math.round(feathered * 255);
}

function estimateMagentaBackdrop(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): BackdropColor | null {
  const borderSize = Math.min(8, Math.floor(Math.min(width, height) / 2));
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let samples = 0;
  let borderPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= borderSize && x < width - borderSize && y >= borderSize && y < height - borderSize) continue;
      borderPixels += 1;
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const magentaFloor = Math.min(red, blue);
      if (magentaFloor < 180 || green > 100 || magentaFloor - green < 80 || Math.abs(red - blue) > 90) continue;
      redTotal += red;
      greenTotal += green;
      blueTotal += blue;
      samples += 1;
    }
  }

  if (samples < borderPixels * .8) return null;
  return {
    red: redTotal / samples,
    green: greenTotal / samples,
    blue: blueTotal / samples,
  };
}

function clearMagentaBackdrop(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const backdrop = estimateMagentaBackdrop(image.data, width, height);
  if (!backdrop) return false;

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const keyedAlpha = magentaBackdropAlpha(image.data[offset], image.data[offset + 1], image.data[offset + 2], backdrop);
    image.data[offset + 3] = Math.min(image.data[offset + 3], keyedAlpha);
  }
  context.putImageData(image, 0, 0);
  return true;
}

function isNeutralBackdropPixel(data: Uint8ClampedArray, pixel: number): boolean {
  const offset = pixel * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return darkest > 210 && brightest - darkest < 20;
}

function clearConnectedNeutralBackdrop(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;

  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (pixel: number) => {
    if (visited[pixel] || !isNeutralBackdropPixel(image.data, pixel)) return;
    visited[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y < height - 1) enqueue(pixel + width);
  }

  for (let pixel = 0; pixel < visited.length; pixel += 1) {
    if (visited[pixel]) image.data[pixel * 4 + 3] = 0;
  }
  context.putImageData(image, 0, 0);
}

export function loadProcessedAtlas(src: string): Promise<HTMLCanvasElement> {
  const cached = atlasCache.get(src);
  if (cached) return cached;

  const request = loadImage(src).then((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context?.drawImage(image, 0, 0);
    if (!clearMagentaBackdrop(canvas)) clearConnectedNeutralBackdrop(canvas);
    return canvas;
  });
  atlasCache.set(src, request);
  return request;
}

export function drawAtlasCell(
  context: CanvasRenderingContext2D,
  atlas: CanvasImageSource & { width: number; height: number },
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  flip = false,
  rows = ATLAS_ROWS,
  columns = ATLAS_COLUMNS,
): void {
  const cellWidth = atlas.width / columns;
  const cellHeight = atlas.height / rows;
  const sourceX = (index % columns) * cellWidth;
  const sourceY = Math.floor(index / columns) * cellHeight;

  context.save();
  context.translate(x, y);
  if (flip) context.scale(-1, 1);
  context.drawImage(atlas, sourceX, sourceY, cellWidth, cellHeight, -width / 2, -height / 2, width, height);
  context.restore();
}
