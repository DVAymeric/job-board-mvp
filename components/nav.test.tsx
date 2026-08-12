import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nav } from "@/components/nav";
import { exportJobsCsv } from "@/app/actions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/board",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions", () => ({
  exportJobsCsv: vi.fn(),
  exportBackupJson: vi.fn(),
  importBackupJson: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("Nav — export CSV", () => {
  beforeEach(() => {
    vi.mocked(exportJobsCsv).mockReset();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("triggers a client-side CSV download without navigating away", async () => {
    const user = userEvent.setup();
    vi.mocked(exportJobsCsv).mockResolvedValue({
      ok: true,
      data: { csv: "﻿Titre,Entreprise\r\nDev,Acme" },
    });

    render(<Nav />);
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));

    expect(exportJobsCsv).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows an error toast when the export fails", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    vi.mocked(exportJobsCsv).mockResolvedValue({
      ok: false,
      error: "Impossible de générer l'export CSV",
    });

    render(<Nav />);
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));

    expect(toast.error).toHaveBeenCalledWith("Impossible de générer l'export CSV");
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });
});
