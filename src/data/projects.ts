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
      "A reinforcement-learning agent for the AWS DeepRacer environment, a 1/18-scale autonomous car on a simulated physics track. A TD3 policy trains in a containerized local stack (Docker/Apptainer, GPU-accelerated on Apple Silicon through Metal) instead of in the cloud. The real work is the reward function, a hand-built shaping scheme that bands reward by distance from the center line, aligns heading against the upcoming waypoints, trades speed off against steering angle, and penalizes leaving the track or crashing outright. The learning algorithm is off the shelf. The incentives are not, and that is where DeepRacer is actually hard, since a badly shaped reward gives you an agent that drives beautifully and never finishes a lap. Graduate coursework for CS 7642, Reinforcement Learning and Decision Making, at Georgia Tech. The repository is private under the university's academic-honesty policy.",
  },
  {
    title: 'LunarLander — Continuous Control Study',
    years: '2026',
    tags: ['Reinforcement Learning', 'PyTorch', 'TD3', 'Gymnasium', 'Weights & Biases'],
    blurb:
      "Five reinforcement-learning algorithms trained and compared on Gymnasium's LunarLanderContinuous, where two continuous thrusters trade landing stability against fuel. Includes a hyperparameter sweep, an architecture experiment on the TD3 actor-critic, and Weights & Biases run tracking. Graduate coursework for CS 7642. The repository is private under the university's academic-honesty policy.",
  },
  {
    title: 'Overcooked — Cooperative Multi-Agent RL',
    years: '2026',
    tags: ['Reinforcement Learning', 'PPO', 'Multi-Agent', 'Python'],
    blurb:
      "PPO agents trained on the Overcooked-AI benchmark, where two cooks share a cramped kitchen and reward only arrives once a soup goes out the door. That makes coordination the hard part, not control. Covers self-play training, evaluation layout by layout, and how well a policy holds up with a partner it never trained against. Graduate coursework for CS 7642. The repository is private under the university's academic-honesty policy.",
  },
  {
    title: 'Classical AI Algorithm Suite',
    years: '2026',
    tags: ['Python', 'Search', 'Bayesian Networks', 'HMM', 'Expectation Maximization'],
    blurb:
      "Six graduate assignments written from first principles instead of pulled from libraries: bidirectional and tridirectional A* over the Atlanta road network, alpha-beta adversarial search for a rook-isolation variant, Bayesian networks sampled with Gibbs and Metropolis-Hastings, decision trees and random forests, Gaussian-mixture image segmentation by expectation-maximization, and hidden Markov models for sign recognition. Georgia Tech CS 6601. The repository is private under the university's academic-honesty policy.",
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
    // href: 'https://github.com/hsaranu5/resourcestracker',
    years: '2025',
    tags: ['React', 'Leaflet', 'Node.js', 'Express', 'Geospatial'],
    blurb:
      'A live map of food, shelter, clothing, and medical resources pulled together from local organizations, searchable by street address or ZIP, with distance results by radius and markers color-coded by resource type. Anyone can read the community feed, but only verified organizations can post to it, gated behind a one-time email code rather than another password to lose.',
  },
  {
    title: 'Recursive Ray Tracer',
    years: '2025',
    tags: ['Java', 'Computer Graphics', 'Rendering'],
    blurb:
      'A ray tracer built up from the intersection math: ray-sphere, ray-triangle, and axis-aligned box tests, Phong shading with shadow rays, recursive reflection, instanced and moving surfaces, and a bounding-volume hierarchy so scenes render in something short of forever. Written in Java against a renderer interface, with a test suite per part. Graduate computer-graphics coursework. The repository is private under the university\'s academic-honesty policy.',
  },
  {
    title: 'Federated Blockchain — Model Registry',
    href: 'https://github.com/ShankyShako/Federated-BlockChain',
    years: '2025–2026',
    tags: ['Solidity', 'React', 'IPFS', 'Hardhat', 'Web3'],
    blurb:
      "A federated-learning model registry on Ethereum that lets nodes share and audit machine-learning models without putting large weights on-chain. Solidity smart contracts (FederatedModelStorage, FederatedLedger, and an ERC-20 FederatedToken), deployed with Hardhat and tested on Ganache, record each model's IPFS content ID on-chain. Trained models, including the ALBERT ransomware classifier from my research, are exported as self-describing bundles, uploaded to IPFS, and registered through either a Node.js script or a React/Vite frontend wired to MetaMask. An automated Hardhat suite checks that a model CID round-trips through all three contracts.",
  },
  {
    title: 'Racket Parser',
    href: 'https://github.com/ShankyShako/Racket-Parser',
    years: '2024',
    tags: ['Racket', 'Compilers', 'Parsing'],
    blurb:
      'A parser written in Racket for a small artificial language modeled on FORTRAN. It reads .txt source files, checks them against a defined grammar, and reports the exact line where an invalid construct shows up. Built and debugged in DrRacket.',
  },
  {
    title: 'Phonebook Management System',
    href: 'https://github.com/ShankyShako/PhoneBook',
    years: '2024',
    tags: ['Java', 'SQL', 'CRUD'],
    blurb:
      'A Java phonebook application backed by Dolphin SQL for storage. It handles user registration with hashed passwords, adding, updating and deleting contacts, search, and CSV export. Built in Eclipse.',
  },
  {
    title: 'SOS Game Implementation',
    href: 'https://github.com/ShankyShako/SOS-Game',
    years: '2023',
    tags: ['Python', 'Scrum', 'Testing'],
    blurb:
      'The SOS paper-and-pencil game, written in Python as a vehicle for practicing Scrum. Sprint by sprint, with automated tests and the game logic underneath.',
  },
];

export const research: Project[] = [
  {
    title: 'Ransomware Detection for Critical Infrastructures',
    href: 'https://github.com/ShankyShako/RansomWare-Detection-Models',
    years: '2024–2026',
    tags: ['PyTorch', 'ALBERT', 'RoBERTa', 'CNN', 'Security'],
    blurb:
      'A comparative study of deep-learning and transformer models for spotting and classifying ransomware from Windows API-call features, aimed at industrial control systems. Each model predicts at three levels at once: benign against malicious, coarse family group, and specific family across 12 classes. Each is then evaluated under three feature-engineering setups, baseline, autoencoder, and K-Means clustering. The pipeline puts a DNN, a 1-D CNN, and RoBERTa- and ALBERT-style transformers against classical baselines, using chi-squared selection to cut roughly 31,000 features down to the most informative 1,000, and class weighting to keep rare families from disappearing. The reproducible PyTorch and scikit-learn pipeline reaches about 98% accuracy on binary detection, with early stopping and ALBERT weight sharing holding back overfitting on a small dataset. GPU-accelerated on Apple Silicon through Metal.',
  },
  {
    title: 'Dysarthria Speech Understanding — Heterogeneous Multi-Task Learning',
    years: '2026',
    tags: ['PyTorch', 'Whisper', 'wav2vec2', 'Multi-Task Learning', 'Speech', 'Clinical ML'],
    blurb:
      "Speech recognition trained on healthy speakers collapses on dysarthric speech, which is exactly the population that most needs it, since post-stroke motor impairment tends to rule out typing too. The system transcribes a patient's speech for their care team and scores the same recording on two clinical axes, so one recording is both a message and a passive biomarker of recovery. A frozen pretrained encoder feeds two task-specific heads: intelligibility regression on UA-Speech, four-class severity classification on TORGO. Those corpora label disjoint things, so the heads train by masked loss routing, where each clip contributes gradient only to the head it actually has a label for. Evaluation is leave-one-speaker-out across all 43 speakers. Whisper's encoder beats wav2vec2 on both tasks, at 10.44 MAE on intelligibility and 46.7% raw severity accuracy against a 0.809 quadratic weighted kappa, so it lands adjacent when it is wrong. The MFCC+SVM baseline scores a kappa of exactly 0.000, tracking the class prior and nothing else, which is the clearest evidence that the pretrained representation is doing the work and not the head. Two findings were worth the trouble. Transcription degrades roughly thirteen-fold from control to impaired speakers on identical prompts and identical hardware, and the two encoders fail in opposite directions: Whisper invents fluent English that is wrong, wav2vec2 produces visibly broken text. When the output is a patient's request to a nurse, the failure a reader can see is the safer one. Georgia Tech CS 7643 with Team LEGACY. My part was the ASR evaluation harness, the FDA severity parser, the Whisper multi-task grid, and the full 43-fold multi-task LOSO run.",

  },
  {
    title: 'Cognitive-Load-Aware Conversational Design',
    years: '2025',
    tags: ['Cognitive Science', 'LLM', 'HCI', 'Design Analysis'],
    blurb:
      "A design-only analysis of a deployed clinical conversational agent, reading its interface and dialogue decisions against four cognitive-science frameworks: cognitive load theory, Baddeley's working-memory model, dual-process theory, and Levelt's model of speech production. No human subjects, no participant data, so the findings are analytical rather than empirical. Georgia Tech CS 6795.",
  },
];
