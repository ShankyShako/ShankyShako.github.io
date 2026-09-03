export type Project = {
  title: string;
  /** Public repo. Absent for coursework, which must not be published. */
  href?: string;
  years: string;
  blurb: string;
  tags: string[];
};

export const projects: Project[] = [
  {
    title: 'AWS DeepRacer — Reward Shaping',
    years: '2026',
    tags: ['Reinforcement Learning', 'TD3', 'Reward Shaping', 'Docker', 'Simulation'],
    blurb:
      "A reinforcement-learning agent for the AWS DeepRacer environment, a 1/18-scale autonomous vehicle on a simulated physics track. A TD3 policy trains in a containerised local stack (Docker/Apptainer, GPU-accelerated on Apple Silicon via Metal) rather than in the cloud. The substance of the work is the reward function: a hand-built shaping scheme that bands reward by distance from the centre line, aligns heading against the upcoming waypoints, trades speed against steering angle, and applies hard penalties for leaving the track or crashing. The learning algorithm is off the shelf; the incentives are not, and reward design is where the difficulty in DeepRacer actually lives — a poorly shaped reward produces an agent that drives beautifully and never finishes a lap. Graduate coursework for CS 7642, Reinforcement Learning & Decision Making, at Georgia Tech; the repository is private under the university's academic-honesty policy.",
  },
  {
    title: 'Dysarthria Speech Understanding — Multi-Task Learning',
    years: '2026',
    tags: ['PyTorch', 'Whisper', 'wav2vec2', 'Multi-Task Learning', 'Speech'],
    blurb:
      "A shared speech encoder with two heads — intelligibility regression and motor-severity scoring — trained by masked loss routing, so each clip only updates the head it actually has a label for. The question is whether Whisper's transcription-tuned encoder transfers to clinical scoring better than wav2vec2, answered under leave-one-speaker-out cross-validation. Georgia Tech CS 7643 final project, with Team LEGACY.",
  },
  {
    title: 'LunarLander — Continuous Control Study',
    years: '2026',
    tags: ['Reinforcement Learning', 'PyTorch', 'TD3', 'Gymnasium', 'Weights & Biases'],
    blurb:
      "Five reinforcement-learning algorithms trained and compared on Gymnasium's LunarLanderContinuous, where two continuous thrusters have to trade landing stability against fuel. Includes a hyperparameter sweep, an architecture experiment on the TD3 actor-critic, and Weights & Biases run tracking. Graduate coursework for CS 7642; the repository is private under the university's academic-honesty policy.",
  },
  {
    title: 'Overcooked — Cooperative Multi-Agent RL',
    years: '2026',
    tags: ['Reinforcement Learning', 'PPO', 'Multi-Agent', 'Python'],
    blurb:
      "PPO agents trained on the Overcooked-AI benchmark, where two cooks share a cramped kitchen and reward only arrives when a soup is delivered — so the hard part is coordination, not control. Covers self-play training, layout-by-layout evaluation, and how well a policy holds up against a partner it was not trained with. Graduate coursework for CS 7642; the repository is private under the university's academic-honesty policy.",
  },
  {
    title: 'Classical AI Algorithm Suite',
    years: '2026',
    tags: ['Python', 'Search', 'Bayesian Networks', 'HMM', 'Expectation Maximization'],
    blurb:
      "Six graduate assignments implemented from first principles rather than from libraries: bidirectional and tridirectional A* over the Atlanta road network, alpha-beta adversarial search for a rook-isolation variant, Bayesian networks sampled with Gibbs and Metropolis-Hastings, decision trees and random forests, Gaussian-mixture image segmentation by expectation-maximisation, and hidden Markov models for sign recognition. Georgia Tech CS 6601; the repository is private under the university's academic-honesty policy.",
  },
  // {
  //   title: 'ReviewRounds — Spaced-Review Planner',
  //   href: 'https://github.com/yeabsira84-tech/LectureLoop',
  //   years: '2026',
  //   tags: ['React', 'Next.js', 'TypeScript', 'Cloudflare Workers', 'Drizzle'],
  //   blurb:
  //     'A mobile-first spaced-repetition planner for medical students. Each exam is its own study plan: its lectures are scheduled across several review passes, and the next interval adapts to the recall, understanding, and difficulty logged after each session. React 19 and Next.js on a Cloudflare Workers runtime, with Drizzle and a deliberately swappable data adapter.',
  // },
  {
    title: 'Care Beyond — Homelessness Resource Map',
    href: 'https://github.com/hsaranu5/resourcestracker',
    years: '2025',
    tags: ['React', 'Leaflet', 'Node.js', 'Express', 'Geospatial'],
    blurb:
      'A live map of food, shelter, clothing, and medical resources aggregated from local organisations, searchable by street address or ZIP with radius-based distance results and colour-coded markers by resource type. A community feed lets anyone read but only verified organisations publish, gated by a one-time email code rather than another password to lose.',
  },
  {
    title: 'Recursive Ray Tracer',
    years: '2025',
    tags: ['Java', 'Computer Graphics', 'Rendering'],
    blurb:
      'A ray tracer built up from the intersection maths: ray-sphere, ray-triangle, and axis-aligned box tests, Phong shading with shadow rays, recursive reflection, instanced and moving surfaces, and a bounding-volume hierarchy so scenes render in something short of forever. Written in Java against a renderer interface, with per-part test suites. Graduate computer-graphics coursework; the repository is private under the university\'s academic-honesty policy.',
  },
  {
    title: 'Federated Blockchain — Model Registry',
    href: 'https://github.com/ShankyShako/Federated-BlockChain',
    years: '2025–2026',
    tags: ['Solidity', 'React', 'IPFS', 'Hardhat', 'Web3'],
    blurb:
      "A federated-learning model registry on Ethereum that lets nodes share and audit machine-learning models without putting large weights on-chain. Solidity smart contracts (FederatedModelStorage, FederatedLedger, and an ERC-20 FederatedToken), deployed with Hardhat and tested on Ganache, record each model's IPFS content ID on-chain. Trained models — including the ALBERT ransomware classifier from my research — are exported as self-describing bundles, uploaded to IPFS, and registered via either a Node.js script or a React/Vite frontend with MetaMask wallet integration. Includes an automated Hardhat test suite verifying a model CID round-trips through all three contracts.",
  },
  {
    title: 'Racket Parser',
    href: 'https://github.com/ShankyShako/Racket-Parser',
    years: '2024',
    tags: ['Racket', 'Compilers', 'Parsing'],
    blurb:
      'A custom parser built in Racket for a small artificial programming language inspired by FORTRAN. It reads .txt source files, validates syntax based on a defined grammar, and reports precise error lines when invalid constructs are encountered. This project demonstrates understanding of language grammars, recursive parsing techniques, and working with DrRacket tools to implement language analysis.',
  },
  {
    title: 'Phonebook Management System',
    href: 'https://github.com/ShankyShako/PhoneBook',
    years: '2024',
    tags: ['Java', 'SQL', 'CRUD'],
    blurb:
      'A Java-based phonebook management application that integrates with Dolphin SQL for persistent storage. It supports user registration with secure password handling, contact addition/update/deletion, search functionality, and CSV export. Developed using Eclipse, this project highlights practical database integration, user interaction design, and CRUD operation management in a desktop application.',
  },
  {
    title: 'SOS Game Implementation',
    href: 'https://github.com/ShankyShako/SOS-Game',
    years: '2023',
    tags: ['Python', 'Scrum', 'Testing'],
    blurb:
      "An implementation of the classic SOS paper-and-pencil game designed to explore software development workflows using Scrum methodology. Written in Python, this project reflects iterative development practices, automated testing, and simple game logic implementation. It's a great example of applying agile principles to deliver a functional interactive game while learning team processes.",
  },
];

export const research: Project[] = [
  {
    title: 'Ransomware Detection for Critical Infrastructures',
    href: 'https://github.com/ShankyShako/RansomWare-Detection-Models',
    years: '2024–2026',
    tags: ['PyTorch', 'ALBERT', 'RoBERTa', 'CNN', 'Security'],
    blurb:
      'A comparative study of deep-learning and transformer models for detecting and classifying ransomware from Windows API-call features, aimed at Industrial Control Systems. Each model predicts at three levels simultaneously — binary (benign vs. malicious), coarse family group, and specific family (12 classes) — and is evaluated under three feature-engineering setups (baseline, autoencoder, and K-Means clustering). The pipeline compares a DNN, a 1-D CNN, and RoBERTa- and ALBERT-style transformers against classical baselines, using chi-squared feature selection to reduce ~31,000 features to the most informative 1,000 and class-weighting to handle rare families. The reproducible PyTorch/scikit-learn pipeline reaches ~98% accuracy on binary detection, with early stopping and weight sharing (ALBERT) used to control overfitting on the small dataset. GPU-accelerated on Apple Silicon via Metal.',
  },
  {
    title: 'Cognitive-Load-Aware Conversational Design',
    years: '2025',
    tags: ['Cognitive Science', 'LLM', 'HCI', 'Design Analysis'],
    blurb:
      "A design-only analysis of a deployed clinical conversational agent, mapping its interface and dialogue decisions against four cognitive-science frameworks: cognitive load theory, Baddeley's working-memory model, dual-process theory, and Levelt's model of speech production. No human subjects were involved and no participant data was collected — the findings are analytical rather than empirical. Georgia Tech CS 6795.",
  },
];
