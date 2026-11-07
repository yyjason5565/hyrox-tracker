"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataWarning } from "@/components/data-warning";
import { useDevice } from "@/components/device-context";
import { exportProfile } from "@/lib/device-store";

export default function BackupPage() {
  const device = useDevice();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asNew, setAsNew] = useState(false);

  function download() {
    if (!device.active) return;
    const payload = exportProfile(device.active);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lane-ledger-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setError(null);
    setMessage("Downloaded this profile only. The file contains the sessions in readable JSON. It does not contain a passphrase.");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMessage(null);
    const text = await file.text();
    if (text.length > 1_000_000) {
      setError("That file is too large.");
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      setError("That file is not JSON.");
      return;
    }
    const result = device.importFile(body, asNew);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(`Imported ${result.imported} session${result.imported === 1 ? "" : "s"} onto this device.`);
  }

  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Backup</h1>
      <DataWarning />
      <p className="text-sm text-muted-foreground">Export is a JSON file for this profile. Import adds those sessions to the profile you choose. There is no online account to attach them to. Older files that use the existing backup format still import.</p>
      <Button type="button" className="h-11" onClick={download}>Download this profile</Button>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={asNew} onChange={(event) => setAsNew(event.target.checked)} />
        Import as a new person on this browser
      </label>
      <label className="grid gap-2 text-sm">
        <span>Import a backup JSON file</span>
        <input type="file" accept="application/json,.json" onChange={(event) => onFile(event.target.files?.[0])} />
      </label>
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
