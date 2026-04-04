import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

// Radar sweep logo animation
// Concentric rings + rotating sweep line that reveals "RADAR" text

const OCEAN_BLUE = "#0A2463";
const CYAN = "#1E96FC";
const DARK_BG = "#0a0a0a";

const RINGS = [
  { radius: 80, opacity: 0.4, strokeWidth: 1 },
  { radius: 140, opacity: 0.25, strokeWidth: 1 },
  { radius: 200, opacity: 0.15, strokeWidth: 1 },
  { radius: 260, opacity: 0.08, strokeWidth: 1 },
];

export const RadarLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2 - 20;

  // Sweep rotation: 0 -> 360 degrees over first 50 frames
  const sweepAngle = interpolate(frame, [0, 50], [0, 360], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // Sweep line opacity — fades in then out
  const sweepOpacity = interpolate(frame, [0, 5, 45, 55], [0, 0.9, 0.9, 0], {
    extrapolateRight: "clamp",
  });

  // Ring pulse — each ring expands slightly when sweep passes
  const ringPulse = (ringIndex: number) => {
    const ringAngleThreshold = (ringIndex * 40) + 20;
    const passed = sweepAngle > ringAngleThreshold;
    if (!passed) return 0;
    const timeSincePassed = frame - (ringAngleThreshold / 360) * 50;
    return interpolate(timeSincePassed, [0, 8, 20], [0, 0.15, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  // Text reveal: "RADAR" letters appear as sweep passes
  const letters = "RADAR".split("");
  const letterSpacing = 56;
  const textStartX = cx - ((letters.length - 1) * letterSpacing) / 2;

  // Subtitle
  const subtitleOpacity = interpolate(frame, [55, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Overall fade in
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glow intensity
  const glowIntensity = interpolate(frame, [0, 25, 50, 70], [0, 1, 0.6, 0.3], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        background: DARK_BG,
        position: "relative",
        overflow: "hidden",
        opacity: fadeIn,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sweep gradient — cone shape */}
          <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0" />
            <stop offset="70%" stopColor={CYAN} stopOpacity="0.3" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.8" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bigGlow">
            <feGaussianBlur stdDeviation="20" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric rings */}
        {RINGS.map((ring, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={ring.radius + ring.radius * ringPulse(i)}
            fill="none"
            stroke={CYAN}
            strokeWidth={ring.strokeWidth}
            opacity={ring.opacity + ringPulse(i)}
          />
        ))}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={CYAN} opacity={0.6} />

        {/* Sweep line */}
        <g
          transform={`rotate(${sweepAngle - 90}, ${cx}, ${cy})`}
          opacity={sweepOpacity}
        >
          {/* Sweep cone / wedge */}
          <path
            d={`M ${cx} ${cy} L ${cx + 280} ${cy - 30} A 280 280 0 0 1 ${cx + 280} ${cy + 30} Z`}
            fill={`url(#sweepGrad)`}
            opacity={0.3}
          />
          {/* Main sweep line */}
          <line
            x1={cx}
            y1={cy}
            x2={cx + 280}
            y2={cy}
            stroke={CYAN}
            strokeWidth={2}
            filter="url(#glow)"
          />
        </g>

        {/* Center glow pulse */}
        <circle
          cx={cx}
          cy={cy}
          r={30}
          fill={CYAN}
          opacity={glowIntensity * 0.1}
          filter="url(#bigGlow)"
        />
      </svg>

      {/* RADAR text */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: letterSpacing - 36,
            marginTop: -20,
          }}
        >
          {letters.map((letter, i) => {
            // Each letter appears as the sweep passes its angular position
            const letterAngle = 180 + (i - 2) * 20; // spread around 180 degrees
            const normalizedAngle = ((letterAngle % 360) + 360) % 360;
            const letterProgress = interpolate(
              sweepAngle,
              [normalizedAngle - 30, normalizedAngle + 10],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            // After sweep, letters stay fully visible
            const finalOpacity = interpolate(
              frame,
              [50, 55],
              [letterProgress, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const letterScale = interpolate(
              letterProgress,
              [0, 0.5, 1],
              [0.7, 1.1, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            return (
              <span
                key={i}
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  color: "white",
                  letterSpacing: 8,
                  opacity: finalOpacity,
                  transform: `scale(${letterScale})`,
                  textShadow:
                    glowIntensity > 0.2
                      ? `0 0 ${20 * glowIntensity}px ${CYAN}`
                      : "none",
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 16,
            fontSize: 16,
            fontWeight: 400,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: CYAN,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: subtitleOpacity,
          }}
        >
          Compliance Command Center
        </div>
      </div>
    </div>
  );
};
