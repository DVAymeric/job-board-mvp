import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Contact } from "@prisma/client";
import { ContactsSection } from "@/components/board/contacts-section";
import { addContact, deleteContact, updateContact } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  addContact: vi.fn(),
  deleteContact: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function contact(overrides: Partial<Contact>): Contact {
  return {
    id: "contact-1",
    jobId: "job-1",
    name: "Jane Doe",
    role: "RECRUITER",
    linkedinUrl: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("ContactsSection", () => {
  beforeEach(() => {
    vi.mocked(addContact).mockReset();
    vi.mocked(updateContact).mockReset();
    vi.mocked(deleteContact).mockReset();
  });

  it("lists existing contacts with their role", () => {
    render(
      <ContactsSection jobId="job-1" contacts={[contact({})]} onChange={vi.fn()} />
    );
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
  });

  it("adds a new contact", async () => {
    const user = userEvent.setup();
    const newContact = {
      id: "contact-2",
      name: "John Smith",
      role: "MANAGER",
      linkedinUrl: null,
    };
    vi.mocked(addContact).mockResolvedValue({
      ok: true,
      data: { contact: newContact },
    });
    const onChange = vi.fn();

    render(<ContactsSection jobId="job-1" contacts={[]} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText("Nom du contact"), "John Smith");
    await user.click(screen.getByRole("button", { name: "Ajouter le contact" }));

    expect(addContact).toHaveBeenCalledWith("job-1", {
      name: "John Smith",
      role: "OTHER",
      linkedinUrl: "",
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "contact-2", name: "John Smith" }),
    ]);
  });

  it("saves an edited contact", async () => {
    const user = userEvent.setup();
    vi.mocked(updateContact).mockResolvedValue({ ok: true, data: null });
    const onChange = vi.fn();

    render(
      <ContactsSection jobId="job-1" contacts={[contact({})]} onChange={onChange} />
    );

    const nameInput = screen.getByDisplayValue("Jane Doe");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Updated");
    await user.click(screen.getByRole("button", { name: "Enregistrer le contact" }));

    expect(updateContact).toHaveBeenCalledWith("contact-1", {
      name: "Jane Updated",
      role: "RECRUITER",
      linkedinUrl: "",
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "contact-1", name: "Jane Updated" }),
    ]);
  });

  it("deletes a contact", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteContact).mockResolvedValue({ ok: true, data: null });
    const onChange = vi.fn();

    render(
      <ContactsSection jobId="job-1" contacts={[contact({})]} onChange={onChange} />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer le contact Jane Doe" }));

    expect(deleteContact).toHaveBeenCalledWith("contact-1");
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
