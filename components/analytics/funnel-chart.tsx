import type { FunnelStage } from "@/lib/analytics";

// Dégradé violet -> vert unique sur toutes les barres (mockup), plutôt
// qu'une couleur distincte par étape : seule la largeur porte le volume.
const FUNNEL_GRADIENT = "linear-gradient(90deg, var(--primary), var(--brand-positive))";

// Phrase en langage courant plutôt qu'un pourcentage nu (JOB-99, a11y) : on
// rapporte toujours l'étape "entretien" au volume initial de candidatures,
// jamais le dernier statut de la liste (souvent REJECTED) pour ne jamais
// formuler un taux de refus comme conclusion — ce serait culpabilisant.
function buildInterviewSentence(stages: FunnelStage[]): string | null {
  const first = stages[0];
  const interview = stages.find((s) => s.status === "INTERVIEW");
  if (!first || !interview || first.count === 0) return null;

  if (interview.count === 0) {
    return "Aucune candidature n'a encore obtenu d'entretien.";
  }

  const pct = Math.round((interview.count / first.count) * 1000) / 10;
  const verb = interview.count > 1 ? "ont obtenu" : "a obtenu";
  const noun = interview.count > 1 ? "candidatures" : "candidature";
  return `${interview.count} ${noun} sur ${first.count} ${verb} un entretien, soit ${pct}%.`;
}

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const sentence = buildInterviewSentence(stages);

  return (
    <div className="space-y-3.5">
      <div
        className="space-y-3.5"
        role="img"
        aria-label="Funnel de conversion des candidatures par statut"
      >
        {stages.map((stage) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 3 : 0);
          return (
            <div key={stage.status} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground">{stage.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {stage.count}
                  {stage.conversionFromPrevious !== null &&
                    ` · ${stage.conversionFromPrevious}%`}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  data-funnel-bar
                  className="h-full rounded-full"
                  style={{
                    width: `${widthPct}%`,
                    backgroundImage: FUNNEL_GRADIENT,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* En dehors du conteneur role="img" : un enfant de role="img" ne serait
          jamais annoncé par un lecteur d'écran (tout le sous-arbre est réduit
          au seul aria-label du parent). */}
      {sentence && <p className="text-base text-muted-foreground">{sentence}</p>}
    </div>
  );
}
