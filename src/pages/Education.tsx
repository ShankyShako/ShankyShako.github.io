import { degrees, graduateCoursework, coreFoundations } from '../data/education';
import { Reveal } from '../components/Reveal';
import type { Course } from '../data/education';

/* Two columns rather than one: the course list is the reason this page ran to
   2,100px, and a course plus its two sub-points is a self-contained unit that
   survives being placed side by side. */
function CourseList({ courses }: { courses: Course[] }) {
  return (
    <ul className="bullet-list course-grid">
      {courses.map((c) => (
        <li key={c.name}>
          {c.name}
          <ul className="sub-bullet">
            {c.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function Education() {
  return (
    <>
      <h1>Education</h1>
      <p className="page-intro">
        One computer science degree finished with honors, and a graduate one pointed straight at
        artificial intelligence.
      </p>

      <Reveal>
        <div className="degree-grid">
          {degrees.map((d) => (
            <div key={d.school} className="degree-card">
              <h2>{d.school}</h2>
              <p className="degree-name">{d.degree}</p>
              <p className="degree-date">{d.date}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="content-card">
          <div className="section-head">
            <h2>Graduate Coursework</h2>
            <span>Georgia Tech — M.S. Computer Science, AI emphasis</span>
          </div>
          <CourseList courses={graduateCoursework} />

          <div className="section-head">
            <h2>Core Foundations</h2>
          </div>
          <CourseList courses={coreFoundations} />
        </div>
      </Reveal>
    </>
  );
}
