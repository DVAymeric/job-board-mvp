// Script ponctuel : importe le référentiel officiel ROME 4.0 (France Travail, open data,
// licence ouverte, aucune authentification requise) et produit un fichier de correspondance
// libellé métier -> code ROME, utilisé par lib/harvester/rome-search.ts. À relancer
// manuellement au rythme des mises à jour officielles (~2x/an, cf. data.gouv.fr).
//
// Combine deux tables de la même archive : le registre des fiches métier (inclut les codes
// "émergents" comme M1405 Data scientist / M1811 Data engineer en entrées de premier rang) et
// la table des appellations courantes (qui route ces mêmes libellés vers un code "parent" plus
// large, M1403/M1802) — les deux sont conservées : une recherche floue sur "data scientist"
// doit pouvoir remonter le code le plus précis (M1405) sans perdre le plus large (M1403).
//
// Usage : npx tsx scripts/import-rome-referentiel.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OPEN_DATA_URL = "https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/json";
const OUTPUT_PATH = join(__dirname, "..", "lib", "harvester", "rome-referentiel.json");

interface AppellationRow {
  libelle: string;
  code_rome_parent: string;
}

interface CodeRomeRow {
  libelle: string;
  code_rome: string;
}

function findEntry(zipPath: string, prefix: string): string {
  const listing = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf-8" });
  const match = listing.split("\n").find((name) => name.startsWith(prefix));
  if (!match) {
    throw new Error(`Fichier ${prefix}*.json introuvable dans l'archive du référentiel ROME`);
  }
  return match;
}

function extractJson<T>(zipPath: string, entryName: string): T[] {
  const raw = execFileSync("unzip", ["-p", zipPath, entryName], { maxBuffer: 64 * 1024 * 1024 });
  // Source en ISO-8859-15 (Latin-9) — confirmé en recoupant les entrées connues "œ/Œ"
  // (ex. "manœuvre", "Œnologue"), corrompues en "½/¼" sous une lecture windows-1252.
  // Le fichier produit ci-dessous est réécrit en UTF-8 standard.
  const text = new TextDecoder("iso-8859-15").decode(raw);
  return JSON.parse(text) as T[];
}

async function main() {
  const response = await fetch(OPEN_DATA_URL);
  if (!response.ok) {
    throw new Error(`Téléchargement du référentiel ROME échoué : HTTP ${response.status}`);
  }
  const zipBuffer = Buffer.from(await response.arrayBuffer());

  const tmpDir = mkdtempSync(join(tmpdir(), "rome-import-"));
  const zipPath = join(tmpDir, "rome-open-data.zip");
  writeFileSync(zipPath, zipBuffer);

  try {
    const codeRomeEntry = findEntry(zipPath, "unix_referentiel_code_rome");
    const appellationEntry = findEntry(zipPath, "unix_referentiel_appellation");

    const codeRomeRows = extractJson<CodeRomeRow>(zipPath, codeRomeEntry);
    const appellationRows = extractJson<AppellationRow>(zipPath, appellationEntry);

    const combined = new Map<string, { libelle: string; code: string }>();
    for (const row of codeRomeRows) {
      const libelle = row.libelle.trim();
      combined.set(`${libelle.toLowerCase()}::${row.code_rome}`, { libelle, code: row.code_rome });
    }
    for (const row of appellationRows) {
      const libelle = row.libelle.trim();
      combined.set(`${libelle.toLowerCase()}::${row.code_rome_parent}`, {
        libelle,
        code: row.code_rome_parent,
      });
    }

    const output = Array.from(combined.values()).sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
    writeFileSync(OUTPUT_PATH, JSON.stringify(output));
    console.log(`Référentiel ROME écrit : ${output.length} entrées -> ${OUTPUT_PATH}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
