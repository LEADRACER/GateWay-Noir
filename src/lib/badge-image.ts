export interface BadgeImageData {
  badgeCode: string;
  displayName: string;
  role: "DETECTIVE" | "AGENT" | "BUREAU";
  stats?: {
    votes?: number;
    comments?: number;
    tasks?: number;
  };
}

function roleConfig(role: string) {
  switch (role) {
    case "BUREAU":
      return {
        accent: "#fbbf24",
        accentDim: "#f59e0b",
        accentGlow: "#fbbf2420",
        accentMuted: "#fbbf2410",
        dept: "BUREAU ADMINISTRATION",
        title: "BUREAU CHIEF",
        seal: "★",
        rank: "EXECUTIVE",
        ribbon: "#b45309",
        ribbonLight: "rgba(180,83,9,0.25)",
        foil1: "#fbbf24",
        foil2: "#f59e0b",
        foil3: "#d97706",
        sealSecondary: "◆",
        borderOuter: "#fbbf24",
        borderInner: "#f59e0b",
      };
    case "AGENT":
      return {
        accent: "#d97706",
        accentDim: "#b45309",
        accentGlow: "#d9770620",
        accentMuted: "#d9770610",
        dept: "FIELD OPERATIONS",
        title: "FIELD AGENT",
        seal: "✦",
        rank: "SPECIAL AGENT",
        ribbon: "#92400e",
        ribbonLight: "rgba(146,64,14,0.25)",
        foil1: "#d97706",
        foil2: "#b45309",
        foil3: "#92400e",
        sealSecondary: "◇",
        borderOuter: "#d97706",
        borderInner: "#b45309",
      };
    default:
      return {
        accent: "#a78bfa",
        accentDim: "#8b5cf6",
        accentGlow: "#a78bfa20",
        accentMuted: "#a78bfa10",
        dept: "BUREAU OF INVESTIGATION",
        title: "DETECTIVE",
        seal: "⚖",
        rank: "INVESTIGATOR",
        ribbon: "#6d28d9",
        ribbonLight: "rgba(109,40,217,0.25)",
        foil1: "#a78bfa",
        foil2: "#8b5cf6",
        foil3: "#7c3aed",
        sealSecondary: "◈",
        borderOuter: "#a78bfa",
        borderInner: "#8b5cf6",
      };
  }
}

export function generateBadgeSVG(data: BadgeImageData): string {
  const cfg = roleConfig(data.role);
  const stats = data.stats || {};
  const statParts: string[] = [];
  if (stats.votes !== undefined) statParts.push(`${stats.votes} VOTES`);
  if (stats.comments !== undefined) statParts.push(`${stats.comments} COMMENTS`);
  if (stats.tasks !== undefined) statParts.push(`${stats.tasks} TASKS`);
  const statLine = statParts.length > 0 ? statParts.join("  •  ") : "";

  const issueDate = "2026-01-01";
  const expiryDate = "2028-12-31";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <!-- Watermark pattern -->
    <pattern id="watermark" patternUnits="userSpaceOnUse" width="50" height="50" patternTransform="rotate(-30)">
      <text x="25" y="30" text-anchor="middle" font-family="'Courier New', monospace" font-size="5" font-weight="bold" fill="${cfg.accent}" opacity="0.025">GATEWAY:NOIR</text>
    </pattern>

    <!-- Hologram foil gradient -->
    <linearGradient id="foil" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.foil1};stop-opacity:0.05" />
      <stop offset="30%" style="stop-color:${cfg.foil2};stop-opacity:0.08" />
      <stop offset="50%" style="stop-color:${cfg.foil1};stop-opacity:0.05" />
      <stop offset="70%" style="stop-color:${cfg.foil3};stop-opacity:0.09" />
      <stop offset="100%" style="stop-color:${cfg.foil2};stop-opacity:0.04" />
    </linearGradient>

    <!-- Foil stripe horizontal -->
    <linearGradient id="foilStripe" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0" />
      <stop offset="20%" style="stop-color:${cfg.accent};stop-opacity:0.07" />
      <stop offset="50%" style="stop-color:${cfg.accent};stop-opacity:0.12" />
      <stop offset="80%" style="stop-color:${cfg.accent};stop-opacity:0.07" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0" />
    </linearGradient>

    <!-- Scanline pattern -->
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.008" />
    </pattern>

    <!-- Crosshatch -->
    <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="0" y1="0" x2="6" y2="6" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.03" />
      <line x1="6" y1="0" x2="0" y2="6" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.03" />
    </pattern>

    <!-- Top glow -->
    <linearGradient id="topGlow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0" />
    </linearGradient>

    <!-- Seal glow radial -->
    <radialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.12" />
      <stop offset="60%" style="stop-color:${cfg.accent};stop-opacity:0.04" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0" />
    </radialGradient>

    <!-- Border metallic gradient -->
    <linearGradient id="borderMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.borderOuter};stop-opacity:0.5" />
      <stop offset="25%" style="stop-color:${cfg.borderInner};stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:${cfg.borderOuter};stop-opacity:0.5" />
      <stop offset="75%" style="stop-color:${cfg.borderInner};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${cfg.borderOuter};stop-opacity:0.4" />
    </linearGradient>
  </defs>

  <!-- ===== BACKGROUND ===== -->
  <rect width="400" height="560" fill="#060608" />

  <!-- ===== OUTER BORDER — thick ornate frame ===== -->
  <!-- Outer stroke -->
  <rect x="14" y="14" width="372" height="532" rx="3" fill="none" stroke="${cfg.accent}" stroke-width="2" opacity="0.35" />
  <!-- Inner stroke -->
  <rect x="18" y="18" width="364" height="524" rx="2" fill="none" stroke="${cfg.accent}" stroke-width="0.8" opacity="0.15" />
  <!-- Second inner stroke -->
  <rect x="22" y="22" width="356" height="516" rx="1.5" fill="none" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.08" />

  <!-- ===== CORNER ORNAMENTS ===== -->
  <!-- Top-left -->
  <circle cx="24" cy="24" r="4" fill="${cfg.accent}" opacity="0.15" />
  <circle cx="24" cy="24" r="2" fill="${cfg.accent}" opacity="0.25" />
  <!-- Top-right -->
  <circle cx="376" cy="24" r="4" fill="${cfg.accent}" opacity="0.15" />
  <circle cx="376" cy="24" r="2" fill="${cfg.accent}" opacity="0.25" />
  <!-- Bottom-left -->
  <circle cx="24" cy="536" r="4" fill="${cfg.accent}" opacity="0.15" />
  <circle cx="24" cy="536" r="2" fill="${cfg.accent}" opacity="0.25" />
  <!-- Bottom-right -->
  <circle cx="376" cy="536" r="4" fill="${cfg.accent}" opacity="0.15" />
  <circle cx="376" cy="536" r="2" fill="${cfg.accent}" opacity="0.25" />

  <!-- Mid-border corner marks (top) -->
  <circle cx="40" cy="38" r="1.5" fill="${cfg.accent}" opacity="0.1" />
  <circle cx="360" cy="38" r="1.5" fill="${cfg.accent}" opacity="0.1" />
  <!-- Mid-border corner marks (bottom) -->
  <circle cx="40" cy="522" r="1.5" fill="${cfg.accent}" opacity="0.1" />
  <circle cx="360" cy="522" r="1.5" fill="${cfg.accent}" opacity="0.1" />

  <!-- ===== INNER FILL ===== -->
  <rect x="26" y="26" width="348" height="508" rx="1" fill="#0a0a0c" opacity="0.95" />
  <rect x="26" y="26" width="348" height="508" rx="1" fill="url(#foil)" opacity="0.4" />
  <rect x="26" y="26" width="348" height="508" rx="1" fill="url(#crosshatch)" />
  <rect x="26" y="26" width="348" height="508" rx="1" fill="url(#watermark)" />
  <rect x="26" y="26" width="348" height="508" rx="1" fill="url(#scanlines)" opacity="0.15" />

  <!-- Foil stripe across middle -->
  <rect x="26" y="210" width="348" height="90" fill="url(#foilStripe)" />

  <!-- ===== TOP DOME / SEAL AREA ===== -->
  <!-- Top glow -->
  <rect x="26" y="26" width="348" height="120" rx="1" fill="url(#topGlow)" />

  <!-- Agency name -->
  <text x="200" y="52" text-anchor="middle" font-family="'Georgia', serif" font-size="6.5" letter-spacing="3.5" fill="${cfg.accent}" opacity="0.35">GATEWAY:NOIR</text>

  <!-- Outer seal ring -->
  <circle cx="200" cy="78" r="32" fill="url(#sealGlow)" stroke="${cfg.accent}" stroke-width="0.8" opacity="0.12" />
  <circle cx="200" cy="78" r="28" fill="none" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.08" stroke-dasharray="2,3" />

  <!-- Inner seal ring -->
  <circle cx="200" cy="78" r="24" fill="${cfg.accent}06" stroke="${cfg.accent}" stroke-width="0.5" opacity="0.2" />

  <!-- Ring of dots -->
  ${[-24,-18,-12,-6,0,6,12,18,24].map(angle => {
    const rad = angle * Math.PI / 180;
    const cx = 200 + 26 * Math.sin(rad);
    const cy = 78 - 26 * Math.cos(rad);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0.8" fill="${cfg.accent}" opacity="0.12" />`;
  }).join("\n  ")}

  <!-- Central seal icon -->
  <text x="200" y="89" text-anchor="middle" font-size="22" fill="${cfg.accent}" opacity="0.85">${cfg.seal}</text>

  <!-- Secondary seal icon -->
  <text x="200" y="106" text-anchor="middle" font-size="6" fill="${cfg.accent}" opacity="0.2">${cfg.sealSecondary}</text>

  <!-- ===== RANK SECTION ===== -->
  <!-- Decorative dividers -->
  <line x1="80" y1="120" x2="140" y2="120" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.08" />
  <line x1="260" y1="120" x2="320" y2="120" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.08" />

  <!-- Rank -->
  <text x="200" y="136" text-anchor="middle" font-family="'Courier New', monospace" font-size="6.5" font-weight="bold" letter-spacing="3" fill="${cfg.accent}" opacity="0.4">${cfg.rank}</text>

  <!-- ===== DIVIDER ===== -->
  <line x1="50" y1="148" x2="350" y2="148" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.06" />
  <circle cx="200" cy="148" r="1.5" fill="${cfg.accent}" opacity="0.12" />

  <!-- ===== TITLE / BADGE CODE SECTION ===== -->
  <!-- Title -->
  <text x="200" y="170" text-anchor="middle" font-family="'Courier New', monospace" font-size="7" font-weight="bold" letter-spacing="4" fill="${cfg.accent}" opacity="0.65">${cfg.title}</text>

  <!-- Badge code — large and prominent -->
  <text x="200" y="216" text-anchor="middle" font-family="'Courier New', monospace" font-size="32" font-weight="bold" fill="#ffffff" opacity="0.95">${data.badgeCode}</text>

  <!-- Glint on badge code -->
  <text x="199" y="215" text-anchor="middle" font-family="'Courier New', monospace" font-size="32" font-weight="bold" fill="${cfg.accent}" opacity="0.06">${data.badgeCode}</text>

  <!-- ===== DEPARTMENT LINE ===== -->
  <text x="200" y="242" text-anchor="middle" font-family="'Courier New', monospace" font-size="6" letter-spacing="2" fill="${cfg.accent}" opacity="0.25">${cfg.dept}</text>

  <!-- ===== PHOTO / ID AREA ===== -->
  <rect x="50" y="260" width="300" height="44" rx="1" fill="none" stroke="${cfg.accent}" stroke-width="0.5" opacity="0.08" />

  <!-- Photo placeholder silhouette -->
  <rect x="54" y="264" width="34" height="36" rx="1" fill="${cfg.accent}06" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.1" />
  <circle cx="71" cy="276" r="6" fill="${cfg.accent}" opacity="0.06" />
  <rect x="64" y="287" width="14" height="9" rx="4.5" fill="${cfg.accent}" opacity="0.04" />

  <!-- Name label -->
  <text x="95" y="277" font-family="'Courier New', monospace" font-size="5" letter-spacing="1.5" fill="${cfg.accent}" opacity="0.18">OFFICER</text>
  <text x="95" y="293" font-family="'Georgia', serif" font-size="13" fill="#d4d4d4" opacity="0.85">${data.displayName || "Anonymous"}</text>

  <!-- ID number below name -->
  <text x="95" y="302" font-family="'Courier New', monospace" font-size="5.5" fill="${cfg.accent}" opacity="0.22">ID #${data.badgeCode.replace(/[^A-Z0-9]/g, "")}</text>

  <!-- ===== STATS RIBBON ===== -->
  ${statLine ? `
  <!-- Stats background -->
  <rect x="60" y="316" width="280" height="24" rx="1" fill="${cfg.accent}04" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.08" />

  <!-- Stats bullets -->
  <text x="66" y="323" font-family="'Courier New', monospace" font-size="3.5" fill="${cfg.accent}" opacity="0.25">▸</text>
  <text x="200" y="331" text-anchor="middle" font-family="'Courier New', monospace" font-size="7" fill="${cfg.accent}" opacity="0.4">${statLine}</text>
  <text x="334" y="323" font-family="'Courier New', monospace" font-size="3.5" fill="${cfg.accent}" opacity="0.25">◂</text>
  ` : ""}

  <!-- ===== CERTIFICATION BAR ===== -->
  <rect x="50" y="354" width="300" height="16" rx="1" fill="${cfg.accent}03" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
  <text x="200" y="364" text-anchor="middle" font-family="'Courier New', monospace" font-size="5" fill="${cfg.accent}" opacity="0.22">ISSUED ${issueDate}  •  ${data.role === "BUREAU" ? "LIFETIME" : "EXPIRES " + expiryDate}  •  CLASSIFIED</text>

  <!-- ===== DECORATIVE FLOURISHES ===== -->
  <path d="M80 388 Q200 378 320 388" fill="none" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
  <path d="M60 396 Q200 384 340 396" fill="none" stroke="${cfg.accent}" stroke-width="0.5" opacity="0.04" />
  <path d="M100 404 Q200 396 300 404" fill="none" stroke="${cfg.accent}" stroke-width="0.2" opacity="0.03" />

  <!-- ===== AUTHENTICATION SEAL ===== -->
  <rect x="120" y="420" width="160" height="22" rx="1" fill="none" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
  <text x="200" y="428" text-anchor="middle" font-family="'Courier New', monospace" font-size="4.5" fill="${cfg.accent}" opacity="0.18">AUTHENTICATION</text>
  <text x="200" y="438" text-anchor="middle" font-family="'Courier New', monospace" font-size="5.5" letter-spacing="1" fill="${cfg.accent}" opacity="0.3">S/N: ${data.badgeCode.replace(/[^A-Z0-9]/g, "").split("").join(" ")}</text>

  <!-- ===== BARCODE / DATA STRIPE ===== -->
  <rect x="80" y="458" width="240" height="5" rx="0.5" fill="${cfg.accent}05" />
  ${Array.from({length: 24}, (_, i) => {
    const bw = [2,1,3,1,2,1.5,2.5,1,2,1,3,1,2,1.5,2,1,3,1,2,1.5,2,1,3,1][i] || 2;
    const bx = 82 + (i < 12 ? i * 9 : (i - 12) * 9);
    return `<rect x="${bx}" y="459" width="${bw}" height="3" fill="${cfg.accent}" opacity="0.12" />`;
  }).join("\n  ")}

  <!-- ===== FOOTER ===== -->
  <text x="200" y="510" text-anchor="middle" font-family="'Courier New', monospace" font-size="5" letter-spacing="3" fill="#525252" opacity="0.22">NOIRGATEWAY.APP</text>
  <text x="200" y="519" text-anchor="middle" font-family="'Courier New', monospace" font-size="3.5" letter-spacing="2" fill="#525252" opacity="0.1">EST. 2026  •  ALL RIGHTS RESERVED</text>

  <!-- ===== INNER FRAME BORDER DETAIL ===== -->
  <!-- Small tick marks on inner border (top edge) -->
  <line x1="26" y1="26" x2="60" y2="26" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
  <line x1="340" y1="26" x2="374" y2="26" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
  <!-- Bottom edge -->
  <line x1="26" y1="534" x2="60" y2="534" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
  <line x1="340" y1="534" x2="374" y2="534" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.05" />
</svg>`;
}

export function downloadBadgeSVG(data: BadgeImageData): void {
  const svg = generateBadgeSVG(data);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${data.badgeCode}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getDataURL(data: BadgeImageData): string {
  const svg = generateBadgeSVG(data);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
