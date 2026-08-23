import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <>
      <h1>404</h1>
      <div className="content-card" style={{ textAlign: 'center' }}>
        <p className="intro-text">That page is sold out too.</p>
        <Link className="btn" to="/">
          Back home
        </Link>
      </div>
    </>
  );
}
