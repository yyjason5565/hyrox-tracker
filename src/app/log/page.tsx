"use client";

import Link from "next/link";
import { Fold } from "@/components/fold";
import { useGuidance } from "@/components/log-insights";
import { useDevice } from "@/components/device-context";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TodayPage() {
  const device = useDevice();
  if (!device.active) return null;
  return <TodayBody profile={device.active} />;
}

function TodayBody({ profile }: { profile: NonNullable<ReturnType<typeof useDevice>["active"]> }) {
  const guidance = useGuidance(profile);

  return (
    <div className="grid gap-5">
      <h1 className="text-[34px] leading-tight font-bold">Today</h1>
      <Link href="/log/new" className={cn(buttonVariants(), "h-14 text-[20px]")}>Log a workout</Link>
      <Fold title="Training tips">
        <p className="font-semibold">{guidance.day.title}</p>
        <ul className="mt-2 grid gap-2 text-[15px] leading-6">
          {guidance.day.lines.map((line) => <li key={line}>{line}</li>)}
          {guidance.day.stationLines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Fold>
    </div>
  );
}
