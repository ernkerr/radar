import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const CYAN = "#1E96FC";

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Checklist complete text
  const checkOpacity = interpolate(frame, [0, 20, 80, 100], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  // Logo reappears
  const logoOpacity = interpolate(frame, [100, 130], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = spring({
    frame: Math.max(0, frame - 100),
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Tagline
  const taglineOpacity = interpolate(frame, [160, 190], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Final fade to black
  const fadeOut = interpolate(frame, [260, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* "All requirements addressed" */}
      <div
        style={{
          position: "absolute",
          opacity: checkOpacity * fadeOut,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, color: "#22c55e", marginBottom: 8 }}>
          ✓
        </div>
        <div style={{ fontSize: 24, color: "#22c55e", fontWeight: 500 }}>
          All requirements addressed — ready for clearance
        </div>
      </div>

      {/* Logo + tagline */}
      <div
        style={{
          position: "absolute",
          opacity: logoOpacity * fadeOut,
          transform: `scale(${interpolate(logoScale, [0, 1], [0.8, 1])})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            letterSpacing: 8,
            marginBottom: 16,
            textShadow: `0 0 30px ${CYAN}40`,
          }}
        >
          RADAR
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: "white",
            opacity: taglineOpacity,
            letterSpacing: 2,
          }}
        >
          Regulatory compliance on autopilot.
        </div>
        <div
          style={{
            fontSize: 14,
            color: CYAN,
            opacity: taglineOpacity,
            marginTop: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Powered by TinyFish Web Agent API
        </div>
      </div>
    </div>
  );
};
