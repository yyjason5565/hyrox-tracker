"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDevice } from "@/components/device-context";
import { LOCAL_LOCK_NOTICE } from "@/lib/local-lock";

export default function AccountPage() {
  const device = useDevice();
  const router = useRouter();
  const [name, setName] = useState(device.active?.name ?? "");
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="grid max-w-lg gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="text-sm text-muted-foreground">{LOCAL_LOCK_NOTICE}</p>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          device.rename(name);
          setMessage("Name saved on this browser.");
        }}
      >
        <Label htmlFor="person">Name</Label>
        <Input id="person" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" className="h-11">Save name</Button>
      </form>
      <form
        className="grid gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (passphrase.trim().length < 4) {
            setMessage("Use at least 4 characters. This is only a local screen lock.");
            return;
          }
          await device.setLock(passphrase);
          setPassphrase("");
          setMessage("Local lock saved. The passphrase itself is not stored.");
        }}
      >
        <Label htmlFor="lock">{device.active?.lock ? "Replace local lock" : "Optional local lock"}</Label>
        <Input id="lock" type="password" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
        <Button type="submit" className="h-11">Save local lock</Button>
      </form>
      {device.active?.lock ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => { device.removeLock(); setMessage("Local lock removed. The sessions were already stored without encryption."); }}>
          Remove local lock
        </Button>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        className="h-11"
        onClick={() => {
          if (!window.confirm("Erase this person and their sessions from this browser?")) return;
          device.eraseActive();
          router.push("/");
        }}
      >
        Erase this profile from this browser
      </Button>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
