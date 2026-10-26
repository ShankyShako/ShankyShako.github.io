/**
 * The resume as a library of bullets, for the personalizer on /resume.
 *
 * The personalizer picks from here and never writes new facts: every bullet is
 * lifted from resume/resume.tex, the published PDF, the other files in
 * src/data, or the published /LegacyScribe page (its measured numbers). A model may reword a bullet, but src/lib/resume/verify.ts rejects
 * any rewrite that drops a number or a listed skill, adds a tool, or claims
 * more ownership than the source. So a fact has to be in here to reach a page.
 *
 * bot/server.mjs imports this file too (Node strips the types), so the tailor
 * endpoint only ever rewrites bullets that exist here, looked up by id.
 *
 * Shape: meta, sections, entries, fragments. See
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
  { id: 'projects', title: 'Projects' },
  { id: 'publications', title: 'Publications' },
  {
    id: 'skills',
    title: 'Technical Skills',
    lines: [
      { label: 'Languages', items: ['Python', 'Swift', 'C / C++', 'SQL (Postgres)', 'JavaScript', 'Java / C#'],
        pool: ['TypeScript', 'Solidity'] },
      { label: 'Machine Learning', items: ['PyTorch', 'scikit-learn', 'Hugging Face Transformers', 'Whisper', 'pandas', 'NumPy'],
        pool: ['Ollama', 'Gymnasium', 'Weights & Biases', 'Matplotlib'] },
      { label: 'Frameworks', items: ['SwiftUI', 'Flask', 'FastAPI', 'Socket.IO', 'React', 'Node.js'],
        pool: ['Express', 'Hardhat', 'Leaflet'] },
      { label: 'Developer Tools', items: ['Git', 'Docker', 'Slurm', 'AWS', 'Google Cloud Platform', 'Xcode'],
        pool: ['Cloudflare Workers', 'Anaconda', 'VS Code'] },
    ],
  },
];

export const entries: Entry[] = [
  {
    id: 'edu-gt', section: 'education', always: true, bullets: [],
    title: 'Georgia Institute of Technology', right: 'Atlanta, GA',
    sub: 'Master of Science in Computer Science, emphasis in Artificial Intelligence', subRight: 'Expected 2027',
  },
  {
    id: 'edu-umkc', section: 'education', always: true, bullets: [],
    title: 'University of Missouri-Kansas City (UMKC)', right: 'Kansas City, MO',
    sub: 'Bachelor of Science in Computer Science, summa cum laude', subRight: 'Aug. 2021 -- Dec. 2024',
  },
  {
    id: 'exp-ghw', section: 'experience', always: true, min: 2,
    title: 'Founding AI/ML Product Engineer', right: 'September 2025 -- Present',
    sub: 'Geometry Health and Wellness', subRight: 'Kansas City, MO',
    bullets: ['ghw-port', 'ghw-dsp', 'ghw-speech', 'ghw-llm', 'ghw-collect', 'ghw-lead', 'ghw-stack'],
  },
  {
    id: 'exp-afrl', section: 'experience', always: true, min: 1,
    /* Stated as a contracting role, as on the Experience page; cleared with the
       AFRL supervisor. Results stay at the level of "+50 points" (CUI). */
    title: 'Federal AI/ML Engineer Contractor', right: 'May 2025 -- August 2025',
    sub: 'AFRL Sensors Directorate Contracting Program, University of Dayton', subRight: 'Dayton, OH',
    bullets: ['afrl-gen', 'afrl-gan', 'afrl-modal'],
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
  { id: 'pubs', section: 'publications', headingless: true, bullets: ['pub-bigdata', 'pub-tdsc'] },
  { id: 'prj-legacyscribe', section: 'projects', title: 'LegacyScribe', tags: 'Swift, SwiftUI, MLX, Speech Recognition, LLMs',
    bullets: ['scribe-asr', 'scribe-llm', 'scribe-ondevice', 'scribe-private', 'scribe-practice'] },
  /* This site: the tailoring you are using and the chat assistant. */
  { id: 'prj-site', section: 'projects', title: 'gmango.dev', tags: 'React, TypeScript, LLMs',
    bullets: ['site-tailor', 'site-chat'] },
  { id: 'prj-deepracer', section: 'projects', title: 'AWS DeepRacer', tags: 'Reinforcement Learning, TD3, Docker',
    bullets: ['deepracer-reward', 'deepracer-train'] },
  { id: 'prj-ransomware', section: 'projects', title: 'Ransomware Detection for Critical Infrastructure',
    tags: 'PyTorch, Transformers', bullets: ['ransom-study'] },
  { id: 'prj-dysarthria', section: 'projects', title: 'Dysarthria Speech Understanding',
    tags: 'PyTorch, Whisper, wav2vec2', bullets: ['dys-eval', 'dys-findings'] },
  { id: 'prj-cogload', section: 'projects', title: 'Cognitive-Load-Aware Conversational Design',
    tags: 'HCI, Cognitive Science', bullets: ['cogload-analysis'] },
  { id: 'prj-lunar', section: 'projects', title: 'LunarLander Continuous Control',
    tags: 'PyTorch, TD3, Gymnasium', bullets: ['lunar-study'] },
  { id: 'prj-overcooked', section: 'projects', title: 'Overcooked Multi-Agent RL', tags: 'PPO, Python',
    bullets: ['overcooked-ppo'] },
  { id: 'prj-classical', section: 'projects', title: 'Classical AI Algorithm Suite', tags: 'Python',
    bullets: ['classical-suite'] },
  { id: 'prj-blockchain', section: 'projects', title: 'Federated Blockchain Model Registry',
    tags: 'Solidity, React, IPFS', bullets: ['chain-registry'] },
  { id: 'prj-carebeyond', section: 'projects', title: 'Care Beyond (checkpointkc.com)', tags: 'React, Leaflet, Node.js, Express',
    bullets: ['care-map'] },
  { id: 'prj-unbound', section: 'projects', title: 'Unbound Family Portal', tags: 'ASP.NET Razor, C#, Azure',
    bullets: ['unbound-portal'] },
  { id: 'prj-raytracer', section: 'projects', title: 'Recursive Ray Tracer', tags: 'Java, Computer Graphics',
    bullets: ['ray-tracer'] },
];

/**
 * The page before anyone types: the published resume's bullets, in its order,
 * and nothing else. If they run a hair over one page, the page is set a hair
 * smaller rather than lose one (fit.ts).
 */
export const defaultBullets = [
  'ghw-port', 'ghw-dsp', 'ghw-llm', 'ghw-lead',
  'afrl-gen', 'afrl-gan',
  'reu-ics',
  'scribe-asr', 'care-map', 'dys-eval',
  'pub-bigdata', 'pub-tdsc',
];

export const fragments: Fragment[] = [
  // Geometry Health and Wellness
  { id: 'ghw-port', priority: 5, tags: ['health', 'mobile', 'signal'], skills: ['MATLAB', 'iOS'],
    text: 'Ported clinically validated mobility assessments from MATLAB prototypes to a production iOS app, within 0.56% of the clinical reference on a 15-biomarker postural-sway test and exact on 10-meter-walk gait speed.' },
  { id: 'ghw-dsp', priority: 5, tags: ['health', 'mobile', 'signal'], skills: ['Swift', 'CoreMotion', 'Butterworth filtering', 'PCA'],
    text: 'Built the on-device biomarker pipeline in Swift: 100 Hz CoreMotion capture, gravity removal, zero-phase Butterworth band-pass filtering, double integration, and PCA into 15 biomarkers with quality flags.' },
  { id: 'ghw-speech', priority: 4, tags: ['ml', 'health', 'speech', 'llm', 'mobile'], skills: ['Apple Speech', 'Whisper', 'LLM'],
    text: 'Built a speech assessment pipeline pairing on-device Apple Speech for live partials with a Whisper backend and LLM transcript normalization, with a patient-review panel, to catch the communication deficits that affect one in three stroke survivors.' },
  { id: 'ghw-llm', priority: 5, tags: ['ml', 'health', 'llm', 'web'], skills: ['LLM', 'PubMed', 'Entrez', 'Ollama', 'DeepSeek-V2', 'Flask', 'REST', 'WebSocket'],
    text: 'Built an end-to-end clinical LLM assistant with patient-context retrieval and PubMed evidence via Entrez, self-hosted on Ollama (DeepSeek-V2 16B) and streaming over Flask REST + WebSocket in under 1 s.' },
  { id: 'ghw-collect', priority: 3, tags: ['health', 'mobile', 'data'], skills: ['iOS', 'JSON'],
    text: 'Built the in-house iOS data-collection app for motion, survey, and fall/emergency data; each trial exports as timestamped JSON into the labeled datasets the models are validated against.' },
  { id: 'ghw-lead', priority: 4, tags: ['lead', 'health'], skills: [],
    text: 'Led the product from MVP to production as founding engineer, owning the architecture and sprint cycles and keeping the clinical, engineering, and product sides in step.' },
  { id: 'ghw-stack', priority: 2, tags: ['health', 'mobile', 'web'], skills: ['Swift', 'SwiftUI', 'Python', 'Flask', 'SQLite'],
    text: 'Architected the full-stack platform (Swift/SwiftUI on iOS 17, Python/Flask, SQLite) with real-time AI guidance, biomarker tracking, and a dashboard for messaging clinicians.' },

  // AFRL
  { id: 'afrl-gen', priority: 5, tags: ['ml', 'genai', 'vision', 'defense', 'research'], skills: ['Generative AI', 'CNN', 'Transfer learning'],
    text: 'Built generative AI models that let a CNN classifier recognize real objects after training only on generated data, carried over by transfer learning, for AFRL/DoD.' },
  { id: 'afrl-gan', priority: 4, tags: ['ml', 'genai', 'research', 'infra', 'defense'], skills: ['GAN', 'Game theory', 'Slurm'],
    text: 'Devised a game-theoretic GAN training scheme, run on Slurm-parallelized compute; training on its output raised downstream classifier accuracy 50 percentage points over the baseline.' },
  { id: 'afrl-modal', priority: 3, tags: ['ml', 'vision', 'research', 'defense'], skills: ['PyTorch'],
    text: 'Adapted state-of-the-art PyTorch classifiers to imaging modalities they were not designed for.' },

  // NSF REU, UMKC
  { id: 'reu-ics', priority: 5, tags: ['ml', 'security', 'llm', 'research'], skills: ['Transformer', 'IEEE Big Data'],
    text: 'Built a transformer-based model that detects ransomware in Industrial Control Systems at 99% binary and 91% family classification accuracy; presented it at IEEE Big Data 2024 as solo author, now accepted for publication.' },

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
  { id: 'pub-bigdata', priority: 5, fixed: true, tags: ['ml', 'security', 'research'], skills: ['Explainable AI', 'IEEE Big Data'],
    text: 'Mongalo, G. (2026). An Explainable Machine Learning Approach and Provenance Registry for Real-Time Ransomware Detection in ICS. IEEE Big Data 2026, accepted, to appear Dec. 2026 (sole author).' },
  { id: 'pub-tdsc', priority: 4, fixed: true, tags: ['research', 'security', 'xr'], skills: ['Explainable AI'],
    text: 'Kundu, R. K., Denton, M., Mongalo, G., et al. (2025). Securing Virtual Reality Experiences: Unveiling and Tackling Cybersickness Attacks With Explainable AI. IEEE Trans. Dependable Secure Comput., 22(6).' },

  // Projects
  { id: 'scribe-asr', priority: 5, tags: ['ml', 'speech', 'mobile'], skills: ['Swift', 'SwiftUI', 'MLX', 'Speech recognition'],
    text: 'Built an on-device macOS dictation app I use daily (a SwiftUI fork of Hex) with swappable speech engines: 5.3% word error rate on Cohere Transcribe/MLX vs 8.8% on Parakeet, 10 s of audio in about 0.33 s.' },
  { id: 'scribe-llm', priority: 4, tags: ['llm', 'speech'], skills: ['LLM'],
    text: 'Added an LLM pass that cleans up a transcript or reshapes a spoken ramble into a structured prompt for a coding agent, and pastes the raw transcript if every model endpoint fails.' },
  { id: 'scribe-ondevice', priority: 3, tags: ['llm', 'mobile', 'speech'], skills: ['Qwen3', 'On-device inference'],
    text: 'Runs transcript rewriting on-device with Qwen3 4B (4-bit) in 0.4–1.5 s for dictations of up to 55 words; the live caption shows its first word a median 0.74 s after speech starts.' },
  { id: 'scribe-private', priority: 3, tags: ['security', 'mobile', 'speech'], skills: [],
    text: 'Built a private mode that opens zero network connections, verified by a test that samples the app’s sockets every 10 ms during a real dictation.' },
  { id: 'scribe-practice', priority: 2, tags: ['speech', 'mobile'], skills: [],
    text: 'Added a read-aloud practice mode built from 280 sentences covering all 39 English sounds and 881 sound pairs, plus vocabulary suggestions drawn from what the user actually sent after editing.' },
  { id: 'site-tailor', priority: 3, tags: ['llm', 'web', 'ml'], skills: ['React', 'TypeScript', 'LLM'],
    text: 'Built gmango.dev’s résumé tailoring: in-browser matching re-ranks a bullet library on every keystroke, a typesetter keeps the page to one sheet, a language model rewords, and a rule-based checker rejects any rewrite that drops a number, adds a tool, or claims more.' },
  { id: 'site-chat', priority: 2, tags: ['llm', 'web'], skills: ['LLM', 'Node.js'],
    text: 'Built the site’s chat assistant, grounded in a knowledge file generated from the site’s own data at build time; it can only attach links from a generated menu, so it never sends a visitor to a page that does not exist.' },
  { id: 'deepracer-train', priority: 3, tags: ['ml', 'rl', 'infra'], skills: ['Reinforcement learning', 'Docker'],
    text: 'Trained a TD3 policy for a simulated 1/18-scale autonomous car in a containerized local DeepRacer stack (Docker), GPU-accelerated on Apple Silicon, scoring the laps each policy ran.' },
  { id: 'deepracer-reward', priority: 4, tags: ['ml', 'rl'], skills: ['TD3', 'Reward shaping'],
    text: 'Hand-shaped the reward for a TD3 policy driving a simulated 1/18-scale car: center-line distance bands, heading toward upcoming waypoints, a speed-versus-steering trade-off, and penalties for leaving the track.' },
  { id: 'ransom-study', priority: 3, tags: ['ml', 'security', 'research', 'llm'], skills: ['PyTorch', 'scikit-learn', 'CNN', 'RoBERTa', 'ALBERT'],
    text: 'Compared a DNN, a 1-D CNN, and RoBERTa- and ALBERT-style transformers for ransomware detection from Windows API-call features, cutting ~31,000 features to 1,000 by chi-squared selection; about 98% binary accuracy in PyTorch and scikit-learn.' },
  { id: 'dys-eval', priority: 4, tags: ['ml', 'speech', 'health', 'research'], skills: ['Whisper', 'wav2vec2', 'Multi-task learning'],
    text: 'Built the ASR evaluation harness and Whisper multi-task grid for dysarthric speech, run leave-one-speaker-out across 43 speakers: 10.44 MAE on intelligibility and 0.809 quadratic weighted kappa on severity.' },
  { id: 'dys-findings', priority: 3, tags: ['ml', 'speech', 'health', 'research'], skills: ['Whisper', 'wav2vec2'],
    text: 'Measured transcription degrading roughly thirteen-fold from control to impaired speakers on identical prompts, with Whisper and wav2vec2 failing in opposite directions: fluent but wrong versus visibly broken.' },
  { id: 'cogload-analysis', priority: 2, tags: ['hci', 'llm', 'health', 'research'], skills: ['HCI', 'Cognitive load theory'],
    text: 'Analyzed a deployed clinical conversational agent’s interface and dialogue against cognitive load theory, Baddeley’s working-memory model, dual-process theory, and Levelt’s speech-production model (no human subjects).' },
  { id: 'lunar-study', priority: 2, tags: ['ml', 'rl'], skills: ['PyTorch', 'TD3', 'Gymnasium', 'Weights & Biases'],
    text: 'Trained and compared five reinforcement-learning algorithms on LunarLanderContinuous in PyTorch, with a hyperparameter sweep, a TD3 actor-critic architecture experiment, and Weights & Biases run tracking.' },
  { id: 'overcooked-ppo', priority: 2, tags: ['ml', 'rl'], skills: ['PPO', 'Multi-agent RL'],
    text: 'Trained cooperative PPO agents on the Overcooked-AI benchmark by self-play, evaluating each layout and how well a policy holds up with a partner it never trained against.' },
  { id: 'classical-suite', priority: 2, tags: ['ml', 'research'], skills: ['A* search', 'Bayesian networks', 'HMM', 'Expectation maximization'],
    text: 'Implemented classical AI from first principles: bidirectional and tridirectional A* over the Atlanta road network, alpha-beta search, Bayesian networks with Gibbs sampling, EM image segmentation, and HMM sign recognition.' },
  { id: 'chain-registry', priority: 2, tags: ['blockchain', 'web'], skills: ['Solidity', 'Hardhat', 'IPFS', 'React', 'MetaMask'],
    text: 'Built a federated-learning model registry on Ethereum: Solidity contracts deployed with Hardhat record each model’s IPFS content ID, with a React frontend wired to MetaMask and an automated Hardhat test suite.' },
  { id: 'care-map', priority: 4, tags: ['web'], skills: ['React', 'Leaflet', 'Node.js', 'Express'],
    text: 'Built and deployed a live map of food, shelter, clothing, and medical resources from local organizations, searchable by address or ZIP within a radius; only verified organizations post, signing in with a one-time email code.' },
  { id: 'unbound-portal', priority: 2, tags: ['web', 'security'], skills: ['ASP.NET Razor', 'Azure'],
    text: 'Led the security and permissions logic for a sponsor-family letter portal (ASP.NET Razor on Azure) serving thousands of families, keeping private messages, many from children, between their intended readers on slow connections.' },
  { id: 'ray-tracer', priority: 1, tags: ['graphics'], skills: ['Java'],
    text: 'Built a recursive ray tracer in Java: ray-sphere, ray-triangle, and box intersection, Phong shading with shadow rays, recursive reflection, instancing, and a bounding-volume hierarchy.' },
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
  security: ['security', 'cybersecurity', 'cyber', 'ransomware', 'malware', 'threat', 'adversarial', 'infrastructure', 'privacy', 'private', 'offline', 'local-first'],
  defense: ['defense', 'defence', 'dod', 'federal', 'government', 'military', 'clearance', 'air force', 'national lab'],
  research: ['research', 'researcher', 'scientist', 'phd', 'paper', 'publication', 'publications', 'lab', 'academic'],
  infra: ['cloud', 'aws', 'gcp', 'hpc', 'cluster', 'distributed', 'parallel', 'mlops', 'infrastructure', 'deploy', 'deployment'],
  web: ['web', 'frontend', 'front-end', 'backend', 'back-end', 'full-stack', 'fullstack', 'full stack', 'react', 'api', 'node'],
  data: ['data', 'dataset', 'datasets', 'analytics', 'pipeline', 'etl', 'labeling'],
  lead: ['lead', 'founding', 'founder', 'startup', 'ownership', 'product', 'manager', 'cross-functional', 'senior', 'staff'],
  blockchain: ['blockchain', 'web3', 'ethereum', 'solidity', 'crypto', 'smart contract'],
  xr: ['vr', 'ar', 'xr', 'virtual reality', 'augmented reality', 'headset'],
  graphics: ['graphics', 'rendering', 'ray tracing', 'game', 'games', '3d'],
  hci: ['hci', 'ux', 'user experience', 'usability', 'human-computer', 'interaction design', 'cognitive', 'conversational design'],
};
