import Pica from 'pica';
import { Area } from 'react-easy-crop';

export type ImageScaling = 'precise' | 'smooth';

// Avatars are stored as a fixed-size square; the circle is applied purely with CSS at display time.
const OUTPUT_SIZE = 512;

const pica = Pica();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Produces the final avatar PNG from a source image and the crop region chosen in the dialog. The
 * crop is drawn at its native resolution, then resized to a fixed square with the selected pica
 * filter: 'box' (nearest-neighbour, "Precise") or 'lanczos3' ("Smooth").
 */
export async function renderCroppedAvatar(
  source: string,
  area: Area,
  scaling: ImageScaling
): Promise<Blob> {
  const img = await loadImage(source);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = area.width;
  cropCanvas.height = area.height;
  const ctx = cropCanvas.getContext('2d');
  if (ctx == null) {
    throw new Error('Could not get canvas context');
  }
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = OUTPUT_SIZE;
  outCanvas.height = OUTPUT_SIZE;
  await pica.resize(cropCanvas, outCanvas, {
    filter: scaling === 'precise' ? 'box' : 'lanczos3',
  });

  return pica.toBlob(outCanvas, 'image/png');
}
