export interface BadgeImageData {
  badgeCode: string;
  displayName: string;
  role: "DETECTIVE" | "AGENT" | "BUREAU";
  phone?: string;
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
        primary: "#DAA520",
        primaryDim: "#B8860B",
        dept: "BUREAU ADMINISTRATION",
        title: "BUREAU CHIEF",
        rank: "EXECUTIVE",
        seal: "★",
        sealSecondary: "◆",
        roleLabel: "BUREAU",
      };
    case "AGENT":
      return {
        primary: "#8CA0B3",
        primaryDim: "#6B8299",
        dept: "FIELD OPERATIONS",
        title: "FIELD AGENT",
        rank: "SPECIAL AGENT",
        seal: "✦",
        sealSecondary: "◇",
        roleLabel: "AGENT",
      };
    default:
      return {
        primary: "#B87333",
        primaryDim: "#8B5A2B",
        dept: "BUREAU OF INVESTIGATION",
        title: "DETECTIVE",
        rank: "INVESTIGATOR",
        seal: "⚖",
        sealSecondary: "◈",
        roleLabel: "DETECTIVE",
      };
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  }
  return phone;
}

const serif = "'Georgia', serif";
const mono = "'Courier New', monospace";

function genDottedGrid(c: string): string {
  const dots: string[] = [];
  for (let x = 10; x < 400; x += 20) {
    for (let y = 10; y < 560; y += 20) {
      dots.push(`<circle cx="${x}" cy="${y}" r="0.6" fill="${c}" opacity="0.06" />`);
    }
  }
  return dots.join("");
}

export function generateBadgeSVG(data: BadgeImageData): string {
  const cfg = roleConfig(data.role);
  const c = cfg.primary;
  const issueDate = "2026-01-01";
  const expiryDate = "2028-12-31";
  const isLifetime = data.role === "BUREAU";
  const hasPhone = !!data.phone;

  const filters = `
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  `;

  const dottedGrid = genDottedGrid(c);

  const cornerSize = 14;
  const cornerOffset = 14;
  const corners = `
    <g opacity="0.5" stroke="${c}" stroke-width="1" fill="none">
      <path d="M${cornerOffset},${cornerOffset + cornerSize} L${cornerOffset},${cornerOffset} L${cornerOffset + cornerSize},${cornerOffset}" />
      <path d="M${400 - cornerOffset - cornerSize},${cornerOffset} L${400 - cornerOffset},${cornerOffset} L${400 - cornerOffset},${cornerOffset + cornerSize}" />
      <path d="M${cornerOffset},${560 - cornerOffset - cornerSize} L${cornerOffset},${560 - cornerOffset} L${cornerOffset + cornerSize},${560 - cornerOffset}" />
      <path d="M${400 - cornerOffset - cornerSize},${560 - cornerOffset} L${400 - cornerOffset},${560 - cornerOffset} L${400 - cornerOffset},${560 - cornerOffset - cornerSize}" />
    </g>
  `;

  const sealDots = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 * Math.PI) / 180;
    const x = 200 + 28 * Math.cos(angle);
    const y = 76 + 28 * Math.sin(angle);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.8" fill="${c}" opacity="0.25" />`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c};stop-opacity:1" />
      <stop offset="30%" style="stop-color:${c};stop-opacity:0.7" />
      <stop offset="50%" style="stop-color:${c};stop-opacity:0.9" />
      <stop offset="70%" style="stop-color:${c};stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:${c};stop-opacity:0.8" />
    </linearGradient>
    ${filters}
    <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="0.7" fill="${c}" opacity="0.08" />
    </pattern>
  </defs>

  <!-- BACKGROUND -->
  <rect width="400" height="560" fill="#060608" />
  <rect width="400" height="560" fill="url(#dotGrid)" />
  ${dottedGrid}

  <!-- OUTER HEAVY BORDER -->
  <rect x="4" y="4" width="392" height="552" fill="none" stroke="url(#borderGrad)" stroke-width="3" />

  <!-- INNER BACKGROUND -->
  <rect x="8" y="8" width="384" height="544" fill="#0a0a0c" />

  <!-- CORNER BRACKETS -->
  ${corners}

  <!-- SECTION DIVIDERS -->
  <line x1="40" y1="118" x2="360" y2="118" stroke="${c}" stroke-width="0.6" opacity="0.15" />
  <line x1="40" y1="370" x2="360" y2="370" stroke="${c}" stroke-width="0.6" opacity="0.15" />

  <!-- ==================== HEADER ==================== -->

  <!-- AGENCY NAME -->
  <text x="200" y="28" text-anchor="middle" font-family="${mono}" font-size="8" font-weight="bold" letter-spacing="6" fill="${c}" opacity="0.5">OFFICE OF THE BUREAU</text>

  <!-- SEAL -->
  <circle cx="200" cy="68" r="24" fill="${c}" opacity="0.03" />
  <circle cx="200" cy="68" r="22" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.25" />
  <circle cx="200" cy="68" r="18" fill="none" stroke="${c}" stroke-width="0.4" opacity="0.12" stroke-dasharray="2,2" />
  ${sealDots}
  <text x="200" y="76" text-anchor="middle" font-size="20" fill="${c}" opacity="0.7" filter="url(#dropShadow)">${cfg.seal}</text>

  <!-- BADGE CODE (Header - prominent, solid) -->
  <text x="200" y="106" text-anchor="middle" font-family="${mono}" font-size="10" font-weight="bold" letter-spacing="5" fill="${c}" opacity="0.6">${cfg.title}</text>
  <text x="200" y="168" text-anchor="middle" font-family="${mono}" font-size="44" font-weight="bold" fill="#ffffff" opacity="0.95" filter="url(#dropShadow)">${data.badgeCode}</text>

  <!-- ==================== BODY ==================== -->

  <!-- DISPLAY NAME (solid, visible) -->
  <text x="200" y="238" text-anchor="middle" font-family="${serif}" font-size="28" font-weight="bold" fill="#e8e8e8" opacity="1" filter="url(#dropShadow)">${data.displayName || "Anonymous"}</text>

  <!-- DEPARTMENT -->
  <text x="200" y="270" text-anchor="middle" font-family="${mono}" font-size="7" font-weight="bold" letter-spacing="3" fill="${c}" opacity="0.55">${cfg.dept}</text>

  <!-- Details divider -->
  <line x1="100" y1="284" x2="300" y2="284" stroke="${c}" stroke-width="0.4" opacity="0.08" />

  <!-- RANK -->
  <text x="60" y="310" font-family="${mono}" font-size="7" font-weight="bold" fill="${c}" opacity="0.45">RANK</text>
  <text x="200" y="310" text-anchor="middle" font-family="${mono}" font-size="7" fill="${c}" opacity="0.5">${cfg.rank}</text>

  <!-- ROLE BADGE -->
  <text x="340" y="310" text-anchor="end" font-family="${mono}" font-size="7" font-weight="bold" fill="${c}" opacity="0.5">${cfg.roleLabel}</text>

  <!-- PHONE -->
  ${hasPhone ? `
  <text x="60" y="332" font-family="${mono}" font-size="6" font-weight="bold" fill="${c}" opacity="0.4">PHONE</text>
  <text x="200" y="332" text-anchor="middle" font-family="${mono}" font-size="7" fill="${c}" opacity="0.55">${formatPhone(data.phone!)}</text>
  ` : ""}

  <!-- STATUS / ISSUED -->
  <text x="60" y="${hasPhone ? 356 : 346}" font-family="${mono}" font-size="6" font-weight="bold" fill="${c}" opacity="0.4">ISSUED</text>
  <text x="200" y="${hasPhone ? 356 : 346}" text-anchor="middle" font-family="${mono}" font-size="6" fill="${c}" opacity="0.5">${issueDate}</text>
  <text x="340" y="${hasPhone ? 356 : 346}" text-anchor="end" font-family="${mono}" font-size="6" fill="${c}" opacity="0.4">${isLifetime ? "LIFETIME" : "EXP: " + expiryDate}</text>

  <!-- ==================== FOOTER ==================== -->

  <!-- AUTHORIZATION FOOTER -->
  <text x="200" y="420" text-anchor="middle" font-family="${serif}" font-size="9" font-weight="bold" fill="${c}" opacity="0.35" filter="url(#dropShadow)">${cfg.sealSecondary} VERIFIED ${cfg.sealSecondary}</text>

  <!-- SECURITY LINE -->
  <text x="200" y="444" text-anchor="middle" font-family="${mono}" font-size="5" letter-spacing="1.5" fill="${c}" opacity="0.2">THIS CREDENTIAL IS PROPERTY OF GATEWAY:NOIR</text>
  <text x="200" y="458" text-anchor="middle" font-family="${mono}" font-size="4" letter-spacing="0.5" fill="#525252" opacity="0.15">EST. 2026  •  BUREAU OF INVESTIGATION  •  ALL RIGHTS RESERVED</text>

  <!-- BADGE NUMBER TRIPART -->
  <text x="200" y="478" text-anchor="middle" font-family="${mono}" font-size="5" letter-spacing="2" fill="${c}" opacity="0.3">${data.badgeCode.slice(0, 4)}-${data.badgeCode.slice(4, 8)}-${data.badgeCode.slice(8, 12)}</text>

  <!-- BOTTOM STRIPE -->
  <rect x="8" y="492" width="384" height="28" fill="${c}08" />
  <text x="200" y="510" text-anchor="middle" font-family="${mono}" font-size="8" font-weight="bold" letter-spacing="4" fill="${c}" opacity="0.45">NOIRGATEWAY.APP</text>

  <!-- INNER SHADOW -->
  <rect x="4" y="4" width="392" height="552" fill="none" stroke="#000" stroke-width="14" opacity="0.25" />
</svg>`;
}

export async function generateBadgeQR(badgeCode: string): Promise<string> {
  // @ts-expect-error qrcode has no types
  const mod = await import("qrcode");
  const svg = await mod.toString(badgeCode, {
    type: "svg",
    width: 100,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return svg;
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
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
