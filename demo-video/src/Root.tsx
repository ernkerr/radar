import React from "react";
import { Composition } from "remotion";
import { DemoVideo } from "./compositions/DemoVideo";
import { Newspaper } from "./scenes/Newspaper";
import { RadarLogo } from "./scenes/RadarLogo";
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./lib/timing";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full demo video */}
      <Composition
        id="RadarDemo"
        component={DemoVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Individual scenes for preview */}
      <Composition
        id="Newspaper"
        component={Newspaper}
        durationInFrames={540}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="RadarLogo"
        component={RadarLogo}
        durationInFrames={90}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
