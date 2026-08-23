export type Project = {
  title: string;
  href: string;
  years: string;
  blurb: string;
  tags: string[];
};

export const projects: Project[] = [
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
];
