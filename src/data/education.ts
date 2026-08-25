export type Degree = { school: string; degree: string; date: string };
export type Course = { name: string; points: string[] };

export const degrees: Degree[] = [
  {
    school: 'University of Missouri-Kansas City (UMKC) — Kansas City, MO',
    degree: 'Bachelor of Science in Computer Science, summa cum laude',
    date: 'August 2021 – December 2024',
  },
  {
    school: 'Georgia Tech — Atlanta, GA',
    degree: "Master's in Computer Science — Emphasis on Artificial Intelligence",
    date: 'August 2025 – expected 2027',
  },
];

export const graduateCoursework: Course[] = [
  { name: 'Deep Learning', points: [
    'Neural network architectures: CNNs, RNNs, and transformers',
    'Training, optimization, and regularization of deep models at scale' ] },
  { name: 'Reinforcement Learning', points: [
    'Markov decision processes, value-based and policy-gradient methods',
    'Reward design and sequential decision-making for autonomous agents' ] },
  { name: 'Machine Learning', points: [
    'Supervised and unsupervised learning algorithms and applications',
    'Model training, evaluation, and generalization' ] },
  { name: 'Artificial Intelligence', points: [
    'Search, knowledge representation, planning, and reasoning',
    'Foundational AI techniques underpinning modern ML systems' ] },
  { name: 'Computer Vision', points: [
    'Image formation, feature detection, and recognition pipelines',
    'The perception techniques underpinning the classifier work at AFRL' ] },
  { name: 'Brain & Cognitive Science', points: [
    'Computational models of perception, memory, and learning',
    'Neuroscience principles that inspire AI architectures' ] },
];

export const coreFoundations: Course[] = [
  { name: 'Algorithms & Complexity', points: ['Algorithm design and analysis of computational complexity'] },
  { name: 'Data Structures', points: ['Efficient organization, storage, and access of data'] },
];
