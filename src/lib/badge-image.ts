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
        accentMuted: "#fbbf2410",
        accentGlow: "#fbbf2415",
        dept: "BUREAU ADMINISTRATION",
        title: "BUREAU CHIEF",
        rank: "EXECUTIVE",
        ribbon: "#b45309",
        band: "#fbbf2408",
        seal: "★",
        sealSecondary: "◆",
        borderMain: "#fbbf24",
        borderSub: "#f59e0b",
      };
    case "AGENT":
      return {
        accent: "#d97706",
        accentDim: "#b45309",
        accentMuted: "#d9770610",
        accentGlow: "#d9770615",
        dept: "FIELD OPERATIONS",
        title: "FIELD AGENT",
        rank: "SPECIAL AGENT",
        ribbon: "#92400e",
        band: "#d9770608",
        seal: "✦",
        sealSecondary: "◇",
        borderMain: "#d97706",
        borderSub: "#b45309",
      };
    default:
      return {
        accent: "#d97706",
        accentDim: "#b45309",
        accentMuted: "#d9770610",
        accentGlow: "#d9770615",
        dept: "BUREAU OF INVESTIGATION",
        title: "DETECTIVE",
        rank: "INVESTIGATOR",
        ribbon: "#92400e",
        band: "#d9770608",
        seal: "⚖",
        sealSecondary: "◈",
        borderMain: "#d97706",
        borderSub: "#b45309",
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

  const issueDate = "2026-01-01";
  const expiryDate = "2028-12-31";
  const isLifetime = data.role === "BUREAU";
  const serif = "'Georgia', serif";
  const mono = "'Courier New', monospace";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <!-- Subtle watermark text -->
    <pattern id="watermark" patternUnits="userSpaceOnUse" width="60" height="60" patternTransform="rotate(-25)">
      <text x="30" y="36" text-anchor="middle" font-family="${mono}" font-size="4.5" font-weight="bold" fill="${cfg.accent}" opacity="0.02">GATEWAY:NOIR</text>
    </pattern>

    <!-- Foil sweep -->
    <linearGradient id="foil" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.04" />
      <stop offset="30%" style="stop-color:${cfg.accentDim};stop-opacity:0.07" />
      <stop offset="50%" style="stop-color:${cfg.accent};stop-opacity:0.04" />
      <stop offset="70%" style="stop-color:${cfg.accentDim};stop-opacity:0.06" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0.03" />
    </linearGradient>

    <!-- Scanline micro texture -->
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="3" height="3">
      <rect width="3" height="1.5" fill="#ffffff" fill-opacity="0.006" />
    </pattern>

    <!-- Top vignette -->
    <linearGradient id="vignette" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.15" />
      <stop offset="30%" style="stop-color:${cfg.accent};stop-opacity:0.03" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0" />
    </linearGradient>

    <!-- Border metallic -->
    <linearGradient id="borderShine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.6" />
      <stop offset="25%" style="stop-color:${cfg.accentDim};stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:${cfg.accent};stop-opacity:0.5" />
      <stop offset="75%" style="stop-color:${cfg.accentDim};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0.4" />
    </linearGradient>

    <!-- Seal glow -->
    <radialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${cfg.accent};stop-opacity:0.1" />
      <stop offset="70%" style="stop-color:${cfg.accent};stop-opacity:0.02" />
      <stop offset="100%" style="stop-color:${cfg.accent};stop-opacity:0" />
    </radialGradient>

    <!-- Barcode mask (vertical lines) -->
    <pattern id="barcode" patternUnits="userSpaceOnUse" width="6" height="100%">
      <rect x="0" y="0" width="2" height="100%" fill="${cfg.accent}" opacity="0.1" />
      <rect x="3" y="0" width="1" height="100%" fill="${cfg.accent}" opacity="0.06" />
      <rect x="5" y="0" width="1" height="100%" fill="${cfg.accent}" opacity="0.04" />
    </pattern>
  </defs>

  <!-- ═══════════ BACKGROUND ═══════════ -->
  <rect width="400" height="560" fill="#060608" />
  <rect width="400" height="560" fill="url(#watermark)" />

  <!-- ═══════════ OUTER BORDER — heavy ═══════════ -->
  <!-- Outer solid border (2px) -->
  <rect x="12" y="12" width="376" height="536" fill="none" stroke="url(#borderShine)" stroke-width="2" />
  
  <!-- Inner tracing line -->
  <rect x="16" y="16" width="368" height="528" fill="none" stroke="${cfg.accent}" stroke-width="0.5" opacity="0.08" />

  <!-- ═══════════ CORNER BLOCKS ═══════════ -->
  ${[
    { x: 14, y: 14, rx: 4, ry: 4, dir: "right" },
    { x: 386, y: 14, rx: -4, ry: 4, dir: "left" },
    { x: 14, y: 546, rx: 4, ry: -4, dir: "right" },
    { x: 386, y: 546, rx: -4, ry: -4, dir: "left" },
  ].map(c => {
    const size = 6;
    const points = c.dir === "right"
      ? `${c.x},${c.y} ${c.x + size},${c.y} ${c.x + size},${c.y + size} ${c.x},${c.y + size}`
      : `${c.x},${c.y} ${c.x - size},${c.y} ${c.x - size},${c.y + size} ${c.x},${c.y + size}`;
    return `<polygon points="${points}" fill="${cfg.accent}" opacity="0.08" />`;
  }).join("\n  ")}

  <!-- ═══════════ INNER RECT ═══════════ -->
  <rect x="22" y="22" width="356" height="516" fill="#0a0a0c" opacity="0.92" />
  <rect x="22" y="22" width="356" height="516" fill="url(#foil)" />
  <rect x="22" y="22" width="356" height="516" fill="url(#scanlines)" />

  <!-- ═══════════ TOP AUTHORITY BAND ═══════════ -->
  <rect x="22" y="22" width="356" height="90" fill="url(#vignette)" />
  <rect x="22" y="22" width="356" height="90" fill="${cfg.band}" />

  <!-- Agency header -->
  <text x="200" y="44" text-anchor="middle" font-family="${serif}" font-size="6" letter-spacing="4" fill="${cfg.accent}" opacity="0.25">OFFICE OF THE BUREAU</text>

  <!-- Seal -->
  <circle cx="200" cy="76" r="30" fill="url(#sealGlow)" />
  <circle cx="200" cy="76" r="30" fill="none" stroke="${cfg.accent}" stroke-width="0.6" opacity="0.08" />
  <circle cx="200" cy="76" r="26" fill="none" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.04" stroke-dasharray="2,3" />
  
  <!-- Seal icon -->
  <text x="200" y="86" text-anchor="middle" font-size="20" fill="${cfg.accent}" opacity="0.7">${cfg.seal}</text>
  
  <!-- Small dot ring around seal -->
  ${[-24,-18,-12,-6,0,6,12,18,24].map(angle => {
    const rad = angle * Math.PI / 180;
    const cx = 200 + 24 * Math.sin(rad);
    const cy = 76 - 24 * Math.cos(rad);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0.6" fill="${cfg.accent}" opacity="0.08" />`;
  }).join("\n  ")}

  <!-- ═══════════ DIVIDER (shutzhund) ═══════════ -->
  <line x1="60" y1="120" x2="140" y2="120" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.06" />
  <line x1="260" y1="120" x2="340" y2="120" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.06" />
  <circle cx="200" cy="120" r="2" fill="none" stroke="${cfg.accent}" stroke-width="0.4" opacity="0.08" />

  <!-- Rank -->
  <text x="200" y="140" text-anchor="middle" font-family="${mono}" font-size="6.5" font-weight="bold" letter-spacing="3.5" fill="${cfg.accent}" opacity="0.3">${cfg.rank}</text>

  <!-- ═══════════ TITLE SECTION ═══════════ -->
  <text x="200" y="168" text-anchor="middle" font-family="${mono}" font-size="7.5" font-weight="bold" letter-spacing="5" fill="${cfg.accent}" opacity="0.5">${cfg.title}</text>

  <!-- ═══════════ BADGE CODE — massive ═══════════ -->
  <text x="200" y="232" text-anchor="middle" font-family="${mono}" font-size="40" font-weight="bold" fill="#ffffff" opacity="0.92">${data.badgeCode}</text>
  
  <!-- Glint -->
  <text x="199" y="231" text-anchor="middle" font-family="${mono}" font-size="40" font-weight="bold" fill="${cfg.accent}" opacity="0.04">${data.badgeCode}</text>

  <!-- ═══════════ DEPARTMENT + NAME ═══════════ -->
  <text x="200" y="262" text-anchor="middle" font-family="${mono}" font-size="5.5" letter-spacing="2" fill="${cfg.accent}" opacity="0.2">${cfg.dept}</text>

  <!-- Heavy thin line -->
  <line x1="60" y1="276" x2="340" y2="276" stroke="${cfg.accent}" stroke-width="0.5" opacity="0.05" />

  <!-- Display name — large, serif, authority -->
  <text x="200" y="318" text-anchor="middle" font-family="${serif}" font-size="22" fill="#e4e4e4" opacity="0.85">${data.displayName || "Anonymous"}</text>

  <!-- Subtitle line under name -->
  <text x="200" y="336" text-anchor="middle" font-family="${mono}" font-size="5" letter-spacing="1.5" fill="${cfg.accent}" opacity="0.15">PERSONAL IDENTIFICATION NUMBER</text>
  <text x="200" y="348" text-anchor="middle" font-family="${mono}" font-size="7" letter-spacing="3" fill="${cfg.accent}" opacity="0.25">${data.badgeCode.replace(/[^A-Z0-9]/g, "").split("").join(" ")}</text>

  <!-- ═══════════ MIDDLE DECORATIVE BAR ═══════════ -->
  <rect x="40" y="370" width="320" height="1" fill="${cfg.accent}" opacity="0.04" />
  
  <text x="50" y="383" font-family="${mono}" font-size="5" letter-spacing="1.5" fill="${cfg.accent}" opacity="0.12">CREDENTIAL</text>
  <text x="350" y="383" text-anchor="end" font-family="${mono}" font-size="5" letter-spacing="1.5" fill="${cfg.accent}" opacity="0.12">CLASSIFIED</text>

  <!-- ═══════════ STATS / METRICS ═══════════ -->
  ${statParts.length > 0 ? `
  <g>
    ${statParts.map((stat, i) => {
      const sx = [60, 200, 340][i];
      const align = i === 0 ? "start" : i === 1 ? "middle" : "end";
      return `
    <!-- Metric ${i + 1} -->
    <text x="${sx}" y="400" text-anchor="${align}" font-family="${mono}" font-size="3.5" letter-spacing="1.5" fill="${cfg.accent}" opacity="0.12">METRIC ${i + 1}</text>
    <text x="${sx}" y="416" text-anchor="${align}" font-family="${mono}" font-size="10" font-weight="bold" fill="#ffffff" opacity="0.35">${stat}</text>`;
    }).join("")}
  </g>
  ` : `
  <!-- No stats placeholder — quiet -->
  <text x="200" y="408" text-anchor="middle" font-family="${mono}" font-size="5" fill="#525252" opacity="0.12">NO ACTIVE CASE DATA</text>
  `}

  <!-- ═══════════ DATES BAR ═══════════ -->
  <rect x="40" y="438" width="320" height="24" fill="${cfg.accent}03" stroke="${cfg.accent}" stroke-width="0.3" opacity="0.04" />
  <text x="50" y="453" font-family="${mono}" font-size="5" fill="${cfg.accent}" opacity="0.18">ISSUED: ${issueDate}</text>
  <text x="200" y="453" text-anchor="middle" font-family="${mono}" font-size="5" fill="${cfg.accent}" opacity="0.18">${isLifetime ? "LIFETIME APPOINTMENT" : "EXP: " + expiryDate}</text>
  <text x="350" y="453" text-anchor="end" font-family="${mono}" font-size="5" fill="${cfg.accent}" opacity="0.18">S/N: ${data.badgeCode.slice(-4)}</text>

  <!-- ═══════════ AUTHORIZATION SEAL (bottom) ═══════════ -->
  <rect x="100" y="478" width="200" height="3" fill="${cfg.accent}" opacity="0.04" />
  
  <text x="200" y="498" text-anchor="middle" font-family="${serif}" font-size="8" fill="${cfg.accent}" opacity="0.12">${cfg.sealSecondary} VERIFIED ${cfg.sealSecondary}</text>
  
  <text x="200" y="512" text-anchor="middle" font-family="${mono}" font-size="4.5" letter-spacing="1.5" fill="${cfg.accent}" opacity="0.08">THIS CREDENTIAL IS PROPERTY OF GATEWAY:NOIR</text>
  <text x="200" y="520" text-anchor="middle" font-family="${mono}" font-size="4" letter-spacing="1" fill="#525252" opacity="0.06">EST. 2026  •  BUREAU OF INVESTIGATION  •  ALL RIGHTS RESERVED</text>

  <!-- ═══════════ BOTTOM STRIPE ═══════════ -->
  <rect x="22" y="528" width="356" height="10" fill="${cfg.accent}06" />
  <text x="200" y="535" text-anchor="middle" font-family="${mono}" font-size="5" letter-spacing="3" fill="${cfg.accent}" opacity="0.2">NOIRGATEWAY.APP</text>

  <!-- ═══════════ INNER APPLIED SHADOW (cast) ═══════════ -->
  <rect x="12" y="12" width="376" height="536" fill="none" stroke="#000" stroke-width="12" opacity="0.25" rx="0" />
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
