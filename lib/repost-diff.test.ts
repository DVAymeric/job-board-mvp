import { describe, expect, it } from "vitest";
import { diffLines, hasContentChanged } from "@/lib/repost-diff";

describe("hasContentChanged", () => {
  it("returns false when both texts are null", () => {
    expect(hasContentChanged(null, null)).toBe(false);
  });

  it("returns false when the texts are identical", () => {
    expect(hasContentChanged("Poste de développeur", "Poste de développeur")).toBe(
      false
    );
  });

  it("ignores surrounding whitespace differences", () => {
    expect(hasContentChanged("  Poste  ", "Poste")).toBe(false);
  });

  it("returns true when the old text is null but the new one is not", () => {
    expect(hasContentChanged(null, "Nouveau contenu")).toBe(true);
  });

  it("returns true when the content differs", () => {
    expect(hasContentChanged("Ancien contenu", "Nouveau contenu")).toBe(true);
  });
});

describe("diffLines", () => {
  it("marks every line unchanged when the texts are identical", () => {
    const result = diffLines("Ligne 1\nLigne 2", "Ligne 1\nLigne 2");
    expect(result).toEqual([
      { type: "unchanged", text: "Ligne 1" },
      { type: "unchanged", text: "Ligne 2" },
    ]);
  });

  it("detects an added line", () => {
    const result = diffLines("Ligne 1", "Ligne 1\nLigne 2");
    expect(result).toEqual([
      { type: "unchanged", text: "Ligne 1" },
      { type: "added", text: "Ligne 2" },
    ]);
  });

  it("detects a removed line", () => {
    const result = diffLines("Ligne 1\nLigne 2", "Ligne 1");
    expect(result).toEqual([
      { type: "unchanged", text: "Ligne 1" },
      { type: "removed", text: "Ligne 2" },
    ]);
  });

  it("detects a changed line as a removal followed by an addition", () => {
    const result = diffLines("Salaire : 40k€", "Salaire : 45k€");
    expect(result).toEqual([
      { type: "removed", text: "Salaire : 40k€" },
      { type: "added", text: "Salaire : 45k€" },
    ]);
  });

  it("keeps unchanged context around a modification in the middle", () => {
    const oldText = "Intro\nSalaire : 40k€\nConclusion";
    const newText = "Intro\nSalaire : 45k€\nConclusion";
    const result = diffLines(oldText, newText);
    expect(result).toEqual([
      { type: "unchanged", text: "Intro" },
      { type: "removed", text: "Salaire : 40k€" },
      { type: "added", text: "Salaire : 45k€" },
      { type: "unchanged", text: "Conclusion" },
    ]);
  });

  it("treats a null old text as an entirely new document", () => {
    const result = diffLines(null, "Ligne 1\nLigne 2");
    expect(result).toEqual([
      { type: "added", text: "Ligne 1" },
      { type: "added", text: "Ligne 2" },
    ]);
  });

  it("returns an empty array when both texts are null or empty", () => {
    expect(diffLines(null, null)).toEqual([]);
    expect(diffLines("", "")).toEqual([]);
  });
});
