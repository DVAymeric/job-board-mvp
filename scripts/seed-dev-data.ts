// Script d'outillage dev (JOB-132) : peuple un compte de test avec des
// candidatures réalistes pour que le Board, l'Analytics et le bloc "Aperçu"
// (bento) de l'Accueil soient exploitables en QA visuelle sans devoir
// coller manuellement des offres une par une. Idempotent par purge : toutes
// les URLs générées partagent le préfixe SEED_URL_PREFIX, supprimées avant
// chaque exécution, donc rejouable sans dupliquer ni accumuler.
//
// Hors périmètre explicite : ne touche ni aux campagnes Harvester ni aux
// offres collectées (Recherche) — ces écrans restent vides par décision
// produit actuelle (voir JOB-132).
//
// Usage : npx tsx scripts/seed-dev-data.ts <email-utilisateur>
import { PrismaClient } from "@prisma/client";
import { STATUS, type JobStatus } from "@/lib/constants";

const SEED_URL_PREFIX = "https://seed.jobtracker.local/offre-";
const WINDOW_DAYS = 30;

interface SeedJobSpec {
  daysAgo: number;
  status: JobStatus;
  title: string;
  companyName: string;
  contractType: "CDI" | "CDD" | "ALTERNANCE" | "STAGE" | null;
}

// Étalé sur les 30 derniers jours avec des jours à 0 et des jours à 3-5+
// pour exercer toute l'échelle de couleur de la heatmap (JOB-126), et les 4
// statuts représentés pour peupler chaque colonne du Kanban.
const SEED_JOBS: SeedJobSpec[] = [
  { daysAgo: 29, status: STATUS.APPLIED, title: "Développeur·se Frontend", companyName: "Atelier Nova", contractType: "CDI" },
  { daysAgo: 28, status: STATUS.APPLIED, title: "Assistant RH", companyName: "Groupe Lever", contractType: "CDD" },
  { daysAgo: 26, status: STATUS.REJECTED, title: "Chargé·e de recrutement", companyName: "Ville de Reims", contractType: "CDI" },
  { daysAgo: 22, status: STATUS.APPLIED, title: "Data Analyst", companyName: "Nexora Group", contractType: "CDI" },
  { daysAgo: 20, status: STATUS.APPLIED, title: "Alternant·e Support IT", companyName: "Mutuelle Cadence", contractType: "ALTERNANCE" },
  { daysAgo: 20, status: STATUS.TO_APPLY, title: "Développeur·se Backend", companyName: "Studio Lieu-dit", contractType: "CDI" },
  { daysAgo: 20, status: STATUS.APPLIED, title: "Chef·fe de projet digital", companyName: "Atelier Territoire", contractType: "CDD" },
  { daysAgo: 15, status: STATUS.INTERVIEW, title: "Ingénieur·e Full-Stack", companyName: "Lycée Bellevue", contractType: "CDI" },
  { daysAgo: 12, status: STATUS.TO_APPLY, title: "UX Designer", companyName: "Atelier Nova", contractType: "CDD" },
  { daysAgo: 8, status: STATUS.APPLIED, title: "Product Manager", companyName: "Groupe Lever", contractType: "CDI" },
  { daysAgo: 5, status: STATUS.APPLIED, title: "Ingénieur·e QA", companyName: "Nexora Group", contractType: "CDI" },
  { daysAgo: 5, status: STATUS.TO_APPLY, title: "Développeur·se Mobile", companyName: "Studio Lieu-dit", contractType: "STAGE" },
  { daysAgo: 5, status: STATUS.APPLIED, title: "Chargée de mission", companyName: "Mutuelle Cadence", contractType: null },
  { daysAgo: 3, status: STATUS.TO_APPLY, title: "Développeur·se Python", companyName: "Atelier Territoire", contractType: "CDI" },
  { daysAgo: 1, status: STATUS.TO_APPLY, title: "Scrum Master", companyName: "Ville de Reims", contractType: "CDI" },
];

function daysAgoToDate(daysAgo: number, today: Date): Date {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() - daysAgo);
  return date;
}

export async function seedDevData(
  email: string,
  prisma: Pick<PrismaClient, "user" | "job">,
  today: Date = new Date()
): Promise<{ userId: string; created: number }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Aucun utilisateur trouvé pour l'email "${email}" — crée d'abord un compte via /register.`);
  }

  // Purge des jobs de seed précédents (préfixe d'URL dédié) : idempotent,
  // ne touche jamais aux vraies candidatures de l'utilisateur.
  await prisma.job.deleteMany({
    where: { userId: user.id, url: { startsWith: SEED_URL_PREFIX } },
  });

  const oldestAllowed = daysAgoToDate(WINDOW_DAYS - 1, today);
  const inWindow = SEED_JOBS.filter((job) => daysAgoToDate(job.daysAgo, today) >= oldestAllowed);

  await prisma.job.createMany({
    data: inWindow.map((job, index) => ({
      userId: user.id,
      url: `${SEED_URL_PREFIX}${index}`,
      title: job.title,
      companyName: job.companyName,
      status: job.status,
      contractType: job.contractType,
      enrichmentStatus: "DONE",
      createdAt: daysAgoToDate(job.daysAgo, today),
    })),
  });

  return { userId: user.id, created: inWindow.length };
}

async function main() {
  const [, , email] = process.argv;
  if (!email) {
    throw new Error("usage: seed-dev-data.ts <email-utilisateur>");
  }
  const prisma = new PrismaClient();
  try {
    const result = await seedDevData(email, prisma);
    console.log(`${result.created} candidature(s) de test créée(s) pour l'utilisateur ${result.userId}.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-dev-data.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
