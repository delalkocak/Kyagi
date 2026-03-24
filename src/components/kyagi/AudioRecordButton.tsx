import React, { useState, useRef } from "react";
import { colors } from "./data";

interface AudioRecordButtonProps {
  onRecorded: (blob: Blob) => void;
  size?: number;
}

export function AudioRecordButton({ onRecorded, size = 28 }: AudioRecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        onRecorded(blob);
        setDuration(0);
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      // Mic permission denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-1.5">
      {recording && (
        <span className="font-sans text-[9px] font-semibold animate-pulse" style={{ color: colors.accent }}>
          {formatTime(duration)}
        </span>
      )}
      <button
        onClick={recording ? stopRecording : startRecording}
        className="rounded-full flex-shrink-0 flex items-center justify-center border-0 cursor-pointer transition-all"
        style={{
          width: size,
          height: size,
          background: recording ? colors.accent : colors.warmGray,
          color: recording ? "#fff" : colors.textMuted,
        }}
      >
        {recording ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="1" width="8" height="8" rx="1"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="1" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <path d="M12 17v4"/>
          </svg>
        )}
      </button>
    </div>
  );
}
