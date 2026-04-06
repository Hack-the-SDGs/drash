"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { updateUserAction } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfilePasswordProps {
  userUuid: string;
}

export function ProfilePassword({ userUuid }: ProfilePasswordProps) {
  const dict = useDict();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateUserAction(userUuid, formData);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.profile.changePassword}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="profile-password">{dict.profile.newPassword}</Label>
            <Input id="profile-password" name="password" type="password" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? dict.common.loading : dict.common.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
