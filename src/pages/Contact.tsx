import { site } from '../data/site';
import { ContactForm } from '../components/ContactForm';
import { Reveal } from '../components/Reveal';

export function Contact() {
  return (
    <>
      <h1>Contact</h1>
      <div className="contact-grid">
        <Reveal>
          <div className="content-card contact-info">
            <h3 style={{ marginTop: 0 }}>Direct</h3>
            <p>
              <strong>Email:</strong> <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
            <p>
              <strong>Phone:</strong> {site.phone}
            </p>
            <p>
              <strong>LinkedIn:</strong>{' '}
              <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
                linkedin.com/in/gmongalo
              </a>
            </p>
            <p>
              <strong>GitHub:</strong>{' '}
              <a href={site.github} target="_blank" rel="noopener noreferrer">
                github.com/ShankyShako
              </a>
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="content-card">
            <h3 style={{ marginTop: 0 }}>Send a message</h3>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </>
  );
}
