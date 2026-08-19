import type { Connector } from "@/lib/harvester/connector";
import { francetravailConnector } from "@/lib/harvester/connectors/francetravail/connector";
import { labonnealternanceConnector } from "@/lib/harvester/connectors/labonnealternance/connector";
import { workdayConnector } from "@/lib/harvester/connectors/workday/connector";
import { smartrecruitersConnector } from "@/lib/harvester/connectors/smartrecruiters/connector";
import { welcometothejungleConnector } from "@/lib/harvester/connectors/welcometothejungle/connector";
import { talentsoftConnector } from "@/lib/harvester/connectors/talentsoft/connector";
import { digitalRecruitersConnector } from "@/lib/harvester/connectors/digitalrecruiters/connector";
import { jsonldGenericConnector } from "@/lib/harvester/connectors/jsonld-generic/connector";
import { sitemapCrawlerConnector } from "@/lib/harvester/connectors/sitemap-crawler/connector";

export const ALL_CONNECTORS: Connector[] = [
  francetravailConnector,
  labonnealternanceConnector,
  workdayConnector,
  smartrecruitersConnector,
  welcometothejungleConnector,
  talentsoftConnector,
  digitalRecruitersConnector,
  jsonldGenericConnector,
  sitemapCrawlerConnector,
];
