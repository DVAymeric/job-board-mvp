import { getHarvesterProofStats } from "@/lib/harvester/proof-stats";
import { StatTile } from "@/components/analytics/stat-tile";

// Bande de preuve vivante du Harvester (JOB-140), en remplacement de
// TrustRow/FeatureGrid : chiffres calculés à chaque rendu depuis les offres
// réellement collectées, pas de valeurs codées en dur.
export async function HarvesterProofBar() {
  const stats = await getHarvesterProofStats();
  const sourceCount = stats.sourceLabels.length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Offres agrégées" value={stats.totalOffers.toLocaleString("fr-FR")} />
        <StatTile
          label="Trouvées cette semaine"
          value={stats.newThisWeek.toLocaleString("fr-FR")}
        />
        <StatTile
          label={sourceCount > 1 ? "Sources couvertes" : "Source couverte"}
          value={sourceCount}
        />
      </div>
      {sourceCount > 0 && (
        <p className="text-sm text-muted-foreground">{stats.sourceLabels.join(" · ")}</p>
      )}
    </div>
  );
}
