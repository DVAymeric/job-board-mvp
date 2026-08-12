"use client";

import { useEffect, useRef } from "react";
import { buildBookmarkletHref } from "@/lib/bookmarklet";

// Rendered client-only (see the dynamic import with ssr:false in app/page.tsx)
// since it reads window.location.origin, so no hydration mismatch is possible.
export function BookmarkletLink() {
  const origin = window.location.origin;
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // React sanitizes javascript: hrefs set via props (XSS precaution), so the
    // href is set as a raw DOM attribute instead, outside of React's reach.
    linkRef.current?.setAttribute("href", buildBookmarkletHref(origin));
  }, [origin]);

  return (
    <p className="text-xs text-muted-foreground">
      Glisse ce lien dans ta barre de favoris pour ajouter une offre en un
      clic depuis n&apos;importe quelle fiche de poste :{" "}
      <a
        ref={linkRef}
        href="#"
        className="font-medium text-foreground underline underline-offset-2"
      >
        + Ajouter à Job Board
      </a>
    </p>
  );
}
