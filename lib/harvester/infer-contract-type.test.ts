import { describe, it, expect } from "vitest";
import { inferContractTypeFromText } from "@/lib/harvester/infer-contract-type";

describe("inferContractTypeFromText", () => {
  it("detects apprentissage", () => {
    expect(inferContractTypeFromText("Alternant en contrat d'apprentissage")).toBe("apprentissage");
  });

  it("detects professionnalisation", () => {
    expect(inferContractTypeFromText("Contrat de professionnalisation proposé")).toBe("professionnalisation");
  });

  it("falls back to autre when nothing matches", () => {
    expect(inferContractTypeFromText("Poste ouvert, type à préciser")).toBe("autre");
  });

  it("detects cdi (JOB-78-bis)", () => {
    expect(inferContractTypeFromText("Poste en CDI, statut cadre")).toBe("cdi");
  });

  it("detects cdd (JOB-78-bis)", () => {
    expect(inferContractTypeFromText("Contrat CDD de 6 mois")).toBe("cdd");
  });

  it("does not match cdi/cdd as a substring inside an unrelated word", () => {
    expect(inferContractTypeFromText("Décideur et acteur du changement")).toBe("autre");
  });

  it("maps the generic word alternance/alternant to apprentissage (JOB-33)", () => {
    expect(inferContractTypeFromText("Alternant Data Analyst")).toBe("apprentissage");
    expect(inferContractTypeFromText("Poste en alternance de 12 mois")).toBe("apprentissage");
  });

  it("detects stage (JOB-72)", () => {
    expect(inferContractTypeFromText("Stage de 6 mois en marketing")).toBe("stage");
    expect(inferContractTypeFromText("Offre de stage étudiant")).toBe("stage");
    expect(inferContractTypeFromText("STAGE - Assistant RH")).toBe("stage");
  });
});
