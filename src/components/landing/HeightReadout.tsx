import type { Ref } from "react";

const TICKS = [0, 25, 50, 75, 97];
// Vertical position of a height on the scale; --top/--bottom are the deck and podium in the final frame.
const at = (lift: string) => `calc(var(--top) + (var(--bottom) - var(--top)) * (1 - ${lift}))`;

/** Writes the elevator height into the readout without a React render (called every intro frame). */
export function paintReadout(root: HTMLElement, metres: number) {
  root.style.setProperty("--lift", String(metres / 97));
  root.dataset.arrived = String(metres >= 97);
  const value = root.querySelector("[data-value]");
  if (value) value.textContent = `${Math.round(metres)} м`;
}

/** Places the scale so 0 sits on the podium and 97 on the deck of the rendered tower. */
export function anchorReadout(root: HTMLElement, bottom: number, top: number) {
  root.style.setProperty("--bottom", `${(bottom * 100).toFixed(2)}%`);
  root.style.setProperty("--top", `${(top * 100).toFixed(2)}%`);
}

/** Elevator height scale beside the tower: a thin rule, ticks, and a marker that rides up to the deck. */
export function HeightReadout({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-arrived="false"
      className="group pointer-events-none absolute inset-y-0 left-0 w-44 [--bottom:90%] [--lift:0] [--top:14%]"
    >
      <div className="absolute left-2 w-px bg-input" style={{ top: "var(--top)", bottom: "calc(100% - var(--bottom))" }} />
      {TICKS.map((m) => (
        <span key={m} className="absolute left-2 h-px w-1.5 bg-input" style={{ top: at(String(m / 97)) }} />
      ))}
      <div className="absolute left-2 flex -translate-y-1/2 items-center gap-2" style={{ top: at("var(--lift)") }}>
        <span className="h-0.5 w-4 -translate-x-[7px] bg-sky" />
        <span className="-ml-[7px] flex flex-col leading-tight">
          <span className="font-mono text-sm whitespace-nowrap font-medium text-foreground tabular-nums" data-value>
            0 м
          </span>
          <span className="text-xs whitespace-nowrap text-muted-foreground opacity-0 transition-opacity duration-500 group-data-[arrived=true]:opacity-100 motion-reduce:transition-none">
            смотровая площадка
          </span>
        </span>
      </div>
    </div>
  );
}
