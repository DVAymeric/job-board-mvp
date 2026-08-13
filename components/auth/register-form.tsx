"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerAction, type AuthFormState } from "@/app/auth-actions";

const initialState: AuthFormState = { error: null };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nom (optionnel)
        </label>
        <Input id="name" name="name" type="text" disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" required disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          disabled={pending}
        />
      </div>
      {state.error && (
        <p data-testid="register-error" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" />}
        Créer mon compte
      </Button>
    </form>
  );
}
