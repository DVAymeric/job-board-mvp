import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const callbackUrl =
    typeof searchParams.callbackUrl === "string" ? searchParams.callbackUrl : undefined;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10">
        <div className="space-y-1">
          <h1 className="font-heading text-xl text-heading">Connexion</h1>
          <p className="text-sm text-muted-foreground">
            Accède à ton suivi de candidatures.
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-primary underline underline-offset-2"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
