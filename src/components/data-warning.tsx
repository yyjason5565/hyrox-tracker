export function DataWarning() {
  return (
    <aside className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
      Sessions stay in this browser on this device. Lane Ledger has no account and no server, and nothing is synced.
      Clearing this site’s data, using private browsing, or switching browsers removes the log unless you exported a JSON backup.
      Someone else who opens the same link starts with an empty tracker of their own.
    </aside>
  );
}
