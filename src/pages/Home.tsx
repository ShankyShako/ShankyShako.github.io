import { ProfilePhoto } from '../components/ProfilePhoto';
import { Reveal } from '../components/Reveal';

export function Home() {
  return (
    <>
      <h1>Genova Mongalo</h1>
      <Reveal>
        <div className="content-card">
          <p className="intro-text">
            My name is Genova Mongalo, I am a summa cum laude graduate with a Bachelor of Science in
            Computer Science from the University of Missouri-Kansas City (UMKC). I am currently
            pursuing a Master&rsquo;s degree in Computer Science with an emphasis on Artificial
            Intelligence at Georgia Tech, beginning in August 2025. My primary focus is on AI/ML
            Engineering and Cybersecurity applications.
          </p>
          <p className="intro-text">
            During the summer of 2025, I worked as a Federal AI/ML Engineer Contractor with the AFRL
            Sensors Directorate Internship Program at the University of Dayton. This role involves
            pioneering the development of generative AI models that enable CNN classifiers to
            recognize real objects when trained on generated data, utilizing transfer learning
            frameworks to address AFRL/DoD priorities.
          </p>
          <p className="intro-text">
            I am passionate about applying machine learning and artificial intelligence to solve
            real-world problems, particularly in cybersecurity and defense applications. I believe my
            strong foundation in AI/ML, coupled with my hands-on experience in cutting-edge research,
            positions me to contribute effectively to innovative projects in the tech industry.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="profile-section">
          <div>
            <ProfilePhoto />
          </div>
        </div>
      </Reveal>
    </>
  );
}
