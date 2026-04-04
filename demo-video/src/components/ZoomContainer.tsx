import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export interface ZoomKeyframe {
  frame: number;
  scale: number;
  translateX: number;
  translateY: number;
}

interface ZoomContainerProps {
  children: React.ReactNode;
  keyframes: ZoomKeyframe[];
  width: number;
  height: number;
}

export const ZoomContainer: React.FC<ZoomContainerProps> = ({
  children,
  keyframes,
  width,
  height,
}) => {
  const frame = useCurrentFrame();

  const frames = keyframes.map((k) => k.frame);
  const scales = keyframes.map((k) => k.scale);
  const xs = keyframes.map((k) => k.translateX);
  const ys = keyframes.map((k) => k.translateY);

  const easing = Easing.bezier(0.25, 0.1, 0.25, 1);

  const scale = interpolate(frame, frames, scales, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const translateX = interpolate(frame, frames, xs, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const translateY = interpolate(frame, frames, ys, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
};
