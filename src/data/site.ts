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
  { path: '/', label: 'Home', title: 'Genova Mongalo | AI Engineer',
    description: 'AI/ML engineer building generative models, transformers, and on-device ML.' },
  { path: '/resume', label: 'Resume', title: 'Resume | Genova Mongalo',
    description: 'Resume of Genova Mongalo, AI/ML engineer.' },
  { path: '/education', label: 'Education', title: 'Education | Genova Mongalo',
    description: 'B.S. Computer Science (summa cum laude, UMKC) and M.S. Computer Science, AI emphasis (Georgia Tech).' },
  { path: '/skills', label: 'Skills', title: 'Skills | Genova Mongalo',
    description: 'Languages, frameworks, and tools for ML, security, and iOS work.' },
  { path: '/projects', label: 'Projects', title: 'Projects | Genova Mongalo',
    description: 'The Unbound family portal, reinforcement learning projects, a homelessness resource map, and more.' },
  { path: '/research', label: 'Research', title: 'Research | Genova Mongalo',
    description: 'Ransomware detection for industrial control systems, dysarthric speech recognition, and a paper on attacks against VR cybersickness detection.' },
  { path: '/experience', label: 'Experience', title: 'Experience | Genova Mongalo',
    description: 'Geometry Health and Wellness, the AFRL Sensors Directorate, two NSF REUs, and the NASA Missouri Space Grant Consortium.' },
  { path: '/shop', label: 'Shop', title: 'Shop | Genova Mongalo',
    description: 'Hand-made originals. Limited runs. One of one. All sold out.' },
  { path: '/contact', label: 'Contact', title: 'Contact | Genova Mongalo',
    description: 'Get in touch with Genova Mongalo.' },
];
