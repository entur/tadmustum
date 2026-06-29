import { SvgIcon } from '@mui/material';
import type { SvgIconProps } from '@mui/material';

// The old landing-page logo was MUI's front-view `DirectionsCar`. This keeps that
// exact car (so the silhouette stays familiar and the frame stays continuous) and
// adds the carpooling story: a tiny passenger behind the windscreen and a
// minimalistic stick-man stepping up to get in.
//
// The car's windscreen is a hole in the silhouette (the avatar background shows
// through it), so the passenger is drawn in `currentColor` to stand out against it.
const CAR_PATH =
  'M18.92 5.01C18.72 4.42 18.16 4 17.5 4h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1' +
  'c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-6.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5' +
  'S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5' +
  '-.67 1.5-1.5 1.5zM5 11l1.5-5.5h11L19 11H5z';

export default function CarpoolIcon(props: SvgIconProps) {
  // Square viewBox cropped around the artwork: it keeps the car + person centred and
  // filling the icon box (a non-square viewBox makes SvgIcon letterbox it off-centre).
  return (
    <SvgIcon viewBox="1.5 1.65 19 19" {...props}>
      {/* Front-view car, shrunk and shifted right to leave room for the person on the left. */}
      <g transform="translate(7.6 3.5) scale(0.6)">
        <path d={CAR_PATH} />
        {/* Tiny stick-man head + neck inside the (dark) windscreen. */}
        <circle cx="14.5" cy="8" r="1.2" fill="none" stroke="currentColor" strokeWidth={1.15} />
        <path
          d="M14.5 9.2 V10.7"
          stroke="currentColor"
          strokeWidth={1.15}
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Future passenger: stick-man (open-ring head) on the left, stepping up to get in. */}
      <circle cx="3.6" cy="8" r="1.2" fill="none" stroke="currentColor" strokeWidth={1.2} />
      <path
        d="M3.6 9.2 V12.8 M3.6 12.8 L2.6 15.8 M3.6 12.8 L4.6 15.8 M3.6 10 L2.5 11.3 M3.6 10 L4.7 11.3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}
