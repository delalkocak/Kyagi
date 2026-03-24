import React, { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Fade in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close with fade-out
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  // Tap on gray background (only at 1x zoom) to close
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const overlay = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 99999,
        width: "100vw",
        height: "100dvh",
        background: "rgba(44, 46, 58, 0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        opacity: closing ? 0 : visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
        touchAction: "none",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="Close photo viewer"
        className="absolute z-[100001] w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors"
        style={{
          top: "calc(16px + env(safe-area-inset-top, 0px))",
          right: 16,
          background: "hsl(350 59% 30%)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(350 59% 25%)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "hsl(350 59% 30%)")}
      >
        <X size={20} color="#FEFCF6" strokeWidth={2.5} />
      </button>

      {/* Zoom/Pan wrapper */}
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={3}
        doubleClick={{ mode: "toggle", step: 1 }}
        panning={{ disabled: false, velocityDisabled: false }}
        wheel={{ step: 0.1 }}
        alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
        velocityAnimation={{ sensitivity: 1 }}
      >
        {({ instance }) => (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ zIndex: 100000 }}
            onClick={(e) => {
              if ((instance.transformState?.scale ?? 1) <= 1) {
                handleBackgroundClick(e);
              }
            }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={src}
                alt=""
                draggable={false}
                className="select-none"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  willChange: "transform",
                }}
              />
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
