export const DEVICE_NOTICE =
  "Workouts stay on this device. There is no account and no sign-in. Export a backup from Profile if you want a copy.";

export function DeviceNotice() {
  return <p className="px-1 text-center text-[13px] leading-5 text-muted-foreground">{DEVICE_NOTICE}</p>;
}
