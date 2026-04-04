import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const HookText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const textOpacity = interpolate(frame, [0, 20, 90, 120], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const textY = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  const translateY = interpolate(textY, [0, 1], [30, 0]);

  return (
    <div
      style={{
        width,
        height,
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
          padding: "0 200px",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 300,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: "white",
            lineHeight: 1.4,
            letterSpacing: -0.5,
          }}
        >
          What if your system caught it
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: "#1E96FC",
            lineHeight: 1.4,
            letterSpacing: -0.5,
          }}
        >
          before it shipped?
        </div>
      </div>
    </div>
  );
};
