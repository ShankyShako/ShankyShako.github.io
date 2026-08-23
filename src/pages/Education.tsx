import { degrees, graduateCoursework, coreFoundations } from '../data/education';
import { Reveal } from '../components/Reveal';
import type { Course } from '../data/education';

function CourseList({ courses }: { courses: Course[] }) {
  return (
    <ul className="bullet-list">
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
      <h1>Educational Background</h1>
      <Reveal>
        <div className="content-card">
          {degrees.map((d) => (
            <div key={d.school}>
              <h2>{d.school}</h2>
              <p className="intro-text">
                <strong>{d.degree}</strong>
                <br />
                {d.date}
              </p>
            </div>
          ))}

          <h2>Graduate Coursework</h2>
          <p className="intro-text">
            <em>Georgia Tech — M.S. in Computer Science (AI emphasis)</em>
          </p>
          <CourseList courses={graduateCoursework} />

          <h2>Core Foundations</h2>
          <CourseList courses={coreFoundations} />
        </div>
      </Reveal>
    </>
  );
}
