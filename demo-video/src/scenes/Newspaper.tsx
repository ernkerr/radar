import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

// ============================================================
// NEWSPAPER FRONT PAGE — modeled after real broadsheet layout
// Dense 6-column grid, photos, varied headlines, column rules
// ============================================================

const NP_W = 2400;
const NP_H = 3200;
const MARGIN = 48;
const COL_GAP = 20;
const COL_COUNT = 6;
const COL_W = (NP_W - MARGIN * 2 - COL_GAP * (COL_COUNT - 1)) / COL_COUNT;
const colX = (i: number) => MARGIN + i * (COL_W + COL_GAP);
const colSpan = (n: number) => COL_W * n + COL_GAP * (n - 1);

// Filler body text generator
const FILLER = "Officials confirmed the findings late yesterday, noting that enforcement actions would be escalated in the coming weeks. Industry representatives declined to comment on the record, though several privately acknowledged systemic failures in the current regulatory framework. The matter has been referred to the appropriate federal authorities for further investigation and potential criminal proceedings.";
const FILLER2 = "Sources within the administration said the new measures were long overdue, citing years of documented violations that had gone largely unenforced. Consumer advocacy groups praised the move but cautioned that meaningful reform would require sustained pressure and significantly increased funding for inspection programs.";
const FILLER3 = "The investigation revealed a complex network of intermediaries and shell companies used to circumvent import restrictions. Customs officials said the scheme had been operating for at least three years before detection, involving forged documentation and falsified country-of-origin certificates.";

// --- PHOTO PLACEHOLDER ---
const Photo: React.FC<{
  width: number;
  height: number;
  caption: string;
  credit?: string;
}> = ({ width, height, caption, credit }) => (
  <div style={{ width, marginBottom: 6 }}>
    <div
      style={{
        width,
        height,
        background: "linear-gradient(135deg, #c8c0b0, #a89880, #c8c0b0)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Cross-hatch to suggest photo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 8px,
            rgba(0,0,0,0.04) 8px,
            rgba(0,0,0,0.04) 9px
          )`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.15), transparent 60%)",
        }}
      />
    </div>
    <div
      style={{
        fontSize: 11,
        lineHeight: 1.3,
        color: "#444",
        marginTop: 4,
        fontStyle: "italic",
      }}
    >
      {caption}
      {credit && (
        <span style={{ color: "#888", fontSize: 10 }}> ({credit})</span>
      )}
    </div>
  </div>
);

// --- COLUMN RULE ---
const ColRule: React.FC<{ x: number; top: number; height: number }> = ({
  x,
  top,
  height,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - COL_GAP / 2,
      top,
      width: 1,
      height,
      background: "#bbb",
    }}
  />
);

// --- HORIZONTAL RULE ---
const HRule: React.FC<{
  x: number;
  y: number;
  width: number;
  weight?: number;
}> = ({ x, y, width: w, weight = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: weight,
      background: "#1a1a1a",
    }}
  />
);

// --- BODY TEXT ---
const BodyText: React.FC<{
  text: string;
  columns?: number;
  fontSize?: number;
}> = ({ text, columns = 1, fontSize = 13 }) => (
  <div
    style={{
      fontSize,
      lineHeight: 1.55,
      color: "#222",
      columnCount: columns,
      columnGap: COL_GAP,
      textAlign: "justify",
      hyphens: "auto",
    }}
  >
    {text}
  </div>
);

// ============================================================
// NEWSPAPER PAGE
// ============================================================
const NewspaperPage: React.FC = () => {
  const topBarY = 10;
  const mastheadY = 40;
  const dateLineY = 120;
  const bannerY = 155;
  const contentStartY = 290;

  return (
    <div
      style={{
        width: NP_W,
        height: NP_H,
        background: "#f0ebe0",
        fontFamily: '"Georgia", "Times New Roman", "Times", serif',
        color: "#1a1a1a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Paper texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.008) 1px, rgba(0,0,0,0.008) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.005) 1px, rgba(0,0,0,0.005) 2px)
          `,
          pointerEvents: "none",
        }}
      />

      {/* ===== TOP BAR ===== */}
      <div
        style={{
          position: "absolute",
          top: topBarY,
          left: MARGIN,
          fontSize: 10,
          color: "#666",
          lineHeight: 1.4,
        }}
      >
        Partly cloudy,
        <br />
        High 72, Low 58
      </div>
      <div
        style={{
          position: "absolute",
          top: topBarY,
          right: MARGIN,
          fontSize: 10,
          color: "#666",
          textAlign: "right",
          lineHeight: 1.4,
        }}
      >
        Paid Circulation
        <br />
        DAILY 245,800
        <br />
        Price Per Copy 35c
      </div>

      {/* ===== MASTHEAD ===== */}
      <div
        style={{
          position: "absolute",
          top: mastheadY,
          left: 0,
          width: NP_W,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#888",
            marginBottom: 4,
          }}
        >
          ★ ★ ★ ★ ★
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: 4,
            lineHeight: 1,
            fontFamily: '"Georgia", "Times New Roman", serif',
            textTransform: "uppercase",
          }}
        >
          The Seafood Monitor
        </div>
      </div>

      {/* ===== DATE LINE ===== */}
      <HRule x={MARGIN} y={dateLineY - 4} width={NP_W - MARGIN * 2} weight={2} />
      <div
        style={{
          position: "absolute",
          top: dateLineY,
          left: MARGIN,
          right: MARGIN,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          letterSpacing: 1,
          padding: "4px 0",
        }}
      >
        <span>VOL. CXII NO. 84 — DAILY</span>
        <span style={{ fontWeight: 700, letterSpacing: 3 }}>
          ★★★★ FINAL EDITION ★★★★
        </span>
        <span>TUESDAY, MARCH 25, 2026</span>
      </div>
      <HRule x={MARGIN} y={dateLineY + 24} width={NP_W - MARGIN * 2} weight={1} />

      {/* ===== BANNER HEADLINE — full width ===== */}
      <div
        style={{
          position: "absolute",
          top: bannerY,
          left: MARGIN,
          right: MARGIN,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: -1,
            fontFamily: '"Georgia", serif',
            textTransform: "uppercase",
          }}
        >
          One-Third of U.S. Seafood
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: -1,
            fontFamily: '"Georgia", serif',
            textTransform: "uppercase",
          }}
        >
          Found to Be Mislabeled
        </div>
      </div>

      <HRule x={MARGIN} y={contentStartY - 8} width={NP_W - MARGIN * 2} weight={3} />

      {/* ===== COLUMNS 0-1: Oceana Study (left 2 cols) ===== */}
      <div
        style={{
          position: "absolute",
          top: contentStartY,
          left: colX(0),
          width: colSpan(2),
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 4,
          }}
        >
          Oceana Study Tests
          <br />
          1,215 Samples in 21 States;
          <br />
          Snapper Fraud at 87%
        </div>
        <div
          style={{
            fontSize: 14,
            fontStyle: "italic",
            color: "#555",
            marginBottom: 8,
            borderBottom: "1px solid #ccc",
            paddingBottom: 6,
          }}
        >
          DNA analysis reveals only 7 of 120 &lsquo;red snapper&rsquo; samples
          genuine nationwide
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          By STAFF REPORTER
        </div>
        <BodyText
          text={`WASHINGTON, March 24 — A sweeping investigation by the ocean conservation group Oceana has revealed that 33 percent of seafood sold in American restaurants and grocery stores is fraudulently mislabeled, according to DNA testing results released today.\n\nThe investigation, the largest of its kind ever conducted in the United States, tested more than 1,200 samples collected from 674 retail outlets across 21 states over a two-year period. ${FILLER}\n\n${FILLER2}`}
          columns={2}
        />
      </div>

      {/* ===== COLUMN 2-3: 138 Shipments Refused + Photo ===== */}
      <div
        style={{
          position: "absolute",
          top: contentStartY,
          left: colX(2),
          width: colSpan(2),
        }}
      >
        <Photo
          width={colSpan(2)}
          height={280}
          caption="FDA inspectors examine a container of imported frozen shrimp at the Port of Long Beach. The agency refused 138 seafood shipment lines in February alone."
          credit="Associated Press"
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 10,
            marginBottom: 6,
          }}
        >
          138 Seafood Shipments
          <br />
          Refused at U.S. Border
          <br />
          In a Single Month
        </div>
        <div
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "#555",
            marginBottom: 6,
          }}
        >
          FDA February report cites banned antibiotics; Indonesia largest
          source of refusals
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          By REGULATORY CORRESPONDENT
        </div>
        <BodyText
          text={`WASHINGTON, March 24 — The Food and Drug Administration refused entry to 138 seafood shipment lines in February alone, citing the presence of banned antibiotics including nitrofurans and chloramphenicol, according to the agency's monthly import refusal report.\n\nIndonesia emerged as the largest source of rejected shrimp imports, accounting for 8 of 14 antibiotic-related refusals. The country has already matched its total antibiotic refusals recorded between 2016 and 2024 combined in just the first two months of this year. ${FILLER3}`}
          columns={2}
        />
      </div>

      {/* ===== COLUMNS 4-5: Right side ===== */}
      {/* Top right: "President Says" style sidebar */}
      <div
        style={{
          position: "absolute",
          top: contentStartY,
          left: colX(4),
          width: colSpan(2),
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 6,
          }}
        >
          Indonesian Shrimp
          <br />
          Recalled Over
          <br />
          Radioactive
          <br />
          Contamination
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          CBP Detects Cesium-137
        </div>
        <BodyText
          text={`LONG BEACH, Calif., March 23 — U.S. Customs and Border Protection detected radioactive Cesium-137 in Indonesian shrimp imports during routine screening, triggering an immediate FDA recall of affected products distributed to retailers and food service companies nationwide.\n\nThe contamination was identified during enhanced inspection protocols implemented earlier this year. ${FILLER2}`}
          columns={2}
        />
      </div>

      {/* Column rules for top section */}
      <ColRule x={colX(2)} top={contentStartY} height={680} />
      <ColRule x={colX(4)} top={contentStartY} height={680} />

      {/* ===== MIDDLE SECTION — below fold ===== */}
      {/* Full-width rule */}
      <HRule x={MARGIN} y={980} width={NP_W - MARGIN * 2} weight={2} />

      {/* Cols 0-1: $15M Smuggling Ring */}
      <div
        style={{
          position: "absolute",
          top: 1000,
          left: colX(0),
          width: colSpan(2),
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 4,
          }}
        >
          $15M Seafood Smuggling
          <br />
          Ring Busted; 6 Indicted
          <br />
          In New England Probe
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Associated Press
        </div>
        <BodyText
          text={`BOSTON, March 22 — Federal prosecutors today announced the indictment of six individuals in connection with a $15 million seafood smuggling operation that systematically sold cheap imported fish as premium domestic catches while evading country-of-origin labeling requirements.\n\nThe scheme, which operated through a network of distributors across the northeastern United States, involved the relabeling of foreign-caught fish as locally harvested product. ${FILLER}`}
          columns={2}
        />
      </div>

      {/* Cols 2-3: Photo + Certified Processors */}
      <div
        style={{
          position: "absolute",
          top: 1000,
          left: colX(2),
          width: colSpan(2),
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          78% of Rejected Shrimp
          <br />
          Came From &lsquo;Certified&rsquo;
          <br />
          Processors, Report Finds
        </div>
        <div
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "#555",
            marginBottom: 8,
          }}
        >
          BAP certification questioned after FDA findings
        </div>
        <Photo
          width={colSpan(2)}
          height={220}
          caption="A worker sorts shrimp at a processing facility in Indonesia. Nearly four in five shipments rejected for banned antibiotics originated from BAP-certified plants."
          credit="Reuters"
        />
        <div style={{ marginTop: 8 }}>
          <BodyText
            text={`Nearly four in five shrimp shipments refused by the FDA for banned antibiotics in early 2026 originated from processors certified under the Best Aquaculture Practices program, raising fundamental questions about the efficacy of industry self-regulation.\n\n${FILLER2}`}
            columns={2}
          />
        </div>
      </div>

      {/* Cols 4-5: Sidebar stories */}
      <div
        style={{
          position: "absolute",
          top: 1000,
          left: colX(4),
          width: colSpan(2),
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          87% of &lsquo;Red Snapper&rsquo;
          <br />
          Is Not Red Snapper,
          <br />
          DNA Study Confirms
        </div>
        <BodyText
          text={`Of 120 samples purchased as red snapper at restaurants and grocery stores nationwide, DNA analysis confirmed only 7 were genuine. Consumers are routinely paying premium prices for cheap substitutes including tilapia, rockfish, and tilefish. The findings were described as "staggering" by food safety advocates.`}
        />

        <HRule x={0} y={0} width={colSpan(2)} weight={1} />
        <div
          style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: "1px solid #ccc",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            Salmonella Outbreak
            <br />
            Linked to Frozen Tuna;
            <br />
            62 Ill in 11 States
          </div>
          <BodyText
            text={`The FDA ordered a nationwide recall of frozen raw tuna distributed to restaurants and grocery stores after an outbreak of Salmonella Paratyphi B was confirmed in at least 62 individuals across 11 states. Osamu Corporation issued a voluntary recall of all affected product.`}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #ccc",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            NOAA Fines Blue Harvest
            <br />
            $1M for Quota Violations
          </div>
          <BodyText
            text={`Blue Harvest Fisheries, one of the largest fishing companies in the Northeast, was assessed penalties exceeding $1 million for systematically misreporting catch data and exceeding groundfish quotas.`}
            fontSize={12}
          />
        </div>
      </div>

      {/* Column rules for middle section */}
      <ColRule x={colX(2)} top={1000} height={700} />
      <ColRule x={colX(4)} top={1000} height={700} />

      {/* ===== BOTTOM SECTION ===== */}
      <HRule x={MARGIN} y={1720} width={NP_W - MARGIN * 2} weight={2} />

      {/* Bottom banner */}
      <div
        style={{
          position: "absolute",
          top: 1740,
          left: MARGIN,
          right: MARGIN,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.15,
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Importers Face Mounting Compliance Crisis as FDA Tightens Enforcement
        </div>
        <div
          style={{
            fontSize: 14,
            fontStyle: "italic",
            textAlign: "center",
            color: "#555",
            marginBottom: 12,
          }}
        >
          New regulations require real-time monitoring of supply chain
          documentation; industry warns of &ldquo;impossible burden&rdquo;
        </div>
      </div>

      {/* Bottom body — 3 columns spanning full width */}
      <div
        style={{
          position: "absolute",
          top: 1840,
          left: MARGIN,
          width: NP_W - MARGIN * 2,
        }}
      >
        <BodyText
          text={`WASHINGTON, March 24 — The seafood import industry is confronting what executives describe as a mounting compliance crisis, as the Food and Drug Administration accelerates enforcement actions under the Seafood Import Monitoring Program and new country-of-origin labeling requirements take effect this quarter.\n\nThe new regulations, which expand SIMP coverage to additional species including Atlantic cod, require importers to maintain auditable chain-of-custody documentation from point of harvest through final sale. Companies that fail to produce compliant records face immediate shipment detention and potential debarment from the import program.\n\n${FILLER} ${FILLER2} ${FILLER3}\n\nIndustry groups have lobbied for an extended compliance timeline, arguing that the current requirements impose an "impossible burden" on small and medium importers who lack the technical infrastructure to implement real-time supply chain monitoring across their global supplier networks.`}
          columns={4}
        />
      </div>

      {/* Additional column rules for bottom */}
      <ColRule x={colX(1)} top={contentStartY} height={680} />
      <ColRule x={colX(3)} top={contentStartY} height={680} />
      <ColRule x={colX(5)} top={contentStartY} height={680} />
      <ColRule x={colX(1)} top={1000} height={700} />
      <ColRule x={colX(3)} top={1000} height={700} />
      <ColRule x={colX(5)} top={1000} height={700} />
    </div>
  );
};

// ============================================================
// SCANNING ANIMATION — fast, energetic, snap to each headline
// ============================================================

interface ScanKeyframe {
  frame: number;
  x: number;
  y: number;
  scale: number;
}

// Newspaper is 2400x3200, centered in 1920x1080 viewport.
// To center a point (px,py) at a given scale:
//   tx = (NP_W/2 - px) * scale = (1200 - px) * scale
//   ty = (NP_H/2 - py) * scale = (1600 - py) * scale

const centerOn = (
  px: number,
  py: number,
  scale: number
): { x: number; y: number; scale: number } => ({
  x: (1200 - px) * scale,
  y: (1600 - py) * scale,
  scale,
});

const SCAN_KEYFRAMES: ScanKeyframe[] = [
  // Start: fast establishing shot
  { frame: 0, ...centerOn(1200, 900, 0.36) },
  { frame: 30, ...centerOn(1200, 900, 0.36) },

  // SNAP to banner headline "One-Third of U.S. Seafood Found to Be Mislabeled"
  { frame: 55, ...centerOn(1200, 220, 0.65) },
  { frame: 105, ...centerOn(1200, 220, 0.65) },

  // SNAP to "138 Shipments Refused" + photo
  { frame: 130, ...centerOn(1130, 450, 0.72) },
  { frame: 185, ...centerOn(1130, 450, 0.72) },

  // SNAP to "Radioactive Contamination" top-right
  { frame: 205, ...centerOn(1900, 420, 0.78) },
  { frame: 255, ...centerOn(1900, 420, 0.78) },

  // SNAP down to "78% Certified Processors"
  { frame: 280, ...centerOn(1130, 1120, 0.72) },
  { frame: 335, ...centerOn(1130, 1120, 0.72) },

  // SNAP to "$15M Smuggling Ring"
  { frame: 355, ...centerOn(400, 1080, 0.78) },
  { frame: 400, ...centerOn(400, 1080, 0.78) },

  // SNAP to bottom banner "Mounting Compliance Crisis"
  { frame: 425, ...centerOn(1200, 1780, 0.62) },
  { frame: 480, ...centerOn(1200, 1780, 0.62) },

  // Zoom out and fade
  { frame: 515, ...centerOn(1200, 1000, 0.30) },
  { frame: 540, ...centerOn(1200, 1000, 0.26) },
];

function interpolateScan(frame: number, keyframes: ScanKeyframe[]) {
  const frames = keyframes.map((k) => k.frame);
  const xs = keyframes.map((k) => k.x);
  const ys = keyframes.map((k) => k.y);
  const scales = keyframes.map((k) => k.scale);

  return {
    x: interpolate(frame, frames, xs, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    y: interpolate(frame, frames, ys, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    scale: interpolate(frame, frames, scales, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  };
}

// ============================================================
// MAIN SCENE EXPORT
// ============================================================

export const Newspaper: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const scan = interpolateScan(frame, SCAN_KEYFRAMES);

  // Quick fade in
  const fadeIn = interpolate(frame, [0, 8], [0.5, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out for transition
  const fadeOut = interpolate(frame, [515, 540], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = fadeIn * fadeOut;

  return (
    <div
      style={{
        width,
        height,
        background: "#0a0a0a",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Newspaper with scanning transform */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translate(${scan.x}px, ${scan.y}px) scale(${scan.scale})`,
          transformOrigin: "center center",
          opacity,
          willChange: "transform",
        }}
      >
        <NewspaperPage />
      </div>

      {/* Vignette — dark edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Warm newsprint tint */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(160, 140, 100, 0.03)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
