export type DiscussionAudience = "bru_only" | "bru_agt" | "bru_agt_det";
export type SpectatorVisibility = "participants_only" | "all";

export type DiscussionRole = "DETECTIVE" | "AGENT" | "BUREAU";

const audienceRoles: Record<DiscussionAudience, DiscussionRole[]> = {
  bru_only: ["BUREAU"],
  bru_agt: ["BUREAU", "AGENT"],
  bru_agt_det: ["BUREAU", "AGENT", "DETECTIVE"],
};

export function isDiscussionAudience(value: unknown): value is DiscussionAudience {
  return typeof value === "string" && Object.hasOwn(audienceRoles, value);
}

export function isSpectatorVisibility(value: unknown): value is SpectatorVisibility {
  return value === "participants_only" || value === "all";
}

export function canRoleAccessAudience(
  role: DiscussionRole | string | null | undefined,
  audience: DiscussionAudience,
): boolean {
  return audienceRoles[audience].some((allowedRole) => allowedRole === role);
}

export function canViewDiscussion(options: {
  role: DiscussionRole | string | null | undefined;
  audience: DiscussionAudience;
  _spectatorVisibility: SpectatorVisibility;
  isParticipant: boolean;
  isCreator: boolean;
}): boolean {
  const { role, audience, isParticipant, isCreator } = options;

  if (isCreator || isParticipant) return true;
  if (canRoleAccessAudience(role, audience)) return true;

  // Visitors can never view discussions since 'all' audience is removed
  return false;
}

export function canDiscussDiscussion(options: {
  role: DiscussionRole | string | null | undefined;
  audience: DiscussionAudience;
  isParticipant: boolean;
  isCreator: boolean;
}): boolean {
  const { role, audience, isParticipant, isCreator } = options;
  return isCreator || isParticipant || canRoleAccessAudience(role, audience);
}

export function canManageParticipants(role: DiscussionRole | string | null | undefined): boolean {
  return role === "BUREAU";
}

export function isPublicDiscussion(_options: {
  audience: DiscussionAudience;
  _spectatorVisibility: SpectatorVisibility;
}): boolean {
  // No 'all' audience option anymore, so discussions are never public
  return false;
}

export function getAudienceLabel(audience: DiscussionAudience): string {
  return {
    bru_only: "BRU",
    bru_agt: "BRU + AGT",
    bru_agt_det: "BRU + AGT + DET",
  }[audience];
}
