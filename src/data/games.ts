/* The Games tab. A new game is one more entry here; the tab, its card and its
   /games/:slug page all come from this list. Titles are working names: the
   final ones get picked before a game ships. */

export type Game = {
  slug: string;
  title: string;
  /** One line on the card and the page's meta description. */
  pitch: string;
  /** Shown as "Unity · 2021". */
  engine: string;
  year: number;
  /** `reviving` shows the card and page without a Play button. */
  status: 'reviving' | 'playable';
  /** `react`: a component in src/games/registry.ts. `webgl`: a static build
      under /game-builds/<slug>/ (see vercel.json), shown in an iframe. */
  kind: 'react' | 'webgl';
  /** 16:10 art. A transparent sprite sits on the frame's paper. Without
      one, the frame shows the title instead. */
  image?: string;
  alt?: string;
  /** Keyboard and mouse only: phones get a note instead of the game. */
  desktopOnly?: boolean;
  controls?: string;
  /** Paragraphs on the game's page. */
  about: string[];
};

export const games: Game[] = [
  {
    slug: 'workout-simulator',
    title: 'Workout Simulator',
    pitch: 'A clicker about getting stronger. Lift, hire robots to lift for you, then start over stronger.',
    engine: 'Unity',
    year: 2021,
    status: 'reviving',
    kind: 'react',
    image: '/image/games/workout.webp',
    alt: 'Hand-drawn lifter bench-pressing a barbell next to a boxy robot helper',
    controls: 'Click or tap',
    about: [
      'Every click is a rep. Points buy Robo-Helpers that lift on their own every five seconds, and new equipment adds to every click. Get strong enough and you can start over with more power per lift.',
      'I made it in Unity in 2021. The original only ran on Windows and forgot your progress when you closed it. It is being rebuilt for the browser with the original drawings, and it will run on phones and save where you left off.',
    ],
  },
  {
    slug: 'natural-disaster-simulator',
    title: 'Natural Disaster Simulator',
    pitch: 'First-person survival on a small island. Each round brings a flood, acid rain or a tsunami. Outlast it.',
    engine: 'Unity',
    year: 2021,
    status: 'reviving',
    kind: 'webgl',
    desktopOnly: true,
    controls: 'WASD to move, Space to jump, mouse to look',
    about: [
      'Each round picks a disaster at random. Acid rain and tsunami waves hurt you anywhere outside the one beam of safe light. A flood just keeps rising, so you climb. Fall off the island and the round is over.',
      'I made it in Unity in 2021. It is being rebuilt to play in the browser, with new sound and a few bugs from the original fixed.',
    ],
  },
];

export const gameBySlug = (slug: string | undefined) => games.find((g) => g.slug === slug);
