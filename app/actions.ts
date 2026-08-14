// Barrel de ré-export (JOB-58) : les Server Actions vivent désormais dans
// app/actions/<domaine>.ts (jobs-create, jobs-lifecycle, jobs-details, tags,
// contacts, backup, scraping), chacune avec son propre "use server". Ce
// fichier n'en définit aucune lui-même — il garde stable le point d'import
// `@/app/actions` déjà utilisé dans toute l'app, sans avoir à réécrire
// chaque site d'appel.
export * from "@/app/actions/jobs-create";
export * from "@/app/actions/jobs-lifecycle";
export * from "@/app/actions/jobs-details";
export * from "@/app/actions/tags";
export * from "@/app/actions/contacts";
export * from "@/app/actions/backup";
export * from "@/app/actions/scraping";
