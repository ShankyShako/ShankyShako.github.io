export const site = {
  name: 'Genova Mongalo',
  role: 'AI Engineer',
  url: 'https://gmango.dev',
  email: 'genova@gmango.dev',
  phone: '(510) 274-1272',
  linkedin: 'https://www.linkedin.com/in/gmongalo/',
  github: 'https://github.com/ShankyShako',
  /* Social previews intentionally use the watermarked decoy, never the master. */
  ogImage: 'https://gmango.dev/image/decoy-watermarked.jpg',
} as const;

export type NavItem = { path: string; label: string; title: string; description: string };

export const nav: NavItem[] = [
  { path: '/', label: 'Home', title: 'Genova Mongalo — AI Engineer',
    description: 'AI/ML engineer working on generative models, transformers, and security applications.' },
  { path: '/resume', label: 'Resume', title: 'Resume — Genova Mongalo',
    description: 'Resume of Genova Mongalo, AI/ML engineer.' },
  { path: '/education', label: 'Education', title: 'Education — Genova Mongalo',
    description: 'B.S. Computer Science (summa cum laude, UMKC) and M.S. Computer Science, AI emphasis (Georgia Tech).' },
  { path: '/skills', label: 'Skills', title: 'Skills — Genova Mongalo',
    description: 'Languages, frameworks, libraries, and specialized AI/ML and security work.' },
  { path: '/projects', label: 'Projects', title: 'Projects — Genova Mongalo',
    description: 'Federated blockchain model registry, Racket parser, phonebook system, and more.' },
  { path: '/research', label: 'Research', title: 'Research — Genova Mongalo',
    description: 'Ransomware detection for critical infrastructure using transformer models.' },
  { path: '/experience', label: 'Experience', title: 'Experience — Genova Mongalo',
    description: 'AFRL Sensors Directorate, NSF REU programs, and NASA Missouri Space Grant Consortium.' },
  { path: '/shop', label: 'Shop', title: 'Shop — Genova Mongalo',
    description: 'Hand-made originals. Limited runs. One of one. All sold out.' },
  { path: '/contact', label: 'Contact', title: 'Contact — Genova Mongalo',
    description: 'Get in touch with Genova Mongalo.' },
];
