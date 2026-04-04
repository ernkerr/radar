import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";

export const EventDetail: React.FC = () => {
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
      {/* Placeholder for event detail footage */}
      {/* <Video src={staticFile("footage/03-event-detail.mp4")} /> */}

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
            [ Screen Recording: Event Detail + Flow Diagram ]
          </div>
          <div style={{ fontSize: 14, color: "#444" }}>
            Replace with footage/03-event-detail.mp4 after Puppeteer capture
          </div>
        </div>
      </div>

      <TextOverlay
        text="Every action mapped. Every entity tracked."
        enterFrame={400}
        exitFrame={700}
        position="bottom-center"
        style="emphasis"
      />
    </div>
  );
};
