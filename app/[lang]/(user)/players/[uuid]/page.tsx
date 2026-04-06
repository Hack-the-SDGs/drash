import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/drasl/auth";
import { getPlayer } from "@/lib/drasl/players";
import { DraslAPIError } from "@/lib/drasl/client";
import { getDictionary, hasLocale, type Locale } from "@/lib/dictionaries";
import { SkinEditor } from "@/components/skin-editor";
import { resolvePlayerTextures } from "@/lib/drasl/textures";

export default async function PlayerEditorPage(
  props: { params: Promise<{ lang: string; uuid: string }> },
) {
  const { lang, uuid } = await props.params;

  if (!hasLocale(lang)) {
    redirect(`/en/players/${uuid}`);
  }

  const dict = await getDictionary(lang as Locale);

  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    if (e instanceof DraslAPIError) redirect(`/${lang}/login`);
    throw e;
  }

  let player;
  try {
    player = await getPlayer(uuid);
  } catch (e) {
    if (e instanceof DraslAPIError) redirect(`/${lang}/profile`);
    throw e;
  }

  // Verify the player belongs to the current user
  if (player.userUuid !== user.uuid) {
    redirect(`/${lang}/profile`);
  }

  // Resolve textures (handles Mojang fallback)
  const textures = await resolvePlayerTextures(player);
  const playerWithTextures = { ...player, ...textures };

  return (
    <SkinEditor
      player={playerWithTextures}
      dict={dict.player}
      commonDict={dict.common}
      lang={lang}
    />
  );
}
