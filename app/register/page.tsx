import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10">
        <div className="space-y-1">
          <h1 className="font-heading text-xl text-heading">Créer un compte</h1>
          <p className="text-sm text-muted-foreground">
            Gratuit, avec compte — commence à suivre tes candidatures.
          </p>
        </div>
        <RegisterForm />
        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary underline underline-offset-2">
            Se connecter
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          En créant un compte, tu acceptes notre{" "}
          <Link
            href="/confidentialite"
            className="text-primary underline underline-offset-2"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
