import { useEffect, useState } from 'react';

export type Release = { url: string; version: string; sizeMB: number };

export const RELEASES_PAGE = 'https://github.com/ShankyShako/LegacyScribe/releases/latest';
const API = 'https://api.github.com/repos/ShankyShako/LegacyScribe/releases/latest';

/* One request per page load, shared by the hero and the footer. */
let pending: Promise<Release | null> | null = null;

function fetchLatest(): Promise<Release | null> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 4000);
  return fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j) return null;
      /* The disk image (drag to Applications) when the release has one; the zip otherwise. */
      type Asset = { name: string; size: number; browser_download_url: string };
      const assets: Asset[] = j.assets ?? [];
      const asset =
        assets.find((a) => /^LegacyScribe-.*\.dmg$/.test(a.name)) ??
        assets.find((a) => /^LegacyScribe-.*\.zip$/.test(a.name));
      if (!asset || typeof j.tag_name !== 'string') return null;
      return {
        url: asset.browser_download_url,
        version: j.tag_name.replace(/^v/, ''),
        sizeMB: Math.round(asset.size / 1e6),
      };
    })
    .catch(() => {
      pending = null;
      return null;
    })
    .finally(() => window.clearTimeout(timer));
}

/** Latest GitHub release's zip, or `null` while loading or if the lookup failed. */
export function useLatestRelease(): Release | null {
  const [release, setRelease] = useState<Release | null>(null);
  useEffect(() => {
    let alive = true;
    pending ??= fetchLatest();
    pending.then((r) => {
      if (alive) setRelease(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  return release;
}
