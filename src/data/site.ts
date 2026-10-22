export const site = {
  name: 'Genova Mongalo',
  role: 'ML Engineer & Founding Engineer',
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
  { path: '/', label: 'Home', title: 'Genova Mongalo | ML Engineer & Founding Engineer',
    description: 'I build machine learning into products people use. Founding engineer at Geometry Health, maker of LegacyScribe, M.S. at Georgia Tech.' },
  { path: '/resume', label: 'Resume', title: 'Resume | Genova Mongalo',
    description: 'Resume of Genova Mongalo, ML and founding engineer.' },
  { path: '/education', label: 'Education', title: 'Education | Genova Mongalo',
    description: 'B.S. Computer Science (summa cum laude, UMKC) and M.S. Computer Science (Georgia Tech).' },
  { path: '/skills', label: 'Skills', title: 'Skills | Genova Mongalo',
    description: 'Languages, frameworks, and tools for software, security, and iOS work.' },
  { path: '/projects', label: 'Projects', title: 'Projects | Genova Mongalo',
    description: 'The Unbound family portal, software projects, a homelessness resource map, and more.' },
  { path: '/research', label: 'Research', title: 'Research | Genova Mongalo',
    description: 'Ransomware detection for industrial control systems, dysarthric speech recognition, and a paper on attacks against VR cybersickness detection.' },
  { path: '/experience', label: 'Experience', title: 'Experience | Genova Mongalo',
    description: 'Geometry Health and Wellness, the AFRL Sensors Directorate, two NSF REUs, and the NASA Missouri Space Grant Consortium.' },
  { path: '/shop', label: 'Shop', title: 'Shop | Genova Mongalo',
    description: 'Hand-made originals. Limited runs. One of one. All sold out.' },
  { path: '/contact', label: 'Contact', title: 'Contact | Genova Mongalo',
    description: 'Get in touch with Genova Mongalo.' },
];

/* Routes that exist and are indexed but are not tabs in the nav (the product
   page has its own chrome). Same entry shape as `nav`: scripts/prerender-meta.mjs
   reads this file with a regex and bakes each entry into its own HTML. */
export const extraRoutes: NavItem[] = [
  { path: '/LegacyScribe', label: 'LegacyScribe', title: 'LegacyScribe | Free, open-source dictation for your Mac',
    description: 'Hold a key, talk, let go: clean text in any app. Speech recognition and the AI run on your Mac. Free, MIT, Apple Silicon.' },
];
