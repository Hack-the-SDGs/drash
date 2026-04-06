"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type AuthDict = {
  login: string;
  username: string;
  password: string;
  loginButton: string;
  loginError: string;
  loggingIn: string;
};

function SubmitButton({ dict }: { dict: AuthDict }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} size="lg">
      {pending ? dict.loggingIn : dict.loginButton}
    </Button>
  );
}

export function LoginForm({
  dict,
  lang,
}: {
  dict: AuthDict;
  lang: string;
}) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{dict.login}</CardTitle>
          <CardDescription>Drash</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="lang" value={lang} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{dict.username}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{dict.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <SubmitButton dict={dict} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
