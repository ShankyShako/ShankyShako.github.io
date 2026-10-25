import { useState } from 'react';
import { site } from '../data/site';
import { ContactForm } from '../components/ContactForm';
import { Reveal } from '../components/Reveal';
import { SocialIcon } from '../components/SocialIcon';

/* Email first (DESIGN.md, "Contact"): the page says email is fastest, so the
   address is the focal element and "Email me" is the one solid button. The
   values explain themselves, so they carry no labels. The form follows as
   the alternative. */
export function Contact() {
  const [copied, setCopied] = useState(false);

  /* Confirms in place, like "Copy citation": a copy that changes nothing on
     screen gets pressed twice. */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable: the address is on screen and selectable. */
    }
  };

  return (
    <>
      <h1>Contact</h1>
      <p className="page-intro">
        Email is the fastest way to reach me, though the form below lands in the same inbox.
      </p>

      <div className="contact-main">
        <Reveal>
          <p className="contact-email">{site.email}</p>
          <div className="contact-actions">
            <a className="btn btn-solid" href={`mailto:${site.email}`}>
              Email me
            </a>
            <button type="button" className="btn" onClick={copy}>
              {copied ? 'Copied' : 'Copy address'}
            </button>
          </div>
          <ul className="contact-links">
            <li>
              <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
                <SocialIcon name="linkedin" size={14} />
                LinkedIn
              </a>
            </li>
            <li>
              <a href={site.github} target="_blank" rel="noopener noreferrer">
                <SocialIcon name="github" size={14} />
                GitHub
              </a>
            </li>
            <li>{site.phone}</li>
          </ul>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="contact-form-head">Or send a message</h2>
          <ContactForm />
        </Reveal>
      </div>
    </>
  );
}
