import { useEffect, useRef, useState } from 'react';
import { RELEASES_PAGE, useLatestRelease } from './useLatestRelease';

export const INSTALL_COMMAND = 'curl -fsSL https://gmango.dev/LegacyScribe/install | bash';

/** Dark code block with a Copy button. The `$ ` is a pseudo-element, so it is neither selected nor copied. */
export function InstallBlock() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard denied: the command is selectable in the block above. */
    }
  };

  return (
    <div className="ls-cmd">
      <code>{INSTALL_COMMAND}</code>
      <button type="button" className="ls-copy" onClick={copy} aria-label="Copy install command">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/** Download button, its note line and the Open Anyway explanation. The note's line is always reserved. */
export function DownloadBlock() {
  const release = useLatestRelease();
  return (
    <div className="ls-download">
      <div className="ls-download-row">
        <a className="ls-btn" href={release ? release.url : RELEASES_PAGE}>
          Download for Mac
        </a>
        <span className="ls-note">
          {release
            ? `LegacyScribe ${release.version} · Apple Silicon, macOS 26 or later · ${release.sizeMB} MB`
            : 'Apple Silicon, macOS 26 or later'}
        </span>
      </div>
      <p className="ls-note ls-openanyway">
        The app isn't notarized yet, so macOS blocks a browser download the first time: open it
        once, then System Settings → Privacy &amp; Security → Open Anyway. The curl line checks the
        signature itself and skips that step.
      </p>
    </div>
  );
}
