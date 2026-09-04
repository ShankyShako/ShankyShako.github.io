export type SkillGroup = {
  title: string;
  items: string[];
  kind: 'prose' | 'list';
  /** Spans the whole grid row. Seven cards in a three-column grid leave one
      stranded on a row of its own; the odd one out is deliberately the
      shortest group, laid out as a closing strip instead of an orphan. */
  wide?: boolean;
};

export const skills: SkillGroup[] = [
  { title: 'Programming Languages', kind: 'prose',
    items: ['Python', 'C / C++', 'Swift', 'Java / C#', 'TypeScript', 'SQL (Postgres)', 'Solidity', 'Racket / LISP', 'HTML/CSS'] },
  { title: 'ML & Data', kind: 'list',
    items: ['PyTorch', 'scikit-learn', 'Hugging Face Transformers', 'pandas / NumPy', 'Matplotlib',
            'Gymnasium', 'Weights & Biases'] },
  { title: 'Frameworks & Technologies', kind: 'list',
    items: ['SwiftUI & CoreMotion', 'Flask & FastAPI', 'React / Next.js', 'Node.js & Express',
            'Socket.IO', 'Hardhat & IPFS', 'Leaflet', 'Wireshark'] },
  { title: 'Infrastructure', kind: 'prose',
    items: ['Git', 'Docker / Apptainer', 'Slurm', 'AWS', 'Google Cloud Platform', 'Cloudflare Workers', 'Ollama', 'Metal (MPS)'] },
  { title: 'Developer Tools', kind: 'prose',
    items: ['Xcode', 'VS Code', 'Visual Studio', 'PyCharm', 'Eclipse', 'Anaconda', 'Unity'] },
  { title: 'Specialized Skills', kind: 'list',
    items: ['Generative AI & GANs', 'Large Language Models', 'Self-hosted LLM Deployment',
            'Reinforcement Learning & Reward Design', 'Speech & Biomedical Signal Processing',
            'Transfer Learning', 'CNN Classifiers', 'Cybersecurity & Network Security',
            'Probability & Bayesian Statistics', 'Computer Graphics & Rendering',
            'Parallel Computing (Slurm)'] },
  { title: 'Spoken Languages', kind: 'prose', wide: true,
    items: ['English', 'Spanish', 'Amharic'] },
];
