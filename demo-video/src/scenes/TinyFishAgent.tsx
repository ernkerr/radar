import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";

export const TinyFishAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        background: "#0a0a0a",
        position: "relative",
        overflow: "hidden",
        opacity: fadeIn,
      }}
    >
      {/* Placeholder for TinyFish agent footage */}
      {/* <Video src={staticFile("footage/05-tinyfish.mp4")} /> */}

      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a, #1a1a2e)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: '-apple-system, sans-serif',
            color: "#666",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>
            [ Screen Recording: TinyFish Agent Executing Actions ]
          </div>
          <div style={{ fontSize: 14, color: "#444" }}>
            Replace with footage/05-tinyfish.mp4 after capture
          </div>
        </div>
      </div>

      {/* Key narrative overlays */}
      <TextOverlay
        text="Every company uses different software"
        enterFrame={60}
        exitFrame={240}
        position="bottom-left"
      />
      <TextOverlay
        text="No APIs needed"
        enterFrame={270}
        exitFrame={450}
        position="bottom-left"
      />
      <TextOverlay
        text="TinyFish navigates any system"
        enterFrame={480}
        exitFrame={720}
        position="bottom-left"
        style="emphasis"
      />
    </div>
  );
};
