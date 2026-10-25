import {
  degrees,
  inProgress,
  inProgressTerm,
  graduateCoursework,
  undergraduateCoursework,
} from '../data/education';
import { Reveal } from '../components/Reveal';
import { Featured } from '../components/Featured';
import { IndexList, IndexRow } from '../components/IndexRow';
import type { Course } from '../data/education';

/* A course is a static index row: its two points are short, so both show
   inline rather than behind a toggle that would reveal one more line. */
function CourseRows({ courses }: { courses: Course[] }) {
  return (
    <IndexList>
      {courses.map((c) => (
        <IndexRow key={c.name} title={c.name} summary={c.points.join(' · ')} />
      ))}
    </IndexList>
  );
}

export function Education() {
  return (
    <div className="fx">
      <h1>Education</h1>
      <p className="page-intro">
        B.S. in Computer Science from UMKC, summa cum laude. Now working on the M.S. at Georgia
        Tech, with an AI emphasis.
      </p>

      <Reveal>
        <div className="feat-grid">
          {degrees.map((d) => (
            <Featured key={d.school} as="h2" title={d.school}>
              <p className="feat-degree">{d.degree}</p>
              <p className="feat-meta">{d.date}</p>
              {d.note && <p className="feat-note">{d.note}</p>}
            </Featured>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <h2 className="fx-heading">
          In progress <small>{inProgressTerm}</small>
        </h2>
        <CourseRows courses={inProgress} />
      </Reveal>

      <Reveal>
        <h2 className="fx-heading">
          Graduate coursework <small>Georgia Tech, M.S. Computer Science, AI emphasis</small>
        </h2>
        <CourseRows courses={graduateCoursework} />
      </Reveal>

      <Reveal>
        <h2 className="fx-heading">
          Undergraduate coursework <small>Toward the B.S. in Computer Science</small>
        </h2>
        <div className="course-groups">
          {undergraduateCoursework.map((g) => (
            <div key={g.area}>
              <h3>{g.area}</h3>
              <p>{g.courses.join(' · ')}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
