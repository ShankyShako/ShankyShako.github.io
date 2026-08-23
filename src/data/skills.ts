export type SkillGroup = { title: string; items: string[]; kind: 'prose' | 'list' };

export const skills: SkillGroup[] = [
  { title: 'Programming Languages', kind: 'prose',
    items: ['Python', 'C / C++', 'Java / C#', 'SQL (Postgres)', 'JavaScript', 'HTML/CSS', 'LISP'] },
  { title: 'Frameworks & Technologies', kind: 'list',
    items: ['Machine Learning', 'React', 'Node.js', 'WireShark', 'FastAPI'] },
  { title: 'Developer Tools', kind: 'prose',
    items: ['Git', 'VS Code', 'Visual Studio', 'PyCharm', 'Eclipse', 'Anaconda', 'Unity', 'Google Cloud Platform'] },
  { title: 'Libraries', kind: 'prose',
    items: ['pandas', 'NumPy', 'Matplotlib', 'PyTorch', 'tkinter'] },
  { title: 'Specialized Skills', kind: 'list',
    items: ['Generative AI & GANs', 'Large Language Models', 'Transfer Learning', 'CNN Classifiers',
            'Cybersecurity Applications', 'Parallel Computing (Slurm)'] },
  { title: 'Spoken Languages', kind: 'prose', items: ['English', 'Spanish', 'Amharic'] },
];
