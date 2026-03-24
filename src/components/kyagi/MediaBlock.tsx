import React, { useState, useRef } from "react";
import { colors, PostMedia } from "./data";
import { promptIcons } from "./icons";
import { ImageLightbox } from "./ImageLightbox";

export function PhotoMedia({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const tapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const openLightbox = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (loaded) setLightboxOpen(true);
  };

  // Use touch events directly for reliable mobile taps
  const handleTouchStart = (e: React.TouchEvent) => {
    tapRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!tapRef.current) return;
    const dx = Math.abs(e.changedTouches[0].clientX - tapRef.current.x);
    const dy = Math.abs(e.changedTouches[0].clientY - tapRef.current.y);
    const dt = Date.now() - tapRef.current.time;
    // Only open if it was a tap (not a scroll/swipe)
    if (dx < 15 && dy < 15 && dt < 300) {
      e.stopPropagation();
      e.preventDefault();
      if (loaded) setLightboxOpen(true);
    }
    tapRef.current = null;
  };

  return (
    <>
      <div
        className="mt-2.5 rounded-2xl overflow-hidden shadow-sm cursor-pointer"
        onClick={openLightbox}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!loaded && (
          <div className="aspect-[4/3] flex items-center justify-center" style={{ background: `${colors.border}40` }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin-loader" 
                 style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
          </div>
        )}
        <img src={url} alt="" onLoad={() => setLoaded(true)} 
             className={`w-full aspect-[4/3] object-cover ${loaded ? "block" : "hidden"}`}
             draggable={false} />
      </div>
      {lightboxOpen && <ImageLightbox src={url} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}

export function AudioMedia({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // Create fresh audio element for iOS gesture requirement
      audioRef.current.src = url;
      audioRef.current.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setPlaying(false);
      });
    }
  };

  return (
    <div className="mt-2.5 rounded-xl overflow-hidden p-3 flex items-center gap-3 cursor-pointer"
         style={{ background: `linear-gradient(135deg, ${colors.cobalt}20, ${colors.cobalt}10)`, border: `1px solid ${colors.cobalt}25` }}
         onClick={toggle}>
      <audio ref={audioRef} preload="none"
        onTimeUpdate={() => {
          if (audioRef.current) setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
           style={{ background: playing ? colors.accent : colors.cobalt }}>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff">
            <rect x="2" y="1" width="3" height="10" rx="0.5"/><rect x="7" y="1" width="3" height="10" rx="0.5"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff">
            <polygon points="3,1 11,6 3,11"/>
          </svg>
        )}
      </div>
      <div className="flex-1">
        <div className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>voice note</div>
        <div className="h-1 rounded-full mt-1.5" style={{ background: `${colors.cobalt}20` }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: colors.cobalt }} />
        </div>
      </div>
    </div>
  );
}

export function VideoMediaPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  const handleLoaded = () => setLoaded(true);

  return (
    <div className="mt-2.5 rounded-2xl overflow-hidden shadow-sm">
      {!loaded && (
        <div className="aspect-[4/3] flex items-center justify-center" style={{ background: `${colors.border}40` }}>
          <div className="w-5 h-5 rounded-full border-2 animate-spin-loader" 
               style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
        </div>
      )}
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        onLoadedData={handleLoaded}
        onLoadedMetadata={handleLoaded}
        onError={handleLoaded}
        onCanPlay={handleLoaded}
        className={`w-full max-h-[400px] object-contain ${loaded ? "block" : "hidden"}`}
        style={{ background: "#2C2E3A" }}
      />
    </div>
  );
}

export function VideoMedia({ thumbnail, duration }: { thumbnail: string; duration: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div onClick={() => setPlaying(!playing)} 
         className="mt-2.5 rounded-xl overflow-hidden relative cursor-pointer"
         style={{ background: colors.warmGray }}>
      <img src={thumbnail} alt="" className="w-full h-44 object-cover block" />
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${playing ? "bg-black/5" : "bg-black/25"}`}>
        {!playing ? (
          <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <svg width="16" height="16" viewBox="0 0 16 16" fill={colors.text}><polygon points="4,2 14,8 4,14"/></svg>
          </div>
        ) : (
          <div className="absolute bottom-2.5 left-3 right-3 h-0.5 bg-white/30 rounded-sm">
            <div className="h-full bg-white rounded-sm animate-progress-bar" style={{ width: "35%" }} />
          </div>
        )}
      </div>
      <div className="absolute bottom-2.5 right-3 bg-black/55 rounded-lg px-2 py-0.5 font-sans text-[10px] text-white font-medium">
        {duration}
      </div>
    </div>
  );
}

export function MusicMedia({ artist, title, cover }: { artist: string; title: string; cover: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={() => setExpanded(!expanded)} 
         className="mt-2.5 rounded-xl overflow-hidden p-3 flex items-center gap-3 cursor-pointer relative"
         style={{ background: "linear-gradient(135deg, #2C2418, #4A3728)" }}>
      <img src={cover} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[13px] font-semibold text-white">{title}</div>
        <div className="font-sans text-[11px] text-white/60 mt-0.5">{artist}</div>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
        {expanded ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff">
            <rect x="1" y="1" width="3" height="8" rx="0.5"/>
            <rect x="6" y="1" width="3" height="8" rx="0.5"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff">
            <polygon points="2,1 9,5 2,9"/>
          </svg>
        )}
      </div>
    </div>
  );
}

export function ArticleMedia({ title, source }: { title: string; source: string }) {
  return (
    <div className="mt-2.5 rounded-xl p-3 flex items-center gap-2.5 border"
         style={{ background: colors.warmGray, borderColor: colors.border }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colors.cobalt }}>
        {promptIcons.book(colors.accent)}
      </div>
      <div className="flex-1">
        <div className="font-sans text-xs font-semibold" style={{ color: colors.text }}>{title}</div>
        <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.accent }}>{source}</div>
      </div>
    </div>
  );
}

export function MediaBlock({ media }: { media: PostMedia | null }) {
  if (!media) return null;
  if (media.type === "photo" && media.url) return <PhotoMedia url={media.url} />;
  if (media.type === "video" && media.thumbnail && media.duration) return <VideoMedia thumbnail={media.thumbnail} duration={media.duration} />;
  if (media.type === "music" && media.artist && media.title && media.cover) return <MusicMedia artist={media.artist} title={media.title} cover={media.cover} />;
  if (media.type === "article" && media.title && media.source) return <ArticleMedia title={media.title} source={media.source} />;
  return null;
}
