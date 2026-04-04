import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { Newspaper } from "../scenes/Newspaper";
import { RadarLogo } from "../scenes/RadarLogo";
import { HookText } from "../scenes/HookText";
import { LiveCascade } from "../scenes/LiveCascade";
import { EventDetail } from "../scenes/EventDetail";
import { TinyFishAgent } from "../scenes/TinyFishAgent";
import { Close } from "../scenes/Close";
import { SCENES } from "../lib/timing";

export const DemoVideo: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <div style={{ width, height, background: "#0a0a0a" }}>
      {/* 0:00 - 0:18  |  The newspaper hook — feel the problem */}
      <Sequence
        from={SCENES.newspaper.from}
        durationInFrames={SCENES.newspaper.duration}
      >
        <Newspaper />
      </Sequence>

      {/* 0:18 - 0:21  |  Radar logo — sweep animation */}
      <Sequence
        from={SCENES.radarLogo.from}
        durationInFrames={SCENES.radarLogo.duration}
      >
        <RadarLogo />
      </Sequence>

      {/* 0:21 - 0:25  |  "What if your system caught it before it shipped?" */}
      <Sequence
        from={SCENES.hookText.from}
        durationInFrames={SCENES.hookText.duration}
      >
        <HookText />
      </Sequence>

      {/* 0:25 - 0:55  |  Live demo — simulate cascade */}
      <Sequence
        from={SCENES.liveCascade.from}
        durationInFrames={SCENES.liveCascade.duration}
      >
        <LiveCascade />
      </Sequence>

      {/* 0:55 - 1:20  |  Event detail + flow diagram */}
      <Sequence
        from={SCENES.eventDetail.from}
        durationInFrames={SCENES.eventDetail.duration}
      >
        <EventDetail />
      </Sequence>

      {/* 1:20 - 1:50  |  TinyFish agent executing across systems */}
      <Sequence
        from={SCENES.tinyFishAgent.from}
        durationInFrames={SCENES.tinyFishAgent.duration}
      >
        <TinyFishAgent />
      </Sequence>

      {/* 1:50 - 2:00  |  Close — checklist, logo, tagline */}
      <Sequence
        from={SCENES.close.from}
        durationInFrames={SCENES.close.duration}
      >
        <Close />
      </Sequence>
    </div>
  );
};
