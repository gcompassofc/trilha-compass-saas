import React from 'react';

type IconProps = { size?: number };

const wrap = (paths: React.ReactNode, size = 18, sw = 1.75) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

export const Icon = {
  Compass: ({ size = 22 }: IconProps) => wrap(
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16,8 13.5,13.5 8,16 10.5,10.5" fill="currentColor" stroke="none" />
    </>, size, 1.5,
  ),
  Home: ({ size = 20 }: IconProps) => wrap(
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </>, size,
  ),
  Calendar: ({ size = 20 }: IconProps) => wrap(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>, size,
  ),
  Users: ({ size = 20 }: IconProps) => wrap(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M21.5 20a6.5 6.5 0 0 0-3.5-5.6" />
    </>, size,
  ),
  ChevDown: ({ size = 16 }: IconProps) => wrap(
    <path d="m6 9 6 6 6-6" />, size, 2,
  ),
  ChevLeft: ({ size = 16 }: IconProps) => wrap(
    <path d="m15 6-6 6 6 6" />, size, 2,
  ),
  ChevRight: ({ size = 16 }: IconProps) => wrap(
    <path d="m9 6 6 6-6 6" />, size, 2,
  ),
  Check: ({ size = 18 }: IconProps) => wrap(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>, size,
  ),
  Clock: ({ size = 18 }: IconProps) => wrap(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>, size,
  ),
  User: ({ size = 18 }: IconProps) => wrap(
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>, size,
  ),
  X: ({ size = 16 }: IconProps) => wrap(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>, size,
  ),
  Flame: ({ size = 16 }: IconProps) => wrap(
    <path d="M12 3c.5 4 4 5 4 9a4 4 0 1 1-8 0c0-1.5.6-2.4 1.4-3.2C8 11 8 8 12 3Z" />, size,
  ),
  Sparkle: ({ size = 16 }: IconProps) => wrap(
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />, size, 2,
  ),
  Trophy: ({ size = 18 }: IconProps) => wrap(
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" />
      <path d="M9 14v3h6v-3M7 20h10" />
    </>, size,
  ),
  Target: ({ size = 22 }: IconProps) => wrap(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>, size, 1.6,
  ),
  Zap: ({ size = 16 }: IconProps) => wrap(
    <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />, size,
  ),
  List: ({ size = 14 }: IconProps) => wrap(
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />, size, 2,
  ),
  Folder: ({ size = 14 }: IconProps) => wrap(
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />, size,
  ),
  Plus: ({ size = 14 }: IconProps) => wrap(
    <path d="M12 5v14M5 12h14" />, size, 2,
  ),
  Grip: ({ size = 14 }: IconProps) => wrap(
    <>
      <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>, size,
  ),
  Trash: ({ size = 14 }: IconProps) => wrap(
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>, size,
  ),
  Edit: ({ size = 14 }: IconProps) => wrap(
    <>
      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
      <path d="M14 5l4 4" />
    </>, size,
  ),
  AlertTriangle: ({ size = 14 }: IconProps) => wrap(
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="17.5" r="0.7" fill="currentColor" stroke="none" />
    </>, size,
  ),
  Play: ({ size = 12 }: IconProps) => wrap(
    <path d="M7 4v16l13-8L7 4Z" fill="currentColor" stroke="none" />, size,
  ),
};
