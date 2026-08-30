import type { HeatmapDay } from "@/lib/heatmap";
import { cn } from "@/lib/utils";

// Échelle verte alignée sur le mockup (JOB-126) : une seule teinte
// (--brand-positive, déjà auditée AA en JOB-112) déclinée en opacité
// croissante, plutôt que l'ancien dégradé violet multi-teintes --chart-*/
// --palette-orchidee. Un seul index par niveau (pas de tableau séparé
// 3 vs 5 côtés) : le pourcentage d'opacité augmente régulièrement jusqu'à
// couvrir le nombre de niveaux demandé.
const LEVEL_OPACITY: Record<3 | 5, number[]> = {
  5: [15, 32, 50, 68, 88],
  3: [30, 60, 90],
};

// Fond suffisamment sombre à partir de cette opacité pour basculer le texte
// en blanc (sinon le chiffre en encre foncée devient illisible) — même
// bascule que dans le mockup (cases à 60%/85% d'opacité passent en blanc).
const WHITE_TEXT_OPACITY_THRESHOLD = 50;

function levelStyle(level: number, levels: 3 | 5): React.CSSProperties | undefined {
  if (level <= 0) return undefined;
  const opacity = LEVEL_OPACITY[levels][level - 1];
  return {
    backgroundColor: `color-mix(in srgb, var(--brand-positive) ${opacity}%, transparent)`,
  };
}

function isHighContrastLevel(level: number, levels: 3 | 5): boolean {
  if (level <= 0) return false;
  return LEVEL_OPACITY[levels][level - 1]! >= WHITE_TEXT_OPACITY_THRESHOLD;
}

function formatCellTitle(day: HeatmapDay): string {
  const date = new Date(day.date + "T00:00:00");
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const suffix = day.count > 1 ? "candidatures" : "candidature";
  return `${formatted} : ${day.count} ${suffix}`;
}

// Seuils de la légende pour l'échelle à 3 niveaux — reste relatif à la
// journée la plus active de la fenêtre (`max`), à garder synchronisé avec
// la branche `levels === 3` de `computeLevel` dans lib/heatmap.ts si ces
// ratios changent là-bas.
const LEVEL_3_THRESHOLDS = [1 / 3, 2 / 3, 1];

// Affiche, dans la légende, le nombre de candidatures que représente chaque
// palier de couleur — en plus du chiffre déjà visible dans chaque case
// (RGAA : ne jamais coder l'intensité par la seule teinte). En mode
// `compact`, les cases restent trop petites pour un chiffre lisible et n'en
// affichent pas ; la légende n'y est de toute façon pas affichée non plus
// (voir plus bas).
//
// L'échelle à 5 niveaux est absolue et fixe (0 à 5+ candidatures, voir
// `computeLevel` dans lib/heatmap.ts) : chaque palier correspond directement
// à son propre niveau, `max` n'entre plus en jeu, et le dernier palier est
// un plafond ("5+") plutôt qu'un compte exact.
function legendCount(level: number, levels: 3 | 5, max: number): string {
  if (level <= 0) return "0";
  if (levels === 5) {
    return level === 5 ? "5+" : String(level);
  }
  if (max <= 0) return "0";
  const threshold = LEVEL_3_THRESHOLDS[level - 1];
  return String(Math.max(1, Math.round(threshold * max)));
}

export function ApplicationHeatmap({
  days,
  compact = false,
  levels = 5,
}: {
  days: HeatmapDay[];
  compact?: boolean;
  levels?: 3 | 5;
}) {
  // La fenêtre de temps (30 jours par défaut, JOB-126) est décidée par
  // l'appelant via buildHeatmapDays — le composant ne re-découpe plus lui-même
  // les jours reçus. Grille à plat (pas de transposition en semaines/jours de
  // semaine à la GitHub), 10 colonnes fixes (3 lignes pour une fenêtre de 30
  // jours), cases carrées en `1fr` qui remplissent toute la largeur du
  // conteneur : conforme au mockup "Analytics" (grille dense, cases carrées,
  // chiffre visible dans chaque case) plutôt qu'à l'ancien calendrier à cases
  // minuscules figées.
  const maxCount = Math.max(0, ...days.map((d) => d.count));

  return (
    <div className="space-y-2">
      <div
        className="grid w-full gap-1"
        style={{ gridTemplateColumns: "repeat(10, 1fr)" }}
      >
        {days.map((day) => {
          const label = formatCellTitle(day);
          const highContrast = isHighContrastLevel(day.level, levels);
          return (
            <div
              key={day.date}
              data-heatmap-cell
              title={label}
              aria-label={label}
              className={cn(
                "aspect-square rounded-[5px] border border-border bg-muted",
                !compact && "flex items-center justify-center font-mono text-[11px] font-bold",
                !compact && (highContrast ? "text-brand-positive-foreground" : "text-heading")
              )}
              style={levelStyle(day.level, levels)}
            >
              {!compact && day.count}
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Moins</span>
          {Array.from({ length: levels + 1 }, (_, level) => level).map((level) => (
            <div key={level} className="flex flex-col items-center gap-0.5">
              <div
                data-legend-cell
                className="size-[11px] rounded-[2px] border border-border bg-muted"
                style={levelStyle(level, levels)}
              />
              <span data-legend-count className="font-mono text-[10px] leading-none">
                {legendCount(level, levels, maxCount)}
              </span>
            </div>
          ))}
          <span>Plus</span>
        </div>
      )}
    </div>
  );
}
