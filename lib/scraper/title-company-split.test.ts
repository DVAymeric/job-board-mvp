import { describe, expect, it } from "vitest";
import { splitTitleAndCompany } from "@/lib/scraper/title-company-split";

describe("splitTitleAndCompany — Indeed", () => {
  it("strips the trailing ' - Indeed.com' site suffix but never guesses a company", () => {
    // Cas réel (JOB-parsing) : aucune og:site_name sur Indeed, et le <title>
    // n'a aucun marqueur fiable distinguant l'entreprise du reste — parfois
    // elle est en tête ("HOLOGARDE - ..."), parfois totalement absente
    // ("Développeur Web Full Stack (H/F) - Clermont-Ferrand (63) - ...").
    // Deviner à moitié faux est pire que de laisser vide (consigne produit).
    const raw = "HOLOGARDE - Développeur Full Stack Confirmé F/H - Orly (94) - Indeed.com";
    const result = splitTitleAndCompany(raw, "https://fr.indeed.com/viewjob?jk=abc");
    expect(result.companyName).toBeNull();
    expect(result.title).toBe("HOLOGARDE - Développeur Full Stack Confirmé F/H - Orly (94)");
  });

  it("strips the site suffix when no company is present in the title either", () => {
    const raw = "Développeur Web Full Stack (H/F) - Clermont-Ferrand (63) - Indeed.com";
    const result = splitTitleAndCompany(raw, "https://fr.indeed.com/viewjob?jk=abc");
    expect(result.companyName).toBeNull();
    expect(result.title).toBe("Développeur Web Full Stack (H/F) - Clermont-Ferrand (63)");
  });

  it("handles the '|' suffix variant", () => {
    const raw = "Développeur Python | Indeed.com";
    expect(splitTitleAndCompany(raw, "https://www.indeed.com/viewjob?jk=abc")).toEqual({
      title: "Développeur Python",
      companyName: null,
    });
  });
});

describe("splitTitleAndCompany — LinkedIn", () => {
  it("extracts the company before 'recrute pour des postes de' and strips the trailing location + site name", () => {
    const raw =
      "Euro-Information recrute pour des postes de DEVELOPPEUR FULL STACK (H/F) (Nantes, Pays de la Loire, France) | LinkedIn";
    const result = splitTitleAndCompany(raw, "https://fr.linkedin.com/jobs/view/123");
    expect(result.companyName).toBe("Euro-Information");
    expect(result.title).toBe("DEVELOPPEUR FULL STACK (H/F)");
  });

  it("does not strip a parenthesised group that belongs to the title itself, only the trailing location", () => {
    // Piège réel : deux groupes entre parenthèses, un seul est le lieu.
    const raw =
      "SUBLIME recrute pour des postes de Développeur/se Fullstack (Node.js/PHP) (Paris, Île-de-France, France) | LinkedIn";
    const result = splitTitleAndCompany(raw, "https://fr.linkedin.com/jobs/view/123");
    expect(result.companyName).toBe("SUBLIME");
    expect(result.title).toBe("Développeur/se Fullstack (Node.js/PHP)");
  });

  it("does not over-split when the job title itself contains dashes", () => {
    const raw =
      "Lity recrute pour des postes de Développeur full stack - Plateforme engagement communautaire - Full remote (France) | LinkedIn";
    const result = splitTitleAndCompany(raw, "https://fr.linkedin.com/jobs/view/123");
    expect(result.companyName).toBe("Lity");
    expect(result.title).toBe(
      "Développeur full stack - Plateforme engagement communautaire - Full remote"
    );
  });

  it("handles a title with no trailing location group", () => {
    const raw = "AGIRIS-EIC recrute pour des postes de Développeur Full Stack H/F | LinkedIn";
    const result = splitTitleAndCompany(raw, "https://linkedin.com/jobs/view/123");
    expect(result.companyName).toBe("AGIRIS-EIC");
    expect(result.title).toBe("Développeur Full Stack H/F");
  });
});

describe("splitTitleAndCompany — Welcome to the Jungle", () => {
  it("extracts the company immediately preceding the contract-type keyword", () => {
    const raw = "Développeur Fullstack (F/H) - Meritis - CDI à Lille";
    const result = splitTitleAndCompany(
      raw,
      "https://www.welcometothejungle.com/fr/companies/meritis/jobs/xyz"
    );
    expect(result.companyName).toBe("Meritis");
    expect(result.title).toBe("Développeur Fullstack (F/H)");
  });

  it("does not over-split when the job title itself contains multiple dashes", () => {
    // Piège réel : le titre a deux tirets avant l'entreprise — seul le mot-clé
    // de contrat final permet d'ancrer la coupure au bon endroit.
    const raw = "Développeur iOS E-commerce - Confirmé - (H/F) - The One Studio - CDI à Paris";
    const result = splitTitleAndCompany(
      raw,
      "https://www.welcometothejungle.com/fr/companies/the-one-studio/jobs/xyz"
    );
    expect(result.companyName).toBe("The One Studio");
    expect(result.title).toBe("Développeur iOS E-commerce - Confirmé - (H/F)");
  });

  it("recognizes Freelance as a contract-type anchor, even with extra trailing segments", () => {
    const raw = "Développeur Freelance - Mentor - HF - LiveMentor - Freelance - Télétravail total";
    const result = splitTitleAndCompany(
      raw,
      "https://www.welcometothejungle.com/fr/companies/livementor/jobs/xyz"
    );
    expect(result.companyName).toBe("LiveMentor");
    expect(result.title).toBe("Développeur Freelance - Mentor - HF");
  });

  it("leaves the company null when no known contract-type keyword anchors the title", () => {
    const raw = "Développeur Fullstack - Meritis";
    const result = splitTitleAndCompany(
      raw,
      "https://www.welcometothejungle.com/fr/companies/meritis/jobs/xyz"
    );
    expect(result.companyName).toBeNull();
    expect(result.title).toBe(raw);
  });
});

describe("splitTitleAndCompany — sites inconnus (repli générique)", () => {
  it("extracts the company after 'chez'", () => {
    const raw = "Développeur Backend chez Acme Corp";
    expect(splitTitleAndCompany(raw, "https://careers.example.com/jobs/42")).toEqual({
      title: "Développeur Backend",
      companyName: "Acme Corp",
    });
  });

  it("extracts the company before 'recrute'", () => {
    const raw = "Acme Corp recrute un·e Développeur Backend";
    expect(splitTitleAndCompany(raw, "https://careers.example.com/jobs/42")).toEqual({
      title: "Développeur Backend",
      companyName: "Acme Corp",
    });
  });

  it("leaves the title untouched and the company null when no directional keyword is found", () => {
    // Un simple séparateur (-, |, :) sans mot-clé directionnel ne permet pas
    // de deviner l'ordre poste/entreprise de façon fiable sur un site
    // inconnu — mieux vaut ne rien extraire que se tromper.
    const raw = "Développeur Backend - Acme Corp";
    expect(splitTitleAndCompany(raw, "https://careers.example.com/jobs/42")).toEqual({
      title: "Développeur Backend - Acme Corp",
      companyName: null,
    });
  });

  it("handles an invalid URL gracefully by falling back to the generic rule", () => {
    const raw = "Développeur Backend chez Acme Corp";
    expect(splitTitleAndCompany(raw, "not-a-valid-url")).toEqual({
      title: "Développeur Backend",
      companyName: "Acme Corp",
    });
  });
});
