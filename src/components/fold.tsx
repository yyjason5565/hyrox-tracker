export const FOLDED_SECTIONS = ["Training tips", "Benchmarks", "Food & recovery"] as const;

/** Closed until the person taps or presses the header. Never starts open. */
export function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="ios-group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-muted-foreground">Show</span>
      </summary>
      <div className="border-t border-white/10 px-4 py-3">{children}</div>
    </details>
  );
}
