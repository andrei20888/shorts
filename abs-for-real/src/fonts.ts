import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

let fontPromise: Promise<void> | null = null;

const loadArchivo = (): Promise<void> => {
  if (fontPromise) return fontPromise;
  const face = new FontFace(
    'Archivo',
    `url(${staticFile('fonts/Archivo-Variable.ttf')}) format('truetype')`,
    {weight: '100 900', stretch: '62.5% 125%', style: 'normal'},
  );
  fontPromise = face.load().then((loaded) => {
    document.fonts.add(loaded);
  });
  return fontPromise;
};

/** Blocks rendering of the frame until the variable Archivo font is ready. */
export const useArchivo = (): void => {
  const [handle] = useState(() => delayRender('Loading Archivo'));
  useEffect(() => {
    loadArchivo()
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error('Font load failed', err);
        continueRender(handle);
      });
  }, [handle]);
};
