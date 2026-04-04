import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface TextOverlayProps {
  text: string;
  enterFrame: number;
  exitFrame: number;
  position:
    | "bottom-left"
    | "bottom-right"
    | "bottom-center"
    | "top-left"
    | "top-right"
    | "center";
  style?: "default" | "emphasis";
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  "bottom-left": { bottom: 60, left: 60 },
  "bottom-right": { bottom: 60, right: 60 },
  "bottom-center": { bottom: 60, left: "50%", transform: "translateX(-50%)" },
  "top-left": { top: 60, left: 60 },
  "top-right": { top: 60, right: 60 },
  center: {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
};

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  enterFrame,
  exitFrame,
  position,
  style: textStyle = "default",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Snappy entrance with spring
  const enterProgress = spring({
    frame: Math.max(0, frame - enterFrame),
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  // Hard cut exit (scrappy, not fancy)
  const isVisible = frame >= enterFrame && frame <= exitFrame;

  if (!isVisible) return null;

  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);
  const translateY = interpolate(enterProgress, [0, 1], [12, 0]);

  const isEmphasis = textStyle === "emphasis";

  return (
    <div
      style={{
        position: "absolute",
        ...POSITION_STYLES[position],
        opacity,
        transform: `${POSITION_STYLES[position].transform || ""} translateY(${translateY}px)`.trim(),
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: isEmphasis ? "rgba(30, 150, 252, 0.15)" : "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          padding: "10px 20px",
          borderRadius: 6,
          borderLeft: isEmphasis ? "3px solid #1E96FC" : "none",
        }}
      >
        <span
          style={{
            fontSize: isEmphasis ? 20 : 18,
            fontWeight: isEmphasis ? 600 : 400,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: "white",
            letterSpacing: 0.3,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
