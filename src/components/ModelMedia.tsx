import { useEffect, useState } from 'react';

const MODEL_VIEWER_SRC = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';

let loading: Promise<void> | null = null;

/* Injected on first use, not in index.html: most visitors never open this row,
   and the library is far larger than the model it draws. A failed load clears
   the cache so reopening the row tries again. */
function loadModelViewer(): Promise<void> {
  if (customElements.get('model-viewer')) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      loading = null;
      reject(new Error('model-viewer failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/* Mounted only while its row is open, so a closed row costs nothing and
   closing the row stops the video. Until the viewer is defined (or if it never
   loads) the tile shows the same poster the viewer will, so nothing jumps. */
export function ModelMedia({ folder, label }: { folder: string; label: string }) {
  const [ready, setReady] = useState(() => !!customElements.get('model-viewer'));
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    let live = true;
    loadModelViewer().then(
      () => live && setReady(true),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="model-media">
      <div className="model-tile">
        <video
          autoPlay={!reduceMotion}
          controls={reduceMotion}
          muted
          loop
          playsInline
          preload="none"
          poster={`${folder}turntable-poster.jpg`}
          aria-label={`Turntable video of ${label}`}
        >
          <source src={`${folder}turntable-720.webm`} type="video/webm" />
          <source src={`${folder}turntable-720.mp4`} type="video/mp4" />
        </video>
      </div>
      <div className="model-tile">
        {ready ? (
          <model-viewer
            src={`${folder}hand.glb`}
            poster={`${folder}viewer-poster.jpg`}
            aria-label={`Interactive 3D model of ${label}. Drag to rotate.`}
            camera-controls
            touch-action="pan-y"
            loading="lazy"
            reveal="auto"
            camera-orbit="-28deg 82deg auto"
            exposure="1.05"
            environment-image="neutral"
            shadow-intensity="0"
          />
        ) : (
          <img src={`${folder}viewer-poster.jpg`} alt={`Preview of ${label}`} />
        )}
      </div>
    </div>
  );
}
