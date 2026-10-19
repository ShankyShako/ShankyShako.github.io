import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider } from './context/AudioContext';
import { Nav } from './components/Nav';
import { AudioBar } from './components/AudioBar';
import { ChatWidget } from './components/ChatWidget';
import { DesktopPet } from './components/DesktopPet';

import { useSeo } from './hooks/useSeo';
import { useImageGuard } from './hooks/useImageGuard';
import { useDevtoolsTrap } from './hooks/useDevtoolsTrap';
import { useHashHighlight } from './hooks/useHashHighlight';
import { nav, extraRoutes, site } from './data/site';

import { Home } from './pages/Home';
import { Resume } from './pages/Resume';
import { Education } from './pages/Education';
import { Skills } from './pages/Skills';
import { Projects, Research } from './pages/Projects';
import { Experience } from './pages/Experience';
import { Shop } from './pages/Shop';
import { Contact } from './pages/Contact';
import { NotFound } from './pages/NotFound';
import { LegacyScribe } from './pages/legacyscribe/LegacyScribe';

import './styles/global.css';
import './styles/components.css';

const NOT_FOUND = {
  title: '404 | Genova Mongalo',
  description: 'That page does not exist.',
};

function Shell() {
  const { pathname, hash } = useLocation();
  /* The product page is a standalone Mac-app page: no portfolio nav, no chat
     widget (the pet is mounted but banished there). Matched case-insensitively
     so /legacyscribe renders it too. */
  const product = /^\/legacyscribe\/?$/i.test(pathname);
  const route = [...nav, ...extraRoutes].find((n) =>
    product ? n.path === '/LegacyScribe' : n.path === pathname,
  );
  const meta = route ?? NOT_FOUND;

  useSeo(
    meta.title,
    meta.description,
    route ? route.path : pathname,
    product ? site.url + '/image/legacyscribe-og.png' : undefined,
  );
  useImageGuard(!product);
  useDevtoolsTrap(!product && import.meta.env.PROD);
  useHashHighlight();

  /* Each route starts at the top, matching the old tab behaviour — unless the
     URL names an anchor, in which case useHashHighlight owns the scroll and
     jumping to the top first would just fight it. */
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, hash]);

  /* The page's own stylesheet turns the body white off this attribute. */
  useEffect(() => {
    if (!product) return;
    document.documentElement.dataset.page = 'legacyscribe';
    return () => {
      delete document.documentElement.dataset.page;
    };
  }, [product]);

  if (product) {
    return (
      <>
        <main key={pathname} className="route-enter">
          <Routes>
            <Route path="/LegacyScribe" element={<LegacyScribe />} />
          </Routes>
        </main>
        <AudioBar />
        <DesktopPet />
      </>
    );
  }

  return (
    <>
      <div className="container">
        <Nav />
        <main key={pathname} className="route-enter">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/education" element={<Education />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/research" element={<Research />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <AudioBar />
      <ChatWidget />
      <DesktopPet />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <Shell />
      </AudioProvider>
    </ThemeProvider>
  );
}
