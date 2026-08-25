export type SkillGroup = { title: string; items: string[]; kind: 'prose' | 'list' };

export const skills: SkillGroup[] = [
  { title: 'Programming Languages', kind: 'prose',
    items: ['Python', 'C / C++', 'Swift', 'Java / C#', 'SQL (Postgres)', 'JavaScript', 'HTML/CSS', 'LISP'] },
  { title: 'Frameworks & Technologies', kind: 'list',
    items: ['PyTorch', 'scikit-learn', 'Flask', 'SwiftUI', 'Socket.IO', 'FastAPI', 'React', 'Node.js', 'WireShark'] },
  { title: 'Developer Tools', kind: 'prose',
    items: ['Git', 'Xcode', 'AWS', 'Google Cloud Platform', 'VS Code', 'Visual Studio', 'PyCharm', 'Eclipse', 'Anaconda', 'Unity'] },
  { title: 'Libraries', kind: 'prose',
    items: ['pandas', 'NumPy', 'Matplotlib', 'PyTorch', 'CoreMotion', 'tkinter'] },
  { title: 'Specialized Skills', kind: 'list',
    items: ['Generative AI & GANs', 'Large Language Models', 'Self-hosted LLM Deployment (Ollama)',
            'Biomedical Signal Processing', 'Transfer Learning', 'CNN Classifiers',
            'Cybersecurity Applications', 'Parallel Computing (Slurm)'] },
  { title: 'Spoken Languages', kind: 'prose', items: ['English', 'Spanish', 'Amharic'] },
];
