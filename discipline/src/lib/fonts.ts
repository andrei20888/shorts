import { continueRender, delayRender, staticFile } from 'remotion';
import { TEXT } from '../config/theme';

/**
 * Nunito (OFL) is bundled in public/fonts so renders are offline + deterministic.
 * Rendering waits until the faces are ready.
 */
let started = false;

export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading Nunito');
  const faces = [800, 900].map(
    (w) =>
      new FontFace(TEXT.family, `url('${staticFile(`fonts/nunito-latin-${w}-normal.woff2`)}') format('woff2')`, {
        weight: String(w),
      }),
  );
  Promise.all(faces.map((f) => f.load()))
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch((err) => {
      console.error('Font load failed', err);
      continueRender(handle);
    });
};
