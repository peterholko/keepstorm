export const ATLAS_COLUMNS = 4;
export const ATLAS_ROWS = 2;

const atlasCache = new Map<string, Promise<HTMLCanvasElement>>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();

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

function isBackdropPixel(data: Uint8ClampedArray, pixel: number): boolean {
  const offset = pixel * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return darkest > 210 && brightest - darkest < 20;
}

function clearConnectedBackdrop(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;

  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (pixel: number) => {
    if (visited[pixel] || !isBackdropPixel(image.data, pixel)) return;
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
    clearConnectedBackdrop(canvas);
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
): void {
  const cellWidth = atlas.width / ATLAS_COLUMNS;
  const cellHeight = atlas.height / ATLAS_ROWS;
  const sourceX = (index % ATLAS_COLUMNS) * cellWidth;
  const sourceY = Math.floor(index / ATLAS_COLUMNS) * cellHeight;

  context.save();
  context.translate(x, y);
  if (flip) context.scale(-1, 1);
  context.drawImage(atlas, sourceX, sourceY, cellWidth, cellHeight, -width / 2, -height / 2, width, height);
  context.restore();
}
