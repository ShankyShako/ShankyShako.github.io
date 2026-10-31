import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/* <model-viewer> is a custom element, loaded from Google's CDN only when a
   project panel that needs it first opens (see components/ModelMedia.tsx). */
type ModelViewerAttributes = {
  src?: string;
  poster?: string;
  alt?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'manual';
  'camera-controls'?: boolean;
  'touch-action'?: string;
  'camera-orbit'?: string;
  exposure?: string | number;
  'environment-image'?: string;
  'shadow-intensity'?: string | number;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & ModelViewerAttributes;
    }
  }
}
