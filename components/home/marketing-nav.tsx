import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/board", label: "Board" },
  { href: "/analytics", label: "Analytics" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
] as const;

export function MarketingNav() {
  return (
    <header className="flex items-center gap-4 border-b border-border bg-white px-4 py-3">
      <span className="mr-2 flex items-center gap-2 font-heading text-base font-bold text-heading">
        <span
          data-testid="marketing-nav-dot"
          className="size-2 rounded-full bg-primary"
        />
        JobTracker
      </span>
      <nav className="hidden flex-1 items-center gap-4 sm:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-heading"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/board"
        className={cn(buttonVariants({ variant: "default" }), "ml-auto sm:ml-0")}
      >
        Ouvrir l&apos;app
      </Link>
    </header>
  );
}
