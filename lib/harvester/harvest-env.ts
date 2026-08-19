export function harvestEnv(): Record<string, string | undefined> {
  return {
    FRANCE_TRAVAIL_CLIENT_ID: process.env.FRANCE_TRAVAIL_CLIENT_ID,
    FRANCE_TRAVAIL_CLIENT_SECRET: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
    LBA_API_KEY: process.env.LBA_API_KEY,
    // JOB-57 : welcometothejungleConnector.fetch() les lit depuis ctx.env (pas process.env
    // directement, contrairement à son propre supports()/healthCheck()) — sans cette entrée,
    // le connecteur passerait supports() (qui lit process.env) mais échouerait dès fetch().
    WTTJ_ALGOLIA_APP_ID: process.env.WTTJ_ALGOLIA_APP_ID,
    WTTJ_ALGOLIA_API_KEY: process.env.WTTJ_ALGOLIA_API_KEY,
  };
}
