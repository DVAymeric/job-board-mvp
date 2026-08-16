"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportJobsCsv } from "@/app/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ExportCsvButton({ className }: { className?: string }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const result = await exportJobsCsv();
    setExporting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidatures-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
      className={cn(className)}
    >
      {exporting ? <Loader2 className="animate-spin" /> : <FileDown />}
      Exporter CSV
    </Button>
  );
}
