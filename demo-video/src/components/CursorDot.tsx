import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

interface CursorDotProps {
  keyframes: CursorKeyframe[];
  visible?: boolean;
}

export const CursorDot: React.FC<CursorDotProps> = ({
  keyframes,
  visible = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!visible || keyframes.length === 0) return null;

  const frames = keyframes.map((k) => k.frame);
  const xs = keyframes.map((k) => k.x);
  const ys = keyframes.map((k) => k.y);

  const x = interpolate(frame, frames, xs, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(frame, frames, ys, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Check if we're near a click keyframe
  const clickKeyframe = keyframes.find(
    (k) => k.click && Math.abs(frame - k.frame) < 8
  );

  const clickScale = clickKeyframe
    ? interpolate(
        Math.abs(frame - clickKeyframe.frame),
        [0, 4, 8],
        [0.6, 1.4, 1],
        { extrapolateRight: "clamp" }
      )
    : 1;

  const opacity = interpolate(frame, [frames[0], frames[0] + 5], [0, 0.8], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x - 12,
        top: y - 12,
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "rgba(30, 150, 252, 0.4)",
        border: "2px solid rgba(30, 150, 252, 0.8)",
        transform: `scale(${clickScale})`,
        opacity,
        pointerEvents: "none",
        zIndex: 200,
        boxShadow: clickKeyframe
          ? "0 0 20px rgba(30, 150, 252, 0.5)"
          : "none",
      }}
    />
  );
};
