export type Product = {
  title: string; short: string; price: string; image: string; alt: string;
  /** Leads the page, large, above the grid of single pieces. */
  featured?: true;
  /** A landscape piece: a wide card closing the page, below the 4 × 4 grid. */
  closing?: true;
  /** One line under a wide card's title. */
  note?: string;
  /** Where the square crop centres (CSS object-position), for art whose
      subject is off-centre. */
  focus?: string;
};

export const products: Product[] = [
  { title: 'Smurfed (Handcut Felt Sticker)', short: 'Smurfed', price: '$14',
    image: '/image/store/among-us.jpg', alt: 'Handcut felt Among Us sticker' },
  { title: 'Moyai (Original, 1 of 1)', short: 'Moyai', price: '$45',
    image: '/image/store/moai.jpg', alt: 'Moyai napkin ink drawing' },
  { title: "Surfin' (Whiteboard, Since Erased)", short: "Surfin'", price: '$65',
    image: '/image/store/surfin.jpg',
    alt: 'Whiteboard marker cartoon of a grinning guy in slatted sunglasses, his shirt reading Surfin over a stick-figure surfer' },
  { title: 'Jailbreak (Whiteboard, Since Erased)', short: 'Jailbreak', price: '$85',
    image: '/image/store/hedgehog.jpg',
    alt: 'Whiteboard marker cartoon of a grinning hedgehog sprinting away from a tiny jail, a stick figure inside' },
  { title: 'Portrait of a Frog (Oil Study)', short: 'Portrait of a Frog', price: '$120',
    image: '/image/store/kermit.jpg',
    alt: 'Kermit, whole, slumped at a table sipping orange juice through a straw, a plate of spaghetti in front' },
  { title: 'Strings (Ink Study)', short: 'Strings', price: '$90',
    image: '/image/store/strings.jpg', alt: 'Ink study of two stringed instruments' },
  { title: 'Under the Arches (Whiteboard, Since Erased)', short: 'Under the Arches', price: '$110',
    image: '/image/store/arches.jpg',
    alt: 'Whiteboard marker drawing of two big arches with fringed feet, a grinning figure on a stool under the first' },
  { title: 'Plumber, Abstracted (Original)', short: 'Plumber, Abstracted', price: '$140',
    image: '/image/store/mario.jpg', alt: 'Abstract Mario portrait' },
  { title: 'FOOD (Digital Original)', short: 'FOOD', price: '$180',
    image: '/image/store/fpdd.jpg', alt: 'FOOD digital illustration' },
  { title: 'Daydream (Contour Drawing)', short: 'Daydream', price: '$220',
    image: '/image/store/seated.jpg',
    alt: 'Pencil contour drawing of a long-haired figure in profile, leaning back with one foot up, the shoe sole patterned' },
  { title: 'Mr. Knot (Whiteboard, Since Erased)', short: 'Mr. Knot', price: '$250',
    image: '/image/store/mr-knot.jpg',
    alt: 'Whiteboard marker caricature of Mr. Knot: spiky hair, scribbled sunglasses, goatee and a chain, signed' },
  { title: 'Ice Age (Graphite)', short: 'Ice Age', price: '$320',
    image: '/image/store/landscape.jpg',
    alt: 'Graphite landscape: mountains over a river valley with a mammoth, a bear, a grazing deer and pines' },
  { title: 'Round Glasses (Graphite Portrait)', short: 'Round Glasses', price: '$400',
    image: '/image/store/glasses.jpg',
    alt: 'Graphite portrait of a smiling man with round wire glasses, a dark mustache and short hair' },
  { title: 'Lion (Graphite)', short: 'Lion', price: '$600',
    image: '/image/store/lion.jpg',
    alt: 'Graphite drawing of a lion face, close and front-on, with a shaded mane' },
  { title: 'Paradise (Oil on Canvas)', short: 'Paradise', price: '$750',
    image: '/image/store/paradise.jpg', alt: 'Palm tree paradise oil painting' },
  { title: 'Not My Problem (Digital Collage, 1 of 1)', short: 'Not My Problem', price: '$999',
    image: '/image/store/not-my-problem.jpg', focus: '84% 50%',
    alt: 'Digital collage: Genova in sunglasses, eating an ice cream, walking away from a burning car' },
  { title: 'The Whole Collection', short: 'The Whole Collection', price: '$1,999', featured: true,
    note: 'All seventeen pieces, in one lot.',
    image: '/image/store/collection.jpg', alt: 'The full collection bundle' },
  { title: 'Gyro (Digital Fan Art)', short: 'Gyro', price: '$300', closing: true,
    note: "Gyro Zeppeli, from JoJo's Bizarre Adventure: Steel Ball Run. Fan art by me.",
    image: '/image/store/gyro.jpg',
    alt: 'Flat-color vector fan art of Gyro Zeppeli in a wide-brimmed hat and purple coat, one hand raised, on a plain red background' },
];

export const soldOutGifs = ['/image/store/sold-out.gif', '/image/store/cry-about-it.gif'];
