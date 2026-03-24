import React, { useState } from "react";
import { Link, X } from "lucide-react";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;
    const secondLast = parts[parts.length - 2];
    const common = ["co", "com", "org", "net", "gov", "ac", "edu"];
    if (common.includes(secondLast) && parts.length >= 3) return parts.slice(-3).join(".");
    return parts.slice(-2).join(".");
  } catch {
    return url;
  }
}

function ImagePlaceholder() {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 56,
        height: 56,
        borderRadius: 6,
        background: "#D4DAE8",
      }}
    >
      <Link size={20} color="#8090AC" />
    </div>
  );
}

export function LinkPreviewSkeleton() {
  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        background: "#FEFCF6",
        border: "0.5px solid #D4DAE8",
        borderRadius: 10,
        padding: "10px 12px",
        minHeight: 56,
        width: "100%",
      }}
    >
      <div
        className="flex-shrink-0 animate-pulse"
        style={{
          width: 56,
          height: 56,
          borderRadius: 6,
          background: "#D4DAE8",
          animationDuration: "1.5s",
        }}
      />
      <div className="flex-1 flex flex-col gap-2">
        <div
          className="animate-pulse"
          style={{
            height: 10,
            width: "70%",
            borderRadius: 4,
            background: "#D4DAE8",
            animationDuration: "1.5s",
          }}
        />
        <div
          className="animate-pulse"
          style={{
            height: 8,
            width: "40%",
            borderRadius: 4,
            background: "#D4DAE8",
            animationDuration: "1.5s",
            animationDelay: "0.2s",
          }}
        />
      </div>
    </div>
  );
}

interface LinkPreviewCardProps {
  data: LinkPreviewData;
  onDismiss?: () => void;
  isFeed?: boolean;
}

export function LinkPreviewCard({ data, onDismiss, isFeed }: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const siteName = data.site_name || extractDomain(data.url);
  const title = data.title || data.url;

  const cardContent = (
    <div
      className="flex items-center gap-2.5 relative"
      style={{
        background: "#FEFCF6",
        border: "0.5px solid #D4DAE8",
        borderRadius: 10,
        padding: "10px 12px",
        minHeight: 56,
        width: "100%",
        position: "relative",
      }}
    >
      {/* Thumbnail */}
      {data.image_url && !imgError ? (
        <img
          src={data.image_url}
          alt=""
          onError={() => setImgError(true)}
          className="flex-shrink-0 object-cover"
          style={{ width: 56, height: 56, borderRadius: 6 }}
        />
      ) : (
        <ImagePlaceholder />
      )}

      {/* Text */}
      <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: 2 }}>
        <div
          className="font-sans truncate"
          style={{ fontSize: 13, fontWeight: 500, color: "#2C2E3A", lineHeight: "16px" }}
        >
          {title}
        </div>
        {data.description && (
          <div
            className="font-sans truncate"
            style={{ fontSize: 11, color: "#8090AC", lineHeight: "14px" }}
          >
            {data.description}
          </div>
        )}
        <div
          className="font-sans"
          style={{ fontSize: 11, color: "#8090AC", lineHeight: "14px" }}
        >
          {siteName}
        </div>
      </div>

      {/* Dismiss button (compose only) */}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="flex items-center justify-center border-0 cursor-pointer transition-colors"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "transparent",
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#F4EDD8")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <X size={12} color="#8090AC" />
        </button>
      )}
    </div>
  );

  if (isFeed) {
    return (
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline mt-2.5"
        style={{ textDecoration: "none" }}
      >
        {cardContent}
      </a>
    );
  }

  return <div className="mt-2">{cardContent}</div>;
}
