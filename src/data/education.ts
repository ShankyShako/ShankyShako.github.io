export type Degree = {
  school: string;
  degree: string;
  date: string;
  /** Honours, GPA, or what the credits did next. One line, or none. */
  note?: string;
};
export type Course = { name: string; points: string[] };
/** Undergrad ran to twenty-odd courses, counting credit transferred in, so
    these are grouped by area rather than given two invented sub-points each.
    Intro-level programming is left off: it says nothing next to the courses
    that follow it. */
export type CourseGroup = { area: string; courses: string[] };

export const degrees: Degree[] = [
  {
    school: 'Georgia Tech — Atlanta, GA',
    degree: "Master's in Computer Science — Emphasis on Artificial Intelligence",
    date: 'August 2025 – expected 2027',
  },
  {
    school: 'University of Missouri-Kansas City (UMKC) — Kansas City, MO',
    degree: 'Bachelor of Science in Computer Science, summa cum laude',
    date: 'August 2021 – December 2024',
    note: "3.82 cumulative GPA. Dean's List in four semesters.",
  },
];

/** Taken right now. `term` is stated rather than implied: a dated label that
    goes stale is honest, an undated "currently" that goes stale is not. */
export const inProgressTerm = 'Fall 2026';
export const inProgress: Course[] = [
  { name: 'Computer Graphics', points: [
    'Rasterization, transforms, shading, and the rendering pipeline end to end',
    'The formal version of what the recursive ray tracer works out by hand' ] },
  { name: 'Machine Learning for Trading', points: [
    'Supervised and reinforcement learning applied to market data',
    'Backtesting, and the ways a strategy can look good only in hindsight' ] },
  { name: 'Bayesian Statistics', points: [
    'Priors, posterior inference, and hierarchical models',
    'MCMC sampling, and reporting uncertainty instead of a single number' ] },
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
    'The techniques modern ML systems are built on top of' ] },
  { name: 'Computer Vision', points: [
    'Image formation, feature detection, and recognition pipelines',
    'The perception techniques underpinning the classifier work at AFRL' ] },
  { name: 'Brain & Cognitive Science', points: [
    'Computational models of perception, memory, and learning',
    'Neuroscience principles that inspire AI architectures' ] },
];

export const undergraduateCoursework: CourseGroup[] = [
  { area: 'Theory and systems', courses: [
    'Discrete Structures I & II', 'Data Structures', 'Algorithms & Complexity',
    'Computer Architecture & Organization', 'Operating Systems',
    'Programming Languages: Design & Implementation'] },
  { area: 'Software engineering', courses: [
    'Foundations of Software Engineering', 'Software Engineering Capstone',
    'Database Management Systems', 'Java Programming Applications',
    'Web Development', 'Game Quality Assurance', 'Ethics & Professionalism'] },
  { area: 'Security and networks', courses: [
    'Introduction to Cybersecurity', 'Network Security',
    'Data Communications & Networking', 'Blockchain'] },
  { area: 'AI and mathematics', courses: [
    'Artificial Intelligence', 'Applied Probability', 'Elementary Statistics',
    'Calculus I & II', 'Linear Algebra', 'Physics for Scientists and Engineers'] },
  { area: 'Game development', courses: [
    'Game Design', 'Game World Creation', 'Game Level Editing'] },
];
