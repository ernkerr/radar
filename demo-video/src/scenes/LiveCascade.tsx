import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Video,
  staticFile,
  interpolate,
  Easing,
} from "remotion";
import { ZoomContainer } from "../components/ZoomContainer";
import { TextOverlay } from "../components/TextOverlay";

// This scene plays the captured dashboard + simulation cascade footage
// with zoom-ins and text overlays narrating what's happening

export const LiveCascade: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Fade in
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
      {/* Placeholder — replace with actual captured footage */}
      {/* <Video src={staticFile("footage/02-cascade.mp4")} /> */}

      {/* For now, show a placeholder indicating where footage goes */}
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
            [ Screen Recording: Dashboard + Simulation Cascade ]
          </div>
          <div style={{ fontSize: 14, color: "#444" }}>
            Replace with footage/02-cascade.mp4 after Puppeteer capture
          </div>
        </div>
      </div>

      {/* Text overlays narrating what's happening */}
      <TextOverlay
        text="FDA regulation parsed"
        enterFrame={180}
        exitFrame={300}
        position="bottom-left"
      />
      <TextOverlay
        text="Matched to Atlantic Cod products"
        enterFrame={330}
        exitFrame={480}
        position="bottom-left"
      />
      <TextOverlay
        text="2 shipments held, 3 labels flagged"
        enterFrame={510}
        exitFrame={660}
        position="bottom-left"
      />
      <TextOverlay
        text="4 automated actions \u2014 under 3 seconds"
        enterFrame={690}
        exitFrame={870}
        position="bottom-left"
        style="emphasis"
      />
    </div>
  );
};
