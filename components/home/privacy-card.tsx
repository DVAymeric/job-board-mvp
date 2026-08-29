import { BentoCard } from "@/components/ui/bento-card";

export function PrivacyCard() {
  return (
    <BentoCard label="Confidentialité" title="Vos données ne sont jamais revendues">
      <p>
        Vos candidatures restent hébergées sur nos serveurs et ne sont jamais partagées ni
        revendues à des tiers.
      </p>
    </BentoCard>
  );
}
