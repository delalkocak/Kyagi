import React from "react";

export const promptIcons: Record<string, (c: string) => React.ReactNode> = {
  // v2 prompt icons
  flower: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>✿</span>,
  arrow: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>→</span>,
  quest: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>?</span>,
  sparkle: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>✦</span>,
  book: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>▯</span>,
  // Legacy icons (kept for old data compatibility)
  sun: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>✿</span>,
  note: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>♪</span>,
  spark: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>✦</span>,
  lens: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>◉</span>,
  star: (c) => <span style={{ fontSize: 10, color: c, opacity: 0.9 }}>★</span>,
};

export const HeartIcon = ({ filled, size = 16, color }: { filled: boolean; size?: number; color?: string }) => {
  const c = filled ? "#D93D12" : "#B8C4D8";
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? c : "none"} stroke={c} strokeWidth="1.6">
      <path d="M10 17s-7-4.35-7-8.5A3.5 3.5 0 0110 5.97 3.5 3.5 0 0117 8.5C17 12.65 10 17 10 17z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export const PlusIcon = ({ size = 20, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M10 4v12M4 10h12"/>
  </svg>
);

export const CameraIcon = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

export const VideoIcon = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);

export const LinkIcon = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);

export const XIcon = ({ size = 18, color = "#8A8A96" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 5l10 10M15 5L5 15"/>
  </svg>
);

export const FlipIcon = ({ size = 20, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115.36-6.36L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15.36 6.36L3 16"/>
  </svg>
);
