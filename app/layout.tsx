import type { Metadata, Viewport } from "next";
import { Geist_Mono, Bricolage_Grotesque, Atkinson_Hyperlegible } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson-hyperlegible",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Suivi de candidatures",
  description:
    "Suivez vos candidatures d'emploi en un board : statuts, relances, historique. Gratuit, prêt en 2 minutes.",
};

export const viewport: Viewport = {
  themeColor: "#4f1271",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${atkinsonHyperlegible.variable} ${geistMono.variable} ${bricolageGrotesque.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ServiceWorkerRegistration />
          <Nav session={session} />
          <div className="flex flex-1 flex-col">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
