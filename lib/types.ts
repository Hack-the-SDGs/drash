// Drasl API v2 types (from Swagger schema)

export interface APIUser {
  uuid: string;
  username: string;
  isAdmin: boolean;
  isLocked: boolean;
  maxPlayerCount: number;
  preferredLanguage: string;
  apiToken: string;
  minecraftToken: string;
  players: APIPlayer[];
  oidcIdentities: APIOIDCIdentity[];
}

export interface APIPlayer {
  uuid: string;
  name: string;
  skinUrl: string;
  skinModel: "classic" | "slim";
  capeUrl: string;
  fallbackPlayer: string;
  offlineUuid: string;
  userUuid: string;
  createdAt: string;
  nameLastChangedAt: string;
}

export interface APIInvite {
  code: string;
  createdAt: string;
  url: string;
}

export interface APIOIDCIdentity {
  issuer: string;
  oidcProviderName: string;
  subject: string;
  userUuid: string;
}

export interface APIOIDCIdentitySpec {
  issuer: string;
  subject: string;
}

export interface APILoginRequest {
  username: string;
  password: string;
}

export interface APILoginResponse {
  apiToken: string;
  user: APIUser;
}

export interface APICreateUserRequest {
  username: string;
  password?: string;
  playerName?: string;
  chosenUuid?: string;
  existingPlayer?: boolean;
  fallbackPlayer?: string;
  inviteCode?: string;
  isAdmin?: boolean;
  isLocked?: boolean;
  maxPlayerCount?: number;
  preferredLanguage?: string;
  skinBase64?: string;
  skinModel?: "classic" | "slim";
  skinUrl?: string;
  capeBase64?: string;
  capeUrl?: string;
  oidcIdentities?: APIOIDCIdentitySpec[];
  requestApiToken?: boolean;
}

export interface APICreateUserResponse {
  apiToken?: string;
  user: APIUser;
}

export interface APIUpdateUserRequest {
  password?: string;
  isAdmin?: boolean;
  isLocked?: boolean;
  maxPlayerCount?: number;
  preferredLanguage?: string;
  resetApiToken?: boolean;
  resetMinecraftToken?: boolean;
}

export interface APICreatePlayerRequest {
  name: string;
  userUuid?: string;
  chosenUuid?: string;
  existingPlayer?: boolean;
  fallbackPlayer?: string;
  challengeToken?: string;
  skinBase64?: string;
  skinModel?: "classic" | "slim";
  skinUrl?: string;
  capeBase64?: string;
  capeUrl?: string;
}

export interface APIUpdatePlayerRequest {
  name?: string;
  fallbackPlayer?: string;
  skinBase64?: string;
  skinModel?: "classic" | "slim";
  skinUrl?: string;
  capeBase64?: string;
  capeUrl?: string;
  deleteSkin?: boolean;
  deleteCape?: boolean;
}

export interface APIGetChallengeSkinRequest {
  playerName: string;
}

export interface APIChallenge {
  challengeSkinBase64: string;
  challengeToken: string;
}

export interface APIError {
  message: string;
}

export interface APICreateOIDCIdentityRequest {
  issuer: string;
  subject: string;
}

export interface APIDeleteOIDCIdentityRequest {
  issuer: string;
}

// App-level types

export type Role = "root" | "admin" | "user";

export interface SessionUser {
  uuid: string;
  username: string;
  isAdmin: boolean;
  role: Role;
}
