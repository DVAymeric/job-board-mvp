import { BentoCard } from "@/components/ui/bento-card";

export function PrivacyCard() {
  return (
    <BentoCard label="Confidentialité" title="100% local">
      <p>SQLite sur votre machine. Rien n&apos;est envoyé ailleurs.</p>
    </BentoCard>
  );
}
