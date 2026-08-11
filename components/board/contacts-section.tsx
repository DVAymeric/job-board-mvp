"use client";

import { useState } from "react";
import type { Contact } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_ROLE,
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_ORDER,
  ContactRole,
} from "@/lib/constants";
import { addContact, deleteContact, updateContact } from "@/app/actions";
import { toast } from "sonner";

function RoleSelect({
  value,
  onValueChange,
  disabled,
}: {
  value: ContactRole;
  onValueChange: (value: ContactRole) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as ContactRole)}>
      <SelectTrigger disabled={disabled}>
        <SelectValue>
          {(v: ContactRole) => CONTACT_ROLE_LABELS[v] ?? v}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CONTACT_ROLE_ORDER.map((role) => (
          <SelectItem key={role} value={role}>
            {CONTACT_ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ContactRow({
  contact,
  onSaved,
  onDeleted,
}: {
  contact: Contact;
  onSaved: (contact: Contact) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(contact.name);
  const [role, setRole] = useState<ContactRole>(
    (contact.role as ContactRole) ?? CONTACT_ROLE.OTHER
  );
  const [linkedinUrl, setLinkedinUrl] = useState(contact.linkedinUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const changed =
    name !== contact.name ||
    role !== (contact.role ?? CONTACT_ROLE.OTHER) ||
    linkedinUrl !== (contact.linkedinUrl ?? "");

  async function handleSave() {
    setSaving(true);
    const result = await updateContact(contact.id, { name, role, linkedinUrl });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onSaved({ ...contact, name, role, linkedinUrl: linkedinUrl || null });
    toast.success("Contact mis à jour");
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteContact(contact.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDeleted(contact.id);
    toast.success("Contact supprimé");
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border p-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving || deleting}
          placeholder="Nom du contact"
        />
        <RoleSelect value={role} onValueChange={setRole} disabled={saving || deleting} />
      </div>
      <Input
        value={linkedinUrl}
        onChange={(e) => setLinkedinUrl(e.target.value)}
        disabled={saving || deleting}
        placeholder="URL LinkedIn (optionnel)"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={handleDelete}
          disabled={saving || deleting}
          aria-label={`Supprimer le contact ${contact.name}`}
        >
          Supprimer
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || deleting || !changed || !name.trim()}
          aria-label="Enregistrer le contact"
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export function ContactsSection({
  jobId,
  contacts,
  onChange,
}: {
  jobId: string;
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<ContactRole>(CONTACT_ROLE.OTHER);
  const [newLinkedinUrl, setNewLinkedinUrl] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const result = await addContact(jobId, {
      name: newName.trim(),
      role: newRole,
      linkedinUrl: newLinkedinUrl.trim(),
    });
    setAdding(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChange([
      ...contacts,
      {
        id: result.data.contact.id,
        jobId,
        name: result.data.contact.name,
        role: result.data.contact.role,
        linkedinUrl: result.data.contact.linkedinUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    setNewName("");
    setNewRole(CONTACT_ROLE.OTHER);
    setNewLinkedinUrl("");
    toast.success("Contact ajouté");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Contacts</p>
      <div className="space-y-2">
        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            onSaved={(updated) =>
              onChange(contacts.map((c) => (c.id === updated.id ? updated : c)))
            }
            onDeleted={(id) => onChange(contacts.filter((c) => c.id !== id))}
          />
        ))}
      </div>
      <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={adding}
            placeholder="Nom du contact"
          />
          <RoleSelect value={newRole} onValueChange={setNewRole} disabled={adding} />
        </div>
        <Input
          value={newLinkedinUrl}
          onChange={(e) => setNewLinkedinUrl(e.target.value)}
          disabled={adding}
          placeholder="URL LinkedIn (optionnel)"
        />
        <Button
          size="sm"
          className="w-full"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
        >
          Ajouter le contact
        </Button>
      </div>
    </div>
  );
}
