import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <>
      <h1>404</h1>
      <div className="content-card" style={{ textAlign: 'center' }}>
        <p className="intro-text" style={{ maxWidth: 'none' }}>
          That page is sold out too.
        </p>
        <Link className="btn btn-solid" to="/">
          Back home
        </Link>
      </div>
    </>
  );
}
