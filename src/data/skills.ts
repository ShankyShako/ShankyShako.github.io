export type SkillGroup = {
  title: string;
  items: string[];
  kind: 'prose' | 'list';
  /** Given room at the top of the Skills page; the rest are compact rows. */
  featured?: true;
};

export const skills: SkillGroup[] = [
  { title: 'Programming Languages', kind: 'prose',
    items: ['Python', 'C / C++', 'Swift', 'Java / C#', 'TypeScript', 'SQL (Postgres)', 'Solidity', 'Racket / LISP', 'HTML/CSS'] },
  { title: 'ML & Data', kind: 'list', featured: true,
    items: ['PyTorch', 'scikit-learn', 'Hugging Face Transformers', 'pandas / NumPy', 'Matplotlib',
            'Gymnasium', 'Weights & Biases'] },
  { title: 'Frameworks & Technologies', kind: 'list',
    items: ['SwiftUI & CoreMotion', 'Flask & FastAPI', 'React / Next.js', 'Node.js & Express',
            'Socket.IO', 'Hardhat & IPFS', 'Leaflet', 'Wireshark'] },
  { title: 'Infrastructure', kind: 'prose',
    items: ['Git', 'Docker / Apptainer', 'Slurm', 'AWS', 'Google Cloud Platform', 'Cloudflare Workers', 'Ollama', 'Metal (MPS)'] },
  { title: 'Developer Tools', kind: 'prose',
    items: ['Xcode', 'VS Code', 'Visual Studio', 'PyCharm', 'Eclipse', 'Anaconda', 'Unity'] },
  { title: 'Specialized Skills', kind: 'list', featured: true,
    items: ['Generative AI & GANs', 'Large Language Models', 'Self-hosted LLM Deployment',
            'Reinforcement Learning & Reward Design', 'Speech & Biomedical Signal Processing',
            'Transfer Learning', 'CNN Classifiers', 'Cybersecurity & Network Security',
            'Probability & Bayesian Statistics', 'Computer Graphics & Rendering',
            'Parallel Computing (Slurm)'] },
  { title: 'Spoken Languages', kind: 'prose',
    items: ['English', 'Spanish', 'Amharic'] },
];
