import type { Connector } from "@/lib/harvester/connector";
import { francetravailConnector } from "@/lib/harvester/connectors/francetravail/connector";
import { labonnealternanceConnector } from "@/lib/harvester/connectors/labonnealternance/connector";
import { workdayConnector } from "@/lib/harvester/connectors/workday/connector";
import { smartrecruitersConnector } from "@/lib/harvester/connectors/smartrecruiters/connector";

export const ALL_CONNECTORS: Connector[] = [
  francetravailConnector,
  labonnealternanceConnector,
  workdayConnector,
  smartrecruitersConnector,
];
