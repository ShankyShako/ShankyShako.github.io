/**
 * The roles, newest first.
 *
 * `blurb` is the prose form: it feeds the chat bot's prompt
 * (bot/build-context.mjs) and the timeline that mobile and reduced-motion
 * visitors get. `short`/`tagline`/`bullets` are the same facts cut for the
 * desktop deck, where a card is a card and 1,000 characters of paragraph does
 * not fit on one. Keeping both means the deck can be redesigned without
 * touching what the bot says.
 *
 * `org` is the identity key — anchors.ts, entities.ts and the six deep links in
 * bot/links.generated.json all derive from it. Renaming one breaks those.
 */
export type Logo = {
  src: string;
  alt: string;
};

export type Role = {
  org: string;
  title: string;
  date: string;
  blurb: string;
  /** Card-width label. The full `org` runs to 60+ characters. */
  short?: string;
  tagline?: string;
  bullets?: string[];
  /** Institution then programme. One is fine; the lockup centres either way. */
  logos?: Logo[];
};

export const experience: Role[] = [
  {
    org: 'Geometry Health and Wellness',
    title: 'Founding AI/ML Product Engineer',
    date: 'September 2025 – Present',
    blurb:
      'Founding engineer on a clinical mobility platform, from MVP to production. I ported clinically validated mobility assessments out of research prototypes and into a production iOS app, matching the clinical reference to within a fraction of a percent. I wrote the on-device biomarker signal-processing pipeline in Swift, along with the in-house data-collection app that produces the labeled datasets those models are validated against. I also built an end-to-end LLM workflow for a context-aware clinical assistant, covering data preparation, patient context retrieval, and lookup of peer-reviewed evidence, running on a self-hosted deployment that streams responses in under a second. I own the technical architecture, the sprint cycle, and coordination across clinical, engineering, and product. The methodology itself is proprietary, so the details stay off this page.',
    short: 'Geometry Health and Wellness',
    tagline: 'A clinical mobility platform, MVP to production.',
    bullets: [
      'Ported clinically validated mobility assessments to a production iOS app, matching the clinical reference to within a fraction of a percent.',
      'Built the on-device biomarker signal-processing pipeline in Swift, plus the data-collection app behind the labeled validation sets.',
      'Shipped a self-hosted clinical LLM assistant that streams in under a second, and I own the architecture and sprint cycle around it.',
    ],
    logos: [{ src: '/image/experience/geometry.png', alt: 'Geometry Health and Wellness' }],

  },
  {
    org: 'AFRL Sensors Directorate Internship Program, University of Dayton',
    title: 'Federal AI/ML Engineer Contractor',
    date: 'May 2025 – August 2025',
    blurb:
      "Built generative models that let a CNN classifier recognize real objects after training on nothing but generated data, carried over through transfer learning, against AFRL and DoD priorities. Adapted state-of-the-art PyTorch classifiers to imaging modalities they were never designed for, and ran large batches in parallel on Slurm. The core of the work was a game-theoretic approach to GAN training, which pushed the generator well past what standard training gave us. Output from that generator raised downstream classifier accuracy by 50 percentage points over the baseline.",
    short: 'AFRL Sensors Directorate',
    tagline: 'Teaching a classifier to recognize things it had only ever seen synthesized.',
    bullets: [
      'Built generative models that let a CNN recognize real objects after training on generated data alone, through transfer learning.',
      'Adapted state-of-the-art PyTorch classifiers to unfamiliar imaging modalities, parallelized across Slurm.',
      'Devised a game-theoretic approach to GAN training, worth 50 percentage points over baseline downstream.',
    ],
    logos: [
      { src: '/image/experience/afrl_word_mark.png', alt: 'Air Force Research Laboratory' },
      { src: '/image/experience/afrl.png', alt: 'Air Force Research Laboratory' },
    ],
  },
  {
    org: 'NSF REU AI-Empowered Cybersecurity, University of Missouri Kansas City',
    title: 'AI/ML Engineer Intern',
    date: 'June 2024 – December 2024',
    blurb:
      'Built a large language model that detects ransomware inside industrial control systems: 99% accuracy telling malicious from benign, 85% naming the specific family. The work was accepted at IEEE Big Data 2024, and I presented it in Washington, D.C. as the solo author, with mentor guidance.',
    short: 'NSF REU — AI-Empowered Cybersecurity',
    tagline: 'Catching ransomware inside industrial control systems.',
    bullets: [
      'Built an LLM that detects ransomware inside industrial control systems.',
      '99% accuracy on binary classification, 85% on family classification.',
      'Accepted and presented at IEEE Big Data 2024 in Washington, D.C. as solo author.',
    ],
    logos: [
      { src: '/image/experience/nsf.png', alt: 'National Science Foundation' },
      { src: '/image/experience/UMKC_logo.png', alt: 'University of Missouri Kansas City' },
    ],
  },
  {
    org: 'NSF REU in Consumer Networking, University of Missouri Columbia',
    title: 'Research Intern',
    date: 'May 2023 – July 2023',
    blurb:
      'Built a transformer model that predicts cybersickness severity on a 1 to 10 scale, at 85% accuracy. The lab\'s work carried into a co-authored 2025 paper in IEEE Transactions on Dependable and Secure Computing, on adversarial attacks against cybersickness detection models and an explainable-AI defense against them.',
    short: 'NSF REU — Consumer Networking',
    tagline: 'Predicting cybersickness before the user feels it.',
    bullets: [
      'Transformer model predicting cybersickness severity on a 1 to 10 scale, at 85% accuracy.',
      'Carried into a co-authored IEEE Transactions on Dependable and Secure Computing paper (2025).',
      'That paper covers adversarial attacks on cybersickness detection, and an explainable-AI defense.',
    ],
    logos: [
      { src: '/image/experience/nsf.png', alt: 'National Science Foundation' },
      { src: '/image/experience/mizzou.png', alt: 'University of Missouri Columbia' },
    ],
  },
  {
    org: 'NASA Missouri Space Grant Consortium',
    title: 'Research Intern',
    date: 'December 2021 – April 2022',
    blurb:
      'Simulated space-bound transmissions for a NASA-funded study of signal propagation, working out which frequency bands hold up under which conditions. Built an interactive interface that shows transmission strength and recommends a frequency for whatever environment you give it.',
    short: 'NASA Missouri Space Grant',
    tagline: 'Which frequencies survive the trip up.',
    bullets: [
      'Simulated space-bound transmissions for a NASA-funded study of signal propagation.',
      'Identified optimal frequency bands under varying environmental conditions.',
      'Built an interactive tool showing transmission strength, with frequency recommendations that adapt to conditions.',
    ],
    logos: [
      { src: '/image/experience/nasa.png', alt: 'NASA' },
      { src: '/image/experience/mosgc.png', alt: 'Missouri Space Grant Consortium' },
    ],
  },
  {
    org: 'SPCN - 2020 and IEEE Brain Initiative BDBC Conference, Taiwan',
    title: 'Web Master',
    date: 'August 2020 – September 2020',
    blurb:
      'Built and ran the website for the 5th International Symposium on Audio and Video Signal Processing in the Context of Neurotechnology, keeping content and announcements current while the conference ran remotely across several countries.',
    short: 'SPCN 2020 · IEEE Brain Initiative',
    tagline: 'The site the 5th neurotechnology symposium ran on.',
    bullets: [
      'Built and ran the site for the 5th International Symposium on Audio and Video Signal Processing in the Context of Neurotechnology.',
      'Kept updates and communication flowing while the conference ran remotely across multiple countries.',
    ],
    logos: [
      { src: '/image/experience/ieee-brain.png', alt: 'IEEE Brain Initiative' },
      { src: '/image/experience/spcn.png', alt: 'SPCN 2020' },
    ],
  },
];
