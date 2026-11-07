"use client";

import { Popover } from "@base-ui/react/popover";

export const RPE_HELP =
  "RPE = Rating of Perceived Exertion: how hard the whole session felt, from 1 to 10. 2\u20133 easy, comfortable conversation; 4\u20136 moderate to challenging but controlled; 7\u20138 hard, only a few words between breaths; 9\u201310 near-maximal to all-out. Rate the whole session, not just the hardest moment.";

export function RpeHelp() {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label="What is RPE?"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        ?
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          positionMethod="fixed"
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }}
          className="z-50 outline-none"
        >
          <Popover.Popup
            className="max-h-[min(70dvh,20rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl bg-popover p-3 text-sm text-pretty text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none"
          >
            <Popover.Title className="font-medium">What is RPE?</Popover.Title>
            <Popover.Description className="mt-2">{RPE_HELP}</Popover.Description>
            <Popover.Close
              type="button"
              className="mt-3 inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium ring-1 ring-foreground/15"
            >
              Close
            </Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
