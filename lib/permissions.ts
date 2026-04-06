import type { APIPlayer, APIUser, Role } from "@/lib/types";

/**
 * Whether the viewer can delete a specific player.
 *
 * Rules:
 * - If player name !== owner username → anyone with permission can delete
 * - If player name === owner username (same-name player):
 *   - Admin can delete a "user"-role owner's same-name player
 *   - Root can delete an "admin" or "user"-role owner's same-name player
 *   - Nobody can delete their OWN same-name player
 */
export function canDeletePlayer(
  viewerRole: Role,
  viewerUsername: string,
  playerName: string,
  ownerUsername: string,
  ownerRole: Role,
): boolean {
  const isSameNamePlayer = playerName === ownerUsername;
  if (!isSameNamePlayer) return true;

  const isSelf = viewerUsername === ownerUsername;
  if (isSelf) return false;

  if (viewerRole === "root") return true;
  if (viewerRole === "admin" && ownerRole === "user") return true;
  return false;
}

/**
 * Whether the viewer can lock/unlock the target user.
 *
 * Rules:
 * - Admin cannot lock admin or root
 * - Root can lock everyone except self
 */
export function canLockUser(
  viewerRole: Role,
  targetRole: Role,
  isSelf: boolean,
): boolean {
  if (isSelf) return false;
  if (viewerRole === "root") return true;
  if (viewerRole === "admin" && targetRole === "user") return true;
  return false;
}

/** Player textures come from Mojang and cannot be modified. */
export function isMojangPlayer(player: APIPlayer): boolean {
  return !!player.fallbackPlayer;
}

/** User is a "staff" member who can manage their own players. */
export function isStaff(user: APIUser): boolean {
  return user.maxPlayerCount > 1;
}
