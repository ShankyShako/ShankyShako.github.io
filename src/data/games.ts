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
    status: 'playable',
    kind: 'react',
    image: '/image/games/workout.webp',
    alt: 'Hand-drawn lifter bench-pressing a barbell next to a boxy robot helper',
    controls: 'Click, tap, Space or Enter on the beat',
    about: [
      'Every tap is a rep, and timing counts. Tap as the shrinking ring lands on the gold one for a Perfect rep, worth three times as much, and chain Perfects for a streak bonus. Gains buy equipment that adds to every rep, robots that lift on their own every five seconds, and one-time technique drills. Turn the music on and the kick drum lands on the same beat.',
      'Earn enough and a meet opens: three attempts on the platform, where you stop a needle in the green. Medals from a meet stay when everything else starts over, and each one adds 10% to all Gains. Progress saves in your browser, and your robots keep lifting at half speed while you are away.',
      'I made it in Unity in 2021. The original only ran on Windows and forgot your progress when you closed it. This browser version keeps the original drawings.',
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
