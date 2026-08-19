export function harvestEnv(): Record<string, string | undefined> {
  return {
    FRANCE_TRAVAIL_CLIENT_ID: process.env.FRANCE_TRAVAIL_CLIENT_ID,
    FRANCE_TRAVAIL_CLIENT_SECRET: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
    LBA_API_KEY: process.env.LBA_API_KEY,
  };
}
