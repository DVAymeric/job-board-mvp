import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupControls } from "@/components/backup/backup-controls";
import { exportBackupJson, importBackupJson } from "@/app/actions";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/app/actions", () => ({
  exportBackupJson: vi.fn(),
  importBackupJson: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeJsonFile(content: string, name = "sauvegarde.json") {
  return new File([content], name, { type: "application/json" });
}

describe("BackupControls — export", () => {
  beforeEach(() => {
    vi.mocked(exportBackupJson).mockReset();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("triggers a client-side JSON download", async () => {
    const user = userEvent.setup();
    vi.mocked(exportBackupJson).mockResolvedValue({
      ok: true,
      data: { json: '{"schemaVersion":1}' },
    });

    render(<BackupControls />);
    await user.click(screen.getByRole("button", { name: "Exporter JSON" }));

    expect(exportBackupJson).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
});

describe("BackupControls — import", () => {
  beforeEach(() => {
    vi.mocked(importBackupJson).mockReset();
    refreshMock.mockReset();
  });

  it("shows a destructive warning before importing, disabled until confirmed", async () => {
    const user = userEvent.setup();
    const { container } = render(<BackupControls />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, makeJsonFile('{"schemaVersion":1}'));

    expect(await screen.findByText(/irréversible/i)).toBeInTheDocument();
    expect(importBackupJson).not.toHaveBeenCalled();

    const confirmButton = screen.getByRole("button", {
      name: "Remplacer toutes les données",
    });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("REMPLACER"), "REMPLACER");
    expect(confirmButton).toBeEnabled();
  });

  it("imports only after typing the confirmation phrase, then refreshes", async () => {
    const user = userEvent.setup();
    vi.mocked(importBackupJson).mockResolvedValue({
      ok: true,
      data: { importedJobs: 3 },
    });
    const { container } = render(<BackupControls />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, makeJsonFile('{"schemaVersion":1,"jobs":[]}'));

    await screen.findByText(/irréversible/i);
    await user.type(screen.getByPlaceholderText("REMPLACER"), "REMPLACER");
    await user.click(
      screen.getByRole("button", { name: "Remplacer toutes les données" })
    );

    expect(importBackupJson).toHaveBeenCalledWith('{"schemaVersion":1,"jobs":[]}');
    expect(refreshMock).toHaveBeenCalled();
  });

  it("cancelling the warning does not import", async () => {
    const user = userEvent.setup();
    const { container } = render(<BackupControls />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, makeJsonFile('{"schemaVersion":1}'));

    await screen.findByText(/irréversible/i);
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(importBackupJson).not.toHaveBeenCalled();
  });
});
