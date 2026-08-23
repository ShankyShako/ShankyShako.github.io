export type Product = { title: string; short: string; price: string; image: string; alt: string };

export const products: Product[] = [
  { title: 'Smurfed — Handcut Felt Sticker', short: 'Smurfed', price: '$14',
    image: '/image/store/among-us.jpg', alt: 'Handcut felt Among Us sticker' },
  { title: 'Moyai (Original, 1 of 1)', short: 'Moyai', price: '$45',
    image: '/image/store/moai.jpg', alt: 'Moyai napkin ink drawing' },
  { title: 'Portrait of a Frog (Oil Study)', short: 'Portrait of a Frog', price: '$120',
    image: '/image/store/kermit.png', alt: 'Kermit portrait study' },
  { title: 'Strings — Ink Study', short: 'Strings', price: '$90',
    image: '/image/store/strings.jpg', alt: 'Ink study of two stringed instruments' },
  { title: 'Plumber, Abstracted (Original)', short: 'Plumber, Abstracted', price: '$140',
    image: '/image/store/mario.jpg', alt: 'Abstract Mario portrait' },
  { title: 'FOOD (Digital Original)', short: 'FOOD', price: '$180',
    image: '/image/store/fpdd.jpg', alt: 'FOOD digital illustration' },
  { title: 'Paradise — Oil on Canvas', short: 'Paradise', price: '$750',
    image: '/image/store/paradise.jpg', alt: 'Palm tree paradise oil painting' },
  { title: 'The Whole Collection', short: 'The Whole Collection', price: '$1,999',
    image: '/image/store/collection.jpg', alt: 'The full collection bundle' },
];

export const soldOutGifs = ['/image/store/sold-out.gif', '/image/store/cry-about-it.gif'];
