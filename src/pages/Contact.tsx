import { site } from '../data/site';
import { ContactForm } from '../components/ContactForm';
import { Reveal } from '../components/Reveal';

export function Contact() {
  return (
    <>
      <h1>Contact</h1>
      <p className="page-intro">
        Open to AI/ML engineering and research roles. Email is the fastest way to reach me, though
        the form below lands in the same inbox.
      </p>

      <div className="contact-grid">
        <Reveal>
          <div className="content-card contact-info">
            <p className="card-title">Direct</p>
            <dl>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </dd>
              <dt>Phone</dt>
              <dd>{site.phone}</dd>
              <dt>LinkedIn</dt>
              <dd>
                <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
                  linkedin.com/in/gmongalo
                </a>
              </dd>
              <dt>GitHub</dt>
              <dd>
                <a href={site.github} target="_blank" rel="noopener noreferrer">
                  github.com/ShankyShako
                </a>
              </dd>
            </dl>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="content-card">
            <p className="card-title">Send a message</p>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </>
  );
}
