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
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c};stop-opacity:1" />
      <stop offset="30%" style="stop-color:${c};stop-opacity:0.7" />
      <stop offset="50%" style="stop-color:${c};stop-opacity:0.9" />
      <stop offset="70%" style="stop-color:${c};stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:${c};stop-opacity:0.8" />
    </linearGradient>
  </defs>

  <!-- BACKGROUND -->
  <rect width="400" height="560" fill="#060608" />

  <!-- OUTER HEAVY BORDER -->
  <rect x="4" y="4" width="392" height="552" fill="none" stroke="url(#borderGrad)" stroke-width="4" />

  <!-- INNER BACKGROUND -->
  <rect x="8" y="8" width="384" height="544" fill="#0a0a0c" />

  <!-- AGENCY HEADER -->
  <text x="200" y="38" text-anchor="middle" font-family="${mono}" font-size="9" font-weight="bold" letter-spacing="4" fill="${c}" opacity="0.5">OFFICE OF THE BUREAU</text>

  <!-- SEAL -->
  <circle cx="200" cy="72" r="30" fill="none" stroke="${c}" stroke-width="1" opacity="0.15" />
  <circle cx="200" cy="72" r="26" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.08" stroke-dasharray="2,3" />
  <text x="200" y="84" text-anchor="middle" font-size="26" fill="${c}" opacity="0.7">${cfg.seal}</text>

  <!-- ROLE TITLE -->
  <text x="200" y="138" text-anchor="middle" font-family="${mono}" font-size="11" font-weight="bold" letter-spacing="5" fill="${c}" opacity="0.6">${cfg.title}</text>

  <!-- BADGE CODE -->
  <text x="200" y="208" text-anchor="middle" font-family="${mono}" font-size="46" font-weight="bold" fill="#ffffff" opacity="0.95">${data.badgeCode}</text>
  <text x="199" y="207" text-anchor="middle" font-family="${mono}" font-size="46" font-weight="bold" fill="${c}" opacity="0.06">${data.badgeCode}</text>

  <!-- DIVIDER -->
  <line x1="60" y1="228" x2="340" y2="228" stroke="${c}" stroke-width="0.8" opacity="0.12" />

  <!-- DEPARTMENT -->
  <text x="200" y="248" text-anchor="middle" font-family="${mono}" font-size="8" font-weight="bold" letter-spacing="3" fill="${c}" opacity="0.35">${cfg.dept}</text>

  <!-- DISPLAY NAME -->
  <text x="200" y="306" text-anchor="middle" font-family="${serif}" font-size="28" fill="#e4e4e4" opacity="0.9">${data.displayName || "Anonymous"}</text>

  <!-- PIN SUBTITLE -->
  <text x="200" y="326" text-anchor="middle" font-family="${mono}" font-size="6" letter-spacing="2" fill="${c}" opacity="0.2">PERSONAL IDENTIFICATION NUMBER</text>
  <text x="200" y="342" text-anchor="middle" font-family="${mono}" font-size="8" letter-spacing="4" fill="${c}" opacity="0.35">${data.badgeCode.replace(/[^A-Z0-9]/g, "").split("").join(" ")}</text>

  <!-- CREDENTIAL DIVIDER -->
  <rect x="40" y="362" width="320" height="1" fill="${c}" opacity="0.08" />
  <text x="50" y="378" font-family="${mono}" font-size="7" font-weight="bold" letter-spacing="2" fill="${c}" opacity="0.25">CREDENTIAL</text>
  <text x="350" y="378" text-anchor="end" font-family="${mono}" font-size="7" font-weight="bold" letter-spacing="2" fill="${c}" opacity="0.25">IDENTIFICATION</text>

  <!-- RANK -->
  <text x="60" y="404" font-family="${mono}" font-size="7" font-weight="bold" fill="${c}" opacity="0.3">RANK</text>
  <text x="200" y="404" font-family="${mono}" font-size="7" fill="${c}" opacity="0.5">${cfg.rank}</text>

  <!-- PHONE -->
  ${hasPhone ? `
  <text x="60" y="426" font-family="${mono}" font-size="7" font-weight="bold" fill="${c}" opacity="0.3">PHONE</text>
  <text x="200" y="426" font-family="${mono}" font-size="7" fill="${c}" opacity="0.5">${formatPhone(data.phone!)}</text>
  ` : ""}

  <!-- DATES BOX -->
  <rect x="40" y="${hasPhone ? 454 : 432}" width="320" height="28" fill="${c}03" stroke="${c}" stroke-width="0.5" opacity="0.08" rx="0" />
  <text x="55" y="${hasPhone ? 472 : 450}" font-family="${mono}" font-size="7" fill="${c}" opacity="0.3">ISSUED: ${issueDate}</text>
  <text x="200" y="${hasPhone ? 472 : 450}" text-anchor="middle" font-family="${mono}" font-size="7" font-weight="bold" fill="${c}" opacity="0.3">${isLifetime ? "LIFETIME APPOINTMENT" : "EXP: " + expiryDate}</text>
  <text x="345" y="${hasPhone ? 472 : 450}" text-anchor="end" font-family="${mono}" font-size="7" fill="${c}" opacity="0.3">S/N: ${data.badgeCode.slice(-4)}</text>

  <!-- AUTHORIZATION FOOTER -->
  <text x="200" y="${hasPhone ? 506 : 484}" text-anchor="middle" font-family="${serif}" font-size="10" font-weight="bold" fill="${c}" opacity="0.2">${cfg.sealSecondary} VERIFIED ${cfg.sealSecondary}</text>
  <text x="200" y="${hasPhone ? 522 : 500}" text-anchor="middle" font-family="${mono}" font-size="6" letter-spacing="2" fill="${c}" opacity="0.15">THIS CREDENTIAL IS PROPERTY OF GATEWAY:NOIR</text>
  <text x="200" y="${hasPhone ? 533 : 511}" text-anchor="middle" font-family="${mono}" font-size="5" letter-spacing="1" fill="#525252" opacity="0.12">EST. 2026  •  BUREAU OF INVESTIGATION  •  ALL RIGHTS RESERVED</text>

  <!-- BOTTOM STRIPE -->
  <rect x="8" y="528" width="384" height="24" fill="${c}06" />
  <text x="200" y="543" text-anchor="middle" font-family="${mono}" font-size="8" font-weight="bold" letter-spacing="4" fill="${c}" opacity="0.4">NOIRGATEWAY.APP</text>

  <!-- INNER SHADOW -->
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
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
