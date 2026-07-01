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
        primary: "#fbbf24",
        primaryDim: "#d97706",
        dept: "BUREAU ADMINISTRATION",
        title: "BUREAU CHIEF",
        rank: "EXECUTIVE",
        seal: "★",
        sealSecondary: "◆",
        roleLabel: "BUREAU",
      };
    case "AGENT":
      return {
        primary: "#d97706",
        primaryDim: "#b45309",
        dept: "FIELD OPERATIONS",
        title: "FIELD AGENT",
        rank: "SPECIAL AGENT",
        seal: "✦",
        sealSecondary: "◇",
        roleLabel: "AGENT",
      };
    default:
      return {
        primary: "#3b82f6",
        primaryDim: "#2563eb",
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
  // Basic formatting: +1XXXXXXXXXX → +1 (XXX) XXX-XXXX
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const serif = "'Georgia', serif";
const mono = "'Courier New', monospace";

export function generateBadgeSVG(data: BadgeImageData): string {
  const cfg = roleConfig(data.role);
  const c = cfg.primary;
  const issueDate = "2026-01-01";
  const expiryDate = "2028-12-31";
  const isLifetime = data.role === "BUREAU";
  const hasPhone = !!data.phone;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <!-- Subtle card shadow on top edge -->
    <linearGradient id="topGlow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:${c};stop-opacity:0.08" />
      <stop offset="100%" style="stop-color:${c};stop-opacity:0" />
    </linearGradient>

    <!-- Border metallic gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c};stop-opacity:1" />
      <stop offset="30%" style="stop-color:${c};stop-opacity:0.7" />
      <stop offset="50%" style="stop-color:${c};stop-opacity:0.9" />
      <stop offset="70%" style="stop-color:${c};stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:${c};stop-opacity:0.8" />
    </linearGradient>
  </defs>

  <!-- ═══════════ BACKGROUND ═══════════ -->
  <rect width="400" height="560" fill="#060608" />

  <!-- ═══════════ OUTER HEAVY BORDER (4px) ═══════════ -->
  <rect x="4" y="4" width="392" height="552" fill="none" stroke="url(#borderGrad)" stroke-width="4" />

  <!-- ═══════════ INNER BACKGROUND ═══════════ -->
  <rect x="8" y="8" width="384" height="544" fill="#0a0a0c" />

  <!-- ═══════════ TOP BAND ═══════════ -->
  <rect x="8" y="8" width="384" height="110" fill="url(#topGlow)" />

  <!-- Agency header -->
  <text x="200" y="30" text-anchor="middle" font-family="${mono}" font-size="5.5" letter-spacing="4" fill="${c}" opacity="0.3">OFFICE OF THE BUREAU</text>

  <!-- Seal -->
  <circle cx="200" cy="64" r="28" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.12" />
  <circle cx="200" cy="64" r="24" fill="none" stroke="${c}" stroke-width="0.3" opacity="0.06" stroke-dasharray="2,3" />
  <text x="200" y="74" text-anchor="middle" font-size="22" fill="${c}" opacity="0.6">${cfg.seal}</text>

  <!-- Dots around seal -->
  ${[-30, -22.5, -15, -7.5, 0, 7.5, 15, 22.5, 30].map(angle => {
    const rad = angle * Math.PI / 180;
    const cx = (200 + 26 * Math.sin(rad)).toFixed(1);
    const cy = (64 - 26 * Math.cos(rad)).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="0.5" fill="${c}" opacity="0.08" />`;
  }).join("\n  ")}

  <!-- ═══════════ ROLE TITLE ═══════════ -->
  <text x="200" y="124" text-anchor="middle" font-family="${mono}" font-size="7" font-weight="bold" letter-spacing="4" fill="${c}" opacity="0.45">${cfg.title}</text>

  <!-- ═══════════ BADGE CODE ═══════════ -->
  <text x="200" y="190" text-anchor="middle" font-family="${mono}" font-size="42" font-weight="bold" fill="#ffffff" opacity="0.92">${data.badgeCode}</text>

  <!-- Glint -->
  <text x="199" y="189" text-anchor="middle" font-family="${mono}" font-size="42" font-weight="bold" fill="${c}" opacity="0.04">${data.badgeCode}</text>

  <!-- ═══════════ DIVIDER ═══════════ -->
  <line x1="60" y1="210" x2="340" y2="210" stroke="${c}" stroke-width="0.5" opacity="0.08" />

  <!-- ═══════════ DEPARTMENT ═══════════ -->
  <text x="200" y="228" text-anchor="middle" font-family="${mono}" font-size="5.5" letter-spacing="2" fill="${c}" opacity="0.2">${cfg.dept}</text>

  <!-- ═══════════ DISPLAY NAME ═══════════ -->
  <text x="200" y="278" text-anchor="middle" font-family="${serif}" font-size="24" fill="#e4e4e4" opacity="0.85">${data.displayName || "Anonymous"}</text>

  <!-- Subtitle under name -->
  <text x="200" y="295" text-anchor="middle" font-family="${mono}" font-size="4.5" letter-spacing="1.5" fill="${c}" opacity="0.12">PERSONAL IDENTIFICATION NUMBER</text>
  <text x="200" y="307" text-anchor="middle" font-family="${mono}" font-size="6" letter-spacing="3" fill="${c}" opacity="0.2">${data.badgeCode.replace(/[^A-Z0-9]/g, "").split("").join(" ")}</text>

  <!-- ═══════════ MID DIVIDER ═══════════ -->
  <rect x="40" y="324" width="320" height="1" fill="${c}" opacity="0.04" />
  <text x="50" y="337" font-family="${mono}" font-size="4.5" letter-spacing="1.5" fill="${c}" opacity="0.12">CREDENTIAL</text>
  <text x="350" y="337" text-anchor="end" font-family="${mono}" font-size="4.5" letter-spacing="1.5" fill="${c}" opacity="0.12">IDENTIFICATION</text>

  <!-- ═══════════ CONTACT / INFO SECTION ═══════════ -->
  <!-- Rank -->
  <text x="60" y="360" font-family="${mono}" font-size="5" fill="${c}" opacity="0.2">RANK</text>
  <text x="200" y="360" font-family="${mono}" font-size="5" fill="${c}" opacity="0.35">${cfg.rank}</text>

  <!-- Phone -->
  ${hasPhone ? `
  <text x="60" y="380" font-family="${mono}" font-size="5" fill="${c}" opacity="0.2">PHONE</text>
  <text x="200" y="380" font-family="${mono}" font-size="5" fill="${c}" opacity="0.35">${formatPhone(data.phone!)}</text>
  ` : ""}

  <!-- ═══════════ DATES ═══════════ -->
  <rect x="40" y="${hasPhone ? 404 : 390}" width="320" height="22" fill="${c}02" stroke="${c}" stroke-width="0.3" opacity="0.04" />
  <text x="55" y="${hasPhone ? 417 : 403}" font-family="${mono}" font-size="5" fill="${c}" opacity="0.18">ISSUED: ${issueDate}</text>
  <text x="200" y="${hasPhone ? 417 : 403}" text-anchor="middle" font-family="${mono}" font-size="5" fill="${c}" opacity="0.18">${isLifetime ? "LIFETIME APPOINTMENT" : "EXP: " + expiryDate}</text>
  <text x="345" y="${hasPhone ? 417 : 403}" text-anchor="end" font-family="${mono}" font-size="5" fill="${c}" opacity="0.18">S/N: ${data.badgeCode.slice(-4)}</text>

  <!-- ═══════════ AUTHORIZATION SEAL ═══════════ -->
  <rect x="100" y="${hasPhone ? 440 : 426}" width="200" height="3" fill="${c}" opacity="0.04" />
  <text x="200" y="${hasPhone ? 458 : 444}" text-anchor="middle" font-family="${serif}" font-size="8" fill="${c}" opacity="0.12">${cfg.sealSecondary} VERIFIED ${cfg.sealSecondary}</text>
  <text x="200" y="${hasPhone ? 472 : 458}" text-anchor="middle" font-family="${mono}" font-size="4.5" letter-spacing="1.5" fill="${c}" opacity="0.08">THIS CREDENTIAL IS PROPERTY OF GATEWAY:NOIR</text>
  <text x="200" y="${hasPhone ? 480 : 466}" text-anchor="middle" font-family="${mono}" font-size="3.5" letter-spacing="1" fill="#525252" opacity="0.06">EST. 2026  •  BUREAU OF INVESTIGATION  •  ALL RIGHTS RESERVED</text>

  <!-- ═══════════ BOTTOM STRIPE ═══════════ -->
  <rect x="8" y="528" width="384" height="24" fill="${c}06" />
  <text x="200" y="543" text-anchor="middle" font-family="${mono}" font-size="6" letter-spacing="3" fill="${c}" opacity="0.25">NOIRGATEWAY.APP</text>

  <!-- ═══════════ INNER SHADOW ═══════════ -->
  <rect x="4" y="4" width="392" height="552" fill="none" stroke="#000" stroke-width="16" opacity="0.35" />
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
