import type { SVGProps } from 'react';

export type IconName =
  | 'plus'
  | 'settings'
  | 'send'
  | 'sun'
  | 'moon'
  | 'mobile'
  | 'tablet'
  | 'desktop'
  | 'refresh'
  | 'external'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'sidebar'
  | 'sparkle'
  | 'stop'
  | 'comment'
  | 'pencil'
  | 'mic'
  | 'file'
  | 'folder'
  | 'undo'
  | 'check'
  | 'eraser'
  | 'palette'
  | 'user'
  | 'docs'
  | 'search';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, JSX.Element> = {
  plus: (
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.2a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9.2a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.04Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    </>
  ),
  send: (
    <path
      d="M12 19V5M5 12l7-7 7 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  moon: (
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  mobile: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M11 18h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  tablet: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M11 18h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  desktop: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M9 21h6M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  refresh: (
    <path
      d="M21 12a9 9 0 1 1-3.13-6.84M21 3v6h-6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  external: (
    <path
      d="M15 3h6v6M10 14 21 3M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  close: (
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  ),
  'chevron-left': (
    <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  'chevron-right': (
    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  'chevron-down': (
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  sparkle: (
    <path
      d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  stop: (
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
  ),
  comment: (
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  pencil: (
    <>
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  ),
  mic: (
    <>
      <rect
        x="9"
        y="2"
        width="6"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  file: (
    <>
      <path
        d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M13 2v7h7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
    </>
  ),
  folder: (
    <path
      d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  undo: (
    <path
      d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5h-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  check: (
    <path
      d="m5 13 4 4L19 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  eraser: (
    <path
      d="m20 20H7L3 16l9-9 8 8-9 9M14 6l5 5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  palette: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" fill="#faf6ec" />
      <circle cx="8" cy="8" r="2" fill="#d97757" />
      <circle cx="14.5" cy="7.5" r="2" fill="#e0b46c" />
      <circle cx="17" cy="12" r="2" fill="#a8c2a3" />
      <circle cx="15" cy="16.5" r="2" fill="#6b8aa0" />
      <circle cx="9" cy="16" r="2" fill="#c08c8c" />
      <circle cx="11.5" cy="12" r="1.3" fill="#2a2520" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path
        d="M4 21c0-4 4-6 8-6s8 2 8 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  docs: (
    <>
      <path
        d="M6 3h9l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M14 3v5h5M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
};

export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
