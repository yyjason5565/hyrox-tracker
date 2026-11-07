"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataWarning } from "@/components/data-warning";
import { useDevice } from "@/components/device-context";
import { LOCAL_LOCK_NOTICE } from "@/lib/local-lock";
import { SEGMENTS } from "@/lib/segments";

export default function HomePage() {
  const router = useRouter();
  const device = useDevice();
  const [name, setName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!device.ready) return <main className="mx-auto max-w-3xl px-4 py-10">Loading this browser…</main>;

  function openProfile(profileId: string) {
    device.selectProfile(profileId);
    const profile = device.data.profiles.find((item) => item.id === profileId);
    if (!profile) return;
    if (profile.lock === null || (device.unlocked && device.active?.id === profileId)) router.push("/log");
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    const ok = await device.unlock(passphrase);
    setPassphrase("");
    if (!ok) {
      setMessage("That passphrase does not match this profile's local lock.");
      return;
    }
    router.push("/log");
  }

  const selected = device.active;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <DataWarning />
      <div>
        <p className="text-sm font-medium tracking-wide text-primary uppercase">On this device</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Lane Ledger</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A private training log for men’s open singles work. Add a name for each person who uses this browser. Their sessions stay on this device only.
        </p>
      </div>
      {device.unreadable ? (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p>Saved data in this browser could not be read. Nothing was overwritten.</p>
          <Button type="button" className="mt-3 h-11" onClick={() => window.confirm("Erase the unreadable data and start empty on this browser?") && device.resetEmpty()}>
            Start empty on this browser
          </Button>
        </div>
      ) : null}
      <section className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold">People on this browser</h2>
        {device.data.profiles.length === 0 ? <p className="text-sm text-muted-foreground">No one is saved here yet.</p> : null}
        <ul className="grid gap-2">
          {device.data.profiles.map((profile) => (
            <li key={profile.id}>
              <button type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left ring-1 ring-foreground/10" onClick={() => openProfile(profile.id)}>
                <span>{profile.name}</span>
                <span className="text-sm text-muted-foreground">{profile.lock ? "Local lock" : "No lock"} · {profile.sessions.length} sessions</span>
              </button>
            </li>
          ))}
        </ul>
        {selected?.lock && !device.unlocked ? (
          <form className="grid gap-3 border-t border-border pt-3" onSubmit={unlock}>
            <p className="text-sm">{LOCAL_LOCK_NOTICE}</p>
            <Label htmlFor="passphrase">Passphrase for {selected.name}</Label>
            <Input id="passphrase" type="password" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
            {message ? <p className="text-sm text-destructive">{message}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="h-11">Show this log</Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11"
                onClick={() => {
                  if (window.confirm(`Erase ${selected.name} and their sessions from this browser? This cannot be undone.`)) device.eraseActive();
                }}
              >
                Erase this profile
              </Button>
            </div>
          </form>
        ) : null}
        <form
          className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            device.createProfile(name.trim());
            setName("");
            router.push("/log");
          }}
        >
          <Input aria-label="Person's name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" className="h-11">Add person</Button>
        </form>
      </section>
      <ol className="grid gap-2 text-sm sm:grid-cols-2">
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="rounded-lg bg-card px-3 py-2 ring-1 ring-foreground/10">
            <span className="text-muted-foreground">{segment.order}. </span>
            {segment.name}
            <span className="block text-muted-foreground">{segment.detail}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
