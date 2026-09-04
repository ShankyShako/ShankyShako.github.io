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
      'Founding engineer on a clinical mobility platform, taken from MVP to production. Ported clinically validated mobility assessments from research prototypes to a production iOS app, matching the clinical reference to within a fraction of a percent. Built the on-device biomarker signal-processing pipeline in Swift, alongside the in-house data-collection app that produces the labelled datasets the models are validated against. Implemented an end-to-end LLM workflow for a context-aware clinical assistant — data preparation, patient context retrieval, and peer-reviewed evidence lookup — on a self-hosted deployment with streaming responses under one second of latency. Owns the technical architecture, sprint cycles, and coordination across clinical, engineering, and product. Specifics of the methodology are withheld as proprietary.',
    short: 'Geometry Health and Wellness',
    tagline: 'A clinical mobility platform, MVP to production.',
    bullets: [
      'Ported clinically validated mobility assessments to a production iOS app, matching the clinical reference to within a fraction of a percent.',
      'Built the on-device biomarker signal-processing pipeline in Swift, plus the data-collection app behind the labelled validation sets.',
      'Shipped a self-hosted clinical LLM assistant streaming under a second, and owns the architecture and sprint cycle around it.',
    ],
    logos: [{ src: '/image/experience/geometry.png', alt: 'Geometry Health and Wellness' }],

  },
  {
    org: 'AFRL Sensors Directorate Internship Program, University of Dayton',
    title: 'Federal AI/ML Engineer Contractor',
    date: 'May 2025 – August 2025',
    blurb:
      "Pioneered the development of generative AI models enabling a CNN classifier to successfully recognize real objects when trained on generated data when utilized in transfer learning framework, addressing AFRL/DoD priorities. Using PyTorch, adapted state of the art classifiers to handle novel imaging modalities. Utilized Slurm to enable large batches of parallelized computation. Created an innovative game theory approach to GAN training, significantly improving the results of the generator's development. The generative model's output led to an increase of 50 percentage points in the downstream classifier compared to the baseline.",
    short: 'AFRL Sensors Directorate',
    tagline: 'Teaching a classifier to recognise things it had only seen synthesised.',
    bullets: [
      'Built generative models that let a CNN recognise real objects after training on generated data alone, through transfer learning.',
      'Adapted state-of-the-art PyTorch classifiers to novel imaging modalities, parallelised across Slurm.',
      'Devised a game-theoretic approach to GAN training — 50 percentage points over baseline downstream.',
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
      'Engineered a robust Large Language Model to detect ransomware threats within Industrial Control Systems. Achieved 99% accuracy for binary classification and 85% accuracy for family classification scale respectively. Research was accepted and presented at IEEE Big Data 2024 in Washington, D.C. as the solo author with mentor guidance.',
    short: 'NSF REU — AI-Empowered Cybersecurity',
    tagline: 'Catching ransomware inside industrial control systems.',
    bullets: [
      'Engineered an LLM to detect ransomware threats in industrial control systems.',
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
      'Designed a model that detects/predicts cybersickness using a transformer machine learning model. Succeeded with an accuracy of 85% from a 1-10 cybersickness severity scale. Work from this lab carried into a co-authored paper in IEEE Transactions on Dependable and Secure Computing (2025) on adversarial attacks against cybersickness detection models, and an explainable-AI defence against them.',
    short: 'NSF REU — Consumer Networking',
    tagline: 'Predicting cybersickness before the user feels it.',
    bullets: [
      'Transformer model predicting cybersickness severity on a 1–10 scale, at 85% accuracy.',
      'Carried into a co-authored IEEE Transactions on Dependable and Secure Computing paper (2025).',
      'That paper covers adversarial attacks on cybersickness detection, and an explainable-AI defence.',
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
      'Engineered an AI-driven simulation of space-bound transmissions as part of a NASA-funded initiative analyzing signal propagation and identifying optimal frequency bands under varying conditions. Developed an interactive interface to visualize transmission strength and provide adaptive frequency recommendations based on environmental parameters.',
    short: 'NASA Missouri Space Grant',
    tagline: 'Which frequencies survive the trip up.',
    bullets: [
      'Simulated space-bound transmissions for a NASA-funded study of signal propagation.',
      'Identified optimal frequency bands under varying environmental conditions.',
      'Built an interactive tool visualising transmission strength with adaptive frequency recommendations.',
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
      "Set up conference website for the 5th International Symposium on Audio and Video Signal Processing in the Context of Neurotechnology, with reliable communication and updates to the website's needs. The conference was conducted remotely through multiple worldwide locations.",
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
