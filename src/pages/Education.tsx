import {
  degrees,
  inProgress,
  inProgressTerm,
  graduateCoursework,
  undergraduateCoursework,
} from '../data/education';
import { Reveal } from '../components/Reveal';
import type { Course, CourseGroup } from '../data/education';

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

/* The undergrad list is four times the length of the graduate one. Two
   sub-points per entry would be invented filler, so the area label carries the
   grouping and the courses just read as a list. */
function CourseGroups({ groups }: { groups: CourseGroup[] }) {
  return (
    <div className="course-groups">
      {groups.map((g) => (
        <div key={g.area}>
          <h3>{g.area}</h3>
          <p>{g.courses.join(' · ')}</p>
        </div>
      ))}
    </div>
  );
}

export function Education() {
  return (
    <>
      <h1>Education</h1>
      <p className="page-intro">
        B.S. in Computer Science from UMKC, summa cum laude. Now doing the M.S. at Georgia Tech,
        focused on AI.
      </p>

      <Reveal>
        <div className="degree-grid">
          {degrees.map((d) => (
            <div key={d.school} className="degree-card">
              <h2>{d.school}</h2>
              <p className="degree-name">{d.degree}</p>
              <p className="degree-date">{d.date}</p>
              {d.note && <p className="degree-note">{d.note}</p>}
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="content-card">
          <div className="section-head">
            <h2>In progress</h2>
            <span>{inProgressTerm}</span>
          </div>
          <CourseList courses={inProgress} />

          <div className="section-head">
            <h2>Graduate coursework</h2>
            <span>Georgia Tech — M.S. Computer Science, AI emphasis</span>
          </div>
          <CourseList courses={graduateCoursework} />

          <div className="section-head">
            <h2>Undergraduate coursework</h2>
            <span>Toward the B.S. in Computer Science</span>
          </div>
          <CourseGroups groups={undergraduateCoursework} />
        </div>
      </Reveal>
    </>
  );
}
