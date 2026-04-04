export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene definitions - frames at 30fps
export const SCENES = {
  newspaper: { from: 0, duration: 540 },        // 0:00 - 0:18 (18s)
  radarLogo: { from: 540, duration: 90 },        // 0:18 - 0:21 (3s)
  hookText: { from: 630, duration: 120 },         // 0:21 - 0:25 (4s)
  liveCascade: { from: 750, duration: 900 },      // 0:25 - 0:55 (30s)
  eventDetail: { from: 1650, duration: 750 },     // 0:55 - 1:20 (25s)
  tinyFishAgent: { from: 2400, duration: 900 },   // 1:20 - 1:50 (30s)
  close: { from: 3300, duration: 300 },            // 1:50 - 2:00 (10s)
} as const;

export const TOTAL_FRAMES = 3600; // 2:00 at 30fps

// Helper to convert seconds to frames
export const sec = (s: number) => Math.round(s * FPS);
