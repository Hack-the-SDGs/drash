import { draslFetch } from "./client";
import type {
  APIPlayer,
  APIUser,
  APICreatePlayerRequest,
  APIUpdatePlayerRequest,
} from "@/lib/types";

export function getPlayers() {
  return draslFetch<APIPlayer[]>("/players", {
    tags: ["players"],
    revalidate: 30,
  });
}

export function getPlayer(uuid: string) {
  return draslFetch<APIPlayer>(`/players/${uuid}`, {
    tags: ["players", `player-${uuid}`],
    revalidate: 30,
  });
}

export function createPlayer(data: APICreatePlayerRequest) {
  return draslFetch<APIPlayer>("/players", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePlayer(uuid: string, data: APIUpdatePlayerRequest) {
  return draslFetch<APIUser>(`/players/${uuid}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePlayer(uuid: string) {
  return draslFetch<void>(`/players/${uuid}`, {
    method: "DELETE",
  });
}
