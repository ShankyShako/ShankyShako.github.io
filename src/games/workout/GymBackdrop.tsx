/* The gym behind the lifter: a quiet, flat placeholder drawn in SVG (no stock
   photo). Low contrast on purpose, so the owner's ink drawings pop in front.
   It lives in this one file so a hand-drawn backdrop can replace it later.
   The top-right wall is left empty for the gym TV, which hangs from the
   ceiling strip into that corner. The strip and the corner shade are HTML,
   so they stay on the stage edges however the SVG is cropped. */

const WALL = '#d6cfc2';
const WALL_LOW = '#cbc3b4';
const TRIM = '#a9a194';
const RACK = '#a39b8e';
const RACK_DARK = '#958d80';
const GLASS = '#cdd8d6';
const GLASS_HI = '#d9e2df';
const TURF = '#7aa166';
const TURF_ALT = '#729a5e';

export function GymBackdrop() {
  return (
    <>
      <svg className="wk-backdrop" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        {/* Back wall and a lower band */}
        <rect width="1600" height="600" fill={WALL} />
        <rect y="470" width="1600" height="130" fill={WALL_LOW} />

        {/* Window band, left of centre; the right wall stays clear for the TV */}
        <rect x="250" y="90" width="780" height="300" rx="6" fill={TRIM} />
        <rect x="262" y="102" width="756" height="276" fill={GLASS} />
        <rect x="262" y="102" width="756" height="90" fill={GLASS_HI} />
        {[1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={262 + i * 126 - 4} y="102" width="8" height="276" fill={TRIM} />
        ))}
        <rect x="250" y="384" width="780" height="14" fill={TRIM} />

        {/* Dumbbell rack, left */}
        <g fill={RACK}>
          <rect x="40" y="330" width="14" height="270" />
          <rect x="236" y="330" width="14" height="270" />
          <rect x="40" y="400" width="210" height="10" />
          <rect x="40" y="480" width="210" height="10" />
          <rect x="40" y="560" width="210" height="10" />
        </g>
        <g fill={RACK_DARK}>
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((i) => (
              <g key={`${row}-${i}`}>
                <rect x={66 + i * 44} y={376 + row * 80} width="12" height="24" rx="3" />
                <rect x={86 + i * 44} y={376 + row * 80} width="12" height="24" rx="3" />
                <rect x={74 + i * 44} y={384 + row * 80} width="16" height="8" />
              </g>
            )),
          )}
        </g>

        {/* Squat rack with plates, right */}
        <g fill={RACK}>
          <rect x="1330" y="330" width="16" height="270" />
          <rect x="1500" y="330" width="16" height="270" />
          <rect x="1322" y="330" width="202" height="14" />
          <rect x="1300" y="420" width="250" height="10" rx="5" />
        </g>
        <g fill={RACK_DARK}>
          <circle cx="1295" cy="425" r="46" />
          <circle cx="1555" cy="425" r="46" />
          <rect x="1395" y="470" width="14" height="130" />
          <circle cx="1402" cy="520" r="34" />
          <circle cx="1402" cy="570" r="28" />
        </g>

        {/* Baseboard and turf */}
        <rect y="596" width="1600" height="10" fill={TRIM} />
        <rect y="606" width="1600" height="394" fill={TURF} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} y={606 + i * 80} width="1600" height="40" fill={TURF_ALT} />
        ))}
        <rect y="760" width="1600" height="5" fill="#e9eee2" opacity="0.35" />
      </svg>
      <span className="wk-ceiling" aria-hidden="true" />
      <span className="wk-corner" aria-hidden="true" />
    </>
  );
}
