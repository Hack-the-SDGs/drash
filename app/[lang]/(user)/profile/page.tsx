import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/drasl/auth";
import { getRole } from "@/lib/drasl/auth";
import { getDictionary, hasLocale, type Locale } from "@/lib/dictionaries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilIcon, UserIcon } from "lucide-react";

export default async function ProfilePage(
  props: { params: Promise<{ lang: string }> },
) {
  const { lang } = await props.params;

  if (!hasLocale(lang)) {
    redirect(`/en/profile`);
  }

  const dict = await getDictionary(lang as Locale);

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect(`/${lang}/login`);
  }

  const role = getRole(user);

  const roleBadgeVariant = role === "root"
    ? "destructive"
    : role === "admin"
      ? "default"
      : "secondary";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.profile.title}</h1>

      {/* User info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <UserIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{user.username}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {user.uuid}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {dict.profile.username}
              </p>
              <p className="text-sm font-medium">{user.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {dict.profile.uuid}
              </p>
              <p className="font-mono text-xs">{user.uuid}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {dict.profile.role}
              </p>
              <Badge variant={roleBadgeVariant}>{role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Players section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{dict.profile.myPlayers}</h2>

        {user.players.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {dict.common.noData}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user.players.map((player) => (
              <Card key={player.uuid}>
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Skin thumbnail */}
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {player.skinUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.skinUrl}
                        alt={player.name}
                        className="size-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <UserIcon className="size-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">
                      {player.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {player.uuid}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {player.skinModel}
                    </Badge>
                  </div>

                  {/* Edit link */}
                  <Link href={`/${lang}/players/${player.uuid}`}>
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                      <span className="sr-only">{dict.profile.editSkin}</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
