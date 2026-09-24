/**
 * The resume as a library of bullets, for the personalizer on /resume.
 *
 * The personalizer picks from here and never writes new facts: every bullet is
 * lifted from resume/resume.tex, the published PDF, or the other files in
 * src/data. A model may reword a bullet, but src/lib/resume/verify.ts rejects
 * any rewrite that drops a number or a listed skill, adds a tool, or claims
 * more ownership than the source. So a fact has to be in here to reach a page.
 *
 * bot/server.mjs imports this file too (Node strips the types), so the tailor
 * endpoint only ever rewrites bullets that exist here, looked up by id.
 *
 * Shape follows Resumator's library (meta, sections, entries, fragments). See
 * docs/RESUME-PERSONALIZER.md.
 */
import { site } from './site.ts';

export type Section = {
  id: string;
  title: string;
  /** Plain lines instead of entries (Technical Skills). */
  lines?: SkillLine[];
};

/** A skills row. `pool` items can be promoted into the row when they match. */
export type SkillLine = { label: string; items: string[]; pool?: string[] };

export type Entry = {
  id: string;
  section: string;
  /** Row 1: title (bold) … right. Row 2: sub (italic) … subRight (italic). */
  title?: string;
  right?: string;
  sub?: string;
  subRight?: string;
  /** Project row: "Title | tags", the tags in italic, on one line. */
  tags?: string;
  /** Printed whatever the query. */
  always?: boolean;
  /** When the entry is on the page, at least this many of its bullets are. */
  min?: number;
  max?: number;
  /** No heading rows: the bullets stand alone (Publications). */
  headingless?: boolean;
  bullets: string[];
};

export type Fragment = {
  id: string;
  text: string;
  /** Tools and methods named in the text. They feed matching and the pile of
      chips, and the verifier makes a rewrite keep the ones in the text. */
  skills: string[];
  /** Domain ids from DOMAINS below. */
  tags: string[];
  /** 1–5. Breaks ties and fills leftover room. */
  priority: number;
  /** A citation: printed as written, never sent for rewriting. */
  fixed?: boolean;
};

export const meta = {
  name: site.name,
  contact: {
    phone: site.phone,
    email: site.email,
    links: ['linkedin.com/in/GMongalo', 'gmango.dev'],
  },
  /* The QR code in the corner goes to GitHub Pages, the fallback that outlives
     a lapsed domain, while the contact line shows gmango.dev. Both serve the
     same site, so an ATS reading the text still gets a working link. */
  badgeUrl: 'https://ShankyShako.github.io',
};

export const sections: Section[] = [
  { id: 'education', title: 'Education' },
  { id: 'experience', title: 'Experience' },
  { id: 'publications', title: 'Publications & Presentations' },
  { id: 'projects', title: 'Projects' },
  {
    id: 'skills',
    title: 'Technical Skills',
    lines: [
      { label: 'Languages', items: ['Python', 'C / C++', 'Swift', 'SQL (Postgres)', 'Java / C#', 'JavaScript'],
        pool: ['TypeScript', 'Solidity', 'Racket'] },
      { label: 'Frameworks', items: ['PyTorch', 'scikit-learn', 'Flask', 'SwiftUI', 'Socket.IO', 'FastAPI'],
        pool: ['Hugging Face Transformers', 'React', 'Node.js', 'Express', 'Hardhat'] },
      { label: 'Developer Tools', items: ['Git', 'Xcode', 'AWS', 'Google Cloud Platform', 'VS Code', 'Anaconda'],
        pool: ['Docker', 'Slurm', 'Ollama', 'Weights & Biases', 'Cloudflare Workers'] },
      { label: 'Libraries', items: ['pandas', 'NumPy', 'Matplotlib'], pool: ['Gymnasium', 'Leaflet'] },
    ],
  },
];

export const entries: Entry[] = [
  {
    id: 'edu-umkc', section: 'education', always: true, bullets: [],
    title: 'University of Missouri-Kansas City (UMKC)', right: 'Kansas City, MO',
    sub: 'Bachelor of Science in Computer Science, summa cum laude', subRight: 'Aug. 2021 -- Dec. 2024',
  },
  {
    id: 'edu-gt', section: 'education', always: true, bullets: [],
    title: 'Georgia Tech', right: 'Atlanta, GA',
    sub: 'Masters in Computer Science - Emphasis on Artificial Intelligence', subRight: 'Expected 2027',
  },
  {
    id: 'exp-ghw', section: 'experience', always: true, min: 2,
    title: 'Founding AI/ML Product Engineer', right: 'September 2025 -- Present',
    sub: 'Geometry Health and Wellness', subRight: 'Kansas City, MO',
    bullets: ['ghw-port', 'ghw-dsp', 'ghw-speech', 'ghw-llm', 'ghw-collect', 'ghw-lead', 'ghw-stack'],
  },
  {
    id: 'exp-afrl', section: 'experience', always: true, min: 1,
    title: 'Federal AI/ML Research Engineer', right: 'May 2025 -- August 2025',
    sub: 'AFRL Sensors Directorate Contracting Program, University of Dayton', subRight: 'Dayton, OH',
    bullets: ['afrl-gen', 'afrl-gan', 'afrl-result', 'afrl-modal'],
  },
  {
    id: 'exp-reu-umkc', section: 'experience', always: true, min: 1,
    title: 'AI/ML Engineer Research Intern', right: 'June 2024 -- Dec. 2024',
    sub: 'NSF REU AI-Empowered Cybersecurity - University of Missouri, Kansas City', subRight: 'Kansas City, MO',
    bullets: ['reu-ics'],
  },
  {
    id: 'exp-reu-mu', section: 'experience',
    title: 'Research Intern', right: 'May 2023 -- July 2023',
    sub: 'NSF REU in Consumer Networking - University of Missouri, Columbia', subRight: 'Columbia, MO',
    bullets: ['mu-cyber', 'mu-paper'],
  },
  {
    id: 'exp-nasa', section: 'experience',
    title: 'Research Intern', right: 'Dec. 2021 -- April 2022',
    sub: 'NASA Missouri Space Grant Consortium',
    bullets: ['nasa-sim', 'nasa-ui'],
  },
  {
    id: 'exp-spcn', section: 'experience', max: 1,
    title: 'Web Master', right: 'Aug. 2020 -- Sep. 2020',
    sub: 'SPCN 2020 and IEEE Brain Initiative BDBC Conference, Taiwan',
    bullets: ['spcn-site'],
  },
  { id: 'pubs', section: 'publications', headingless: true, bullets: ['pres-bigdata', 'pub-tdsc'] },
  { id: 'prj-deepracer', section: 'projects', title: 'AWS DeepRacer', tags: 'Reinforcement Learning, AWS',
    bullets: ['deepracer-train', 'deepracer-reward'] },
  { id: 'prj-ransomware', section: 'projects', title: 'Ransomware Detection for Critical Infrastructure',
    tags: 'PyTorch, Transformers', bullets: ['ransom-study'] },
  { id: 'prj-dysarthria', section: 'projects', title: 'Dysarthria Speech Understanding',
    tags: 'PyTorch, Whisper, wav2vec2', bullets: ['dys-eval'] },
  { id: 'prj-lunar', section: 'projects', title: 'LunarLander Continuous Control',
    tags: 'PyTorch, TD3, Gymnasium', bullets: ['lunar-study'] },
  { id: 'prj-overcooked', section: 'projects', title: 'Overcooked Multi-Agent RL', tags: 'PPO, Python',
    bullets: ['overcooked-ppo'] },
  { id: 'prj-classical', section: 'projects', title: 'Classical AI Algorithm Suite', tags: 'Python',
    bullets: ['classical-suite'] },
  { id: 'prj-blockchain', section: 'projects', title: 'Federated Blockchain Model Registry',
    tags: 'Solidity, React, IPFS', bullets: ['chain-registry'] },
  { id: 'prj-carebeyond', section: 'projects', title: 'Care Beyond', tags: 'React, Leaflet, Node.js',
    bullets: ['care-map'] },
  { id: 'prj-raytracer', section: 'projects', title: 'Recursive Ray Tracer', tags: 'Java, Computer Graphics',
    bullets: ['ray-tracer'] },
  { id: 'prj-racket', section: 'projects', title: 'Racket Parser', tags: 'Racket', bullets: ['racket-parser'] },
  { id: 'prj-phonebook', section: 'projects', title: 'Phonebook Management System', tags: 'Java, SQL',
    bullets: ['phonebook'] },
];

/**
 * The page before anyone types: the published resume's bullets, in its order,
 * and nothing else. If they run a hair over one page, the page is set a hair
 * smaller rather than lose one (fit.ts).
 */
export const defaultBullets = [
  'ghw-port', 'ghw-dsp', 'ghw-speech', 'ghw-llm',
  'afrl-gen', 'afrl-modal', 'afrl-gan', 'afrl-result',
  'reu-ics', 'pres-bigdata', 'deepracer-train',
];

export const fragments: Fragment[] = [
  // Geometry Health and Wellness
  { id: 'ghw-port', priority: 5, tags: ['health', 'mobile', 'signal'], skills: ['MATLAB', 'iOS'],
    text: 'Ported clinically validated mobility assessments from MATLAB research prototypes to a production iOS app, matching the clinical reference within 0.56% on a 15-biomarker postural-sway test and reproducing 10-meter-walk gait speed exactly.' },
  { id: 'ghw-dsp', priority: 5, tags: ['health', 'mobile', 'signal'], skills: ['Swift', 'CoreMotion', 'Butterworth filtering', 'PCA'],
    text: 'Built the on-device biomarker signal-processing pipeline in Swift: 100 Hz CoreMotion capture, gravity removal, zero-phase Butterworth band-pass filtering, double integration, and PCA into 15 biomarkers with automated quality flags.' },
  { id: 'ghw-speech', priority: 4, tags: ['ml', 'health', 'speech', 'llm', 'mobile'], skills: ['Apple Speech', 'Whisper', 'LLM'],
    text: 'Built a speech assessment pipeline pairing on-device Apple Speech for live partials with a Whisper backend and LLM transcript normalization, with a patient-review panel, to catch the communication deficits that affect one in three stroke survivors.' },
  { id: 'ghw-llm', priority: 5, tags: ['ml', 'health', 'llm', 'web'], skills: ['LLM', 'PubMed', 'Entrez', 'Ollama', 'DeepSeek-V2', 'Flask', 'REST', 'WebSocket'],
    text: 'Implemented an end-to-end LLM workflow for a context-aware clinical assistant (data prep, patient-context retrieval, PubMed/NCBI evidence via Entrez), deployed on a self-hosted Ollama DeepSeek-V2 16B model with Flask REST + WebSocket streaming under 1s latency.' },
  { id: 'ghw-collect', priority: 3, tags: ['health', 'mobile', 'data'], skills: ['iOS', 'JSON'],
    text: 'Built the in-house iOS data-collection app for motion, survey, and fall/emergency data; each trial exports as timestamped JSON into the labeled datasets the models are validated against.' },
  { id: 'ghw-lead', priority: 4, tags: ['lead', 'health'], skills: [],
    text: 'Led the product from MVP to production as founding engineer, owning the architecture and sprint cycles and keeping the clinical, engineering, and product sides in step.' },
  { id: 'ghw-stack', priority: 2, tags: ['health', 'mobile', 'web'], skills: ['Swift', 'SwiftUI', 'Python', 'Flask', 'SQLite'],
    text: 'Architected the full-stack platform (Swift/SwiftUI on iOS 17, Python/Flask, SQLite) with real-time AI guidance, biomarker tracking, and a dashboard for messaging clinicians.' },

  // AFRL
  { id: 'afrl-gen', priority: 5, tags: ['ml', 'genai', 'vision', 'defense', 'research'], skills: ['Generative AI', 'CNN', 'Transfer learning'],
    text: 'Led development of generative AI models that let a CNN classifier recognize real objects after training only on generated data, carried over by transfer learning, for AFRL/DoD priorities.' },
  { id: 'afrl-gan', priority: 4, tags: ['ml', 'genai', 'research', 'infra', 'defense'], skills: ['GAN', 'Game theory', 'Slurm'],
    text: 'Created a game theory approach to GAN training that made the generator far stronger than standard training did, run at scale on Slurm-parallelized compute.' },
  { id: 'afrl-result', priority: 5, tags: ['ml', 'genai', 'vision', 'research', 'defense'], skills: [],
    text: 'Training on the generator’s output raised downstream classifier accuracy by 50 percentage points over the baseline.' },
  { id: 'afrl-modal', priority: 3, tags: ['ml', 'vision', 'research', 'defense'], skills: ['PyTorch'],
    text: 'Adapted state-of-the-art PyTorch classifiers to imaging modalities they were not designed for.' },

  // NSF REU, UMKC
  { id: 'reu-ics', priority: 5, tags: ['ml', 'security', 'llm', 'research'], skills: ['LLM', 'IEEE Big Data'],
    text: 'Engineered an LLM that detects ransomware in Industrial Control Systems at 99% binary and 91% family classification accuracy; presented it at IEEE Big Data 2024 as solo author, with mentor guidance.' },

  // NSF REU, Mizzou
  { id: 'mu-cyber', priority: 3, tags: ['ml', 'research', 'xr'], skills: ['Transformer'],
    text: 'Designed a transformer model that predicts cybersickness severity on a 1-10 scale with 85% accuracy.' },
  { id: 'mu-paper', priority: 3, tags: ['research', 'security', 'xr'], skills: ['Adversarial ML', 'Explainable AI'],
    text: 'The lab’s work carried into a co-authored 2025 IEEE Transactions on Dependable and Secure Computing paper on adversarial attacks against cybersickness detection and an explainable-AI defense.' },

  // NASA
  { id: 'nasa-sim', priority: 2, tags: ['ml', 'research', 'signal'], skills: ['Simulation'],
    text: 'Engineered an AI-driven simulation of space-bound transmissions for a NASA-funded study of signal propagation, finding which frequency bands hold up under which conditions.' },
  { id: 'nasa-ui', priority: 2, tags: ['signal', 'web'], skills: [],
    text: 'Developed an interactive interface that shows transmission strength and recommends a frequency for the environment you give it.' },

  // SPCN
  { id: 'spcn-site', priority: 1, tags: ['web'], skills: [],
    text: 'Built and ran the website for the 5th International Symposium on Audio and Video Signal Processing in the Context of Neurotechnology while the conference ran remotely across multiple countries.' },

  // Publications and presentations
  { id: 'pres-bigdata', priority: 4, fixed: true, tags: ['security', 'llm', 'research'], skills: ['IEEE Big Data'],
    text: 'Mongalo, G. (Dec. 2024). LLM Based Approach to Real Time Ransomware Detection for Industrial Control Systems. Presented at IEEE Big Data 2024, Washington, D.C. (Presenter & Author, solo work with mentor guidance).' },
  { id: 'pub-tdsc', priority: 3, fixed: true, tags: ['research', 'security', 'xr'], skills: ['Explainable AI'],
    text: 'Kundu, R. K., Denton, M., Mongalo, G., Calyam, P., Hoque, K. A. (2025). Securing Virtual Reality Experiences: Unveiling and Tackling Cybersickness Attacks With Explainable AI. IEEE Transactions on Dependable and Secure Computing, 22(6).' },

  // Projects
  { id: 'deepracer-train', priority: 4, tags: ['ml', 'rl', 'infra'], skills: ['Reinforcement learning', 'AWS'],
    text: 'Trained and tuned reinforcement-learning policies for a 1/18-scale autonomous vehicle on AWS, iterating on reward functions and scoring the laps each policy ran.' },
  { id: 'deepracer-reward', priority: 3, tags: ['ml', 'rl'], skills: ['TD3', 'Reward shaping'],
    text: 'Designed the reward-shaping scheme for a TD3 policy: center-line distance bands, heading alignment with upcoming waypoints, a speed-versus-steering trade-off, and penalties for leaving the track or crashing.' },
  { id: 'ransom-study', priority: 3, tags: ['ml', 'security', 'research', 'llm'], skills: ['PyTorch', 'scikit-learn', 'CNN', 'RoBERTa', 'ALBERT'],
    text: 'Compared a DNN, a 1-D CNN, and RoBERTa- and ALBERT-style transformers for ransomware detection from Windows API-call features, cutting ~31,000 features to 1,000 by chi-squared selection; about 98% binary accuracy in PyTorch and scikit-learn.' },
  { id: 'dys-eval', priority: 3, tags: ['ml', 'speech', 'health', 'research'], skills: ['Whisper', 'wav2vec2', 'Multi-task learning'],
    text: 'Built the ASR evaluation harness and Whisper multi-task grid for dysarthric speech, run leave-one-speaker-out across 43 speakers: 10.44 MAE on intelligibility and 0.809 quadratic weighted kappa on severity.' },
  { id: 'lunar-study', priority: 2, tags: ['ml', 'rl'], skills: ['PyTorch', 'TD3', 'Gymnasium', 'Weights & Biases'],
    text: 'Trained and compared five reinforcement-learning algorithms on LunarLanderContinuous in PyTorch, with a hyperparameter sweep, a TD3 actor-critic architecture experiment, and Weights & Biases run tracking.' },
  { id: 'overcooked-ppo', priority: 2, tags: ['ml', 'rl'], skills: ['PPO', 'Multi-agent RL'],
    text: 'Trained cooperative PPO agents on the Overcooked-AI benchmark by self-play, evaluating each layout and how well a policy holds up with a partner it never trained against.' },
  { id: 'classical-suite', priority: 2, tags: ['ml', 'research'], skills: ['A* search', 'Bayesian networks', 'HMM', 'Expectation maximization'],
    text: 'Implemented classical AI from first principles: bidirectional and tridirectional A* over the Atlanta road network, alpha-beta search, Bayesian networks with Gibbs sampling, EM image segmentation, and HMM sign recognition.' },
  { id: 'chain-registry', priority: 2, tags: ['blockchain', 'web'], skills: ['Solidity', 'Hardhat', 'IPFS', 'React', 'MetaMask'],
    text: 'Built a federated-learning model registry on Ethereum: Solidity contracts deployed with Hardhat record each model’s IPFS content ID, with a React frontend wired to MetaMask and an automated Hardhat test suite.' },
  { id: 'care-map', priority: 2, tags: ['web'], skills: ['React', 'Leaflet', 'Node.js', 'Express'],
    text: 'Built a live map of food, shelter, clothing, and medical resources searchable by address or ZIP, with radius results, color-coded markers, and posting limited to verified organizations.' },
  { id: 'ray-tracer', priority: 1, tags: ['graphics'], skills: ['Java'],
    text: 'Built a recursive ray tracer in Java: ray-sphere, ray-triangle, and box intersection, Phong shading with shadow rays, recursive reflection, instancing, and a bounding-volume hierarchy.' },
  { id: 'racket-parser', priority: 1, tags: ['compilers'], skills: ['Racket'],
    text: 'Wrote a Racket parser for a small FORTRAN-like language that checks source files against a defined grammar and reports the exact line of an invalid construct.' },
  { id: 'phonebook', priority: 1, tags: ['web', 'data'], skills: ['Java', 'SQL'],
    text: 'Built a Java phonebook application with a SQL backend: hashed-password registration, contact CRUD, search, and CSV export.' },
];

/**
 * What a query can mean. A short query ("health startup") names a domain, not
 * a tool, so each domain lists the words that point at it. A fragment's `tags`
 * say which domains it is evidence for.
 */
export const DOMAINS: Record<string, string[]> = {
  ml: ['ml', 'machine learning', 'deep learning', 'ai', 'ai/ml', 'neural', 'model training', 'data science', 'applied scientist'],
  health: ['health', 'healthcare', 'clinical', 'medical', 'medicine', 'patient', 'biomarker', 'hospital', 'wellness', 'stroke', 'biotech', 'digital health'],
  mobile: ['mobile', 'ios', 'iphone', 'apple', 'swift', 'swiftui', 'app', 'on-device', 'edge', 'wearable'],
  signal: ['signal', 'dsp', 'sensor', 'sensors', 'imu', 'motion', 'filtering', 'time series', 'time-series'],
  llm: ['llm', 'llms', 'language model', 'gpt', 'rag', 'retrieval', 'chatbot', 'assistant', 'nlp', 'genai', 'agent', 'agents', 'prompt'],
  genai: ['generative', 'genai', 'gan', 'gans', 'diffusion', 'synthetic', 'image generation'],
  vision: ['vision', 'computer vision', 'image', 'imaging', 'cnn', 'perception', 'detection', 'classification'],
  rl: ['reinforcement', 'rl', 'policy', 'reward', 'robotics', 'autonomous', 'control', 'agents', 'simulation'],
  speech: ['speech', 'audio', 'asr', 'voice', 'transcription'],
  security: ['security', 'cybersecurity', 'cyber', 'ransomware', 'malware', 'threat', 'adversarial', 'infrastructure'],
  defense: ['defense', 'defence', 'dod', 'federal', 'government', 'military', 'clearance', 'air force', 'national lab'],
  research: ['research', 'researcher', 'scientist', 'phd', 'paper', 'publication', 'publications', 'lab', 'academic'],
  infra: ['cloud', 'aws', 'gcp', 'hpc', 'cluster', 'distributed', 'parallel', 'mlops', 'infrastructure', 'deploy', 'deployment'],
  web: ['web', 'frontend', 'front-end', 'backend', 'back-end', 'full-stack', 'fullstack', 'full stack', 'react', 'api', 'node'],
  data: ['data', 'dataset', 'datasets', 'analytics', 'pipeline', 'etl', 'labeling'],
  lead: ['lead', 'founding', 'founder', 'startup', 'ownership', 'product', 'manager', 'cross-functional', 'senior', 'staff'],
  blockchain: ['blockchain', 'web3', 'ethereum', 'solidity', 'crypto', 'smart contract'],
  xr: ['vr', 'ar', 'xr', 'virtual reality', 'augmented reality', 'headset'],
  graphics: ['graphics', 'rendering', 'ray tracing', 'game', 'games', '3d'],
  compilers: ['compiler', 'compilers', 'parser', 'parsing', 'language design'],
};
