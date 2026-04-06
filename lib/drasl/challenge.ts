import { draslFetchNoAuth } from "./client";
import type { APIGetChallengeSkinRequest, APIChallenge } from "@/lib/types";

export function getChallengeSkin(data: APIGetChallengeSkinRequest) {
  const params = new URLSearchParams({ playerName: data.playerName });
  return draslFetchNoAuth<APIChallenge>(`/challenge-skin?${params}`);
}
