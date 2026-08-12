"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportBackupJson, importBackupJson } from "@/app/actions";
import { toast } from "sonner";

const REPLACE_CONFIRM_PHRASE = "REMPLACER";

export function BackupControls() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    content: string;
  } | null>(null);
  const [confirmationText, setConfirmationText] = useState("");

  async function handleExport() {
    setExporting(true);
    const result = await exportBackupJson();
    setExporting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.data.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImport({ fileName: file.name, content: String(reader.result ?? "") });
      setConfirmationText("");
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setImporting(true);
    const result = await importBackupJson(pendingImport.content);
    setImporting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPendingImport(null);
    toast.success(
      `${result.data.importedJobs} candidature${result.data.importedJobs > 1 ? "s" : ""} restaurée${result.data.importedJobs > 1 ? "s" : ""}`
    );
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileSelected}
      />
      <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
        {exporting && <Loader2 className="animate-spin" />}
        Exporter JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        Importer JSON
      </Button>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer toutes les données ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;import de <strong>{pendingImport?.fileName}</strong> va
              effacer définitivement toutes les candidatures, contacts, tags
              et historiques actuels pour les remplacer par le contenu de ce
              fichier. Cette action est irréversible. Tape{" "}
              <strong>{REPLACE_CONFIRM_PHRASE}</strong> pour confirmer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={REPLACE_CONFIRM_PHRASE}
            disabled={importing}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={importing || confirmationText !== REPLACE_CONFIRM_PHRASE}
              onClick={handleConfirmImport}
            >
              {importing && <Loader2 className="animate-spin" />}
              Remplacer toutes les données
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
