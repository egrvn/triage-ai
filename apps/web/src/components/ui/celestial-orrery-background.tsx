import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type CelestialOrreryBackgroundProps = ComponentProps<"div"> & {
  intensity?: "subtle" | "normal" | "strong";
};

const glyphs = ["●", "✦", "◆", "◇", "✧", "○", "•", "✶"];
const orbits = [
  { className: "orbit orbit--one", planets: ["planet planet--mint", "planet planet--small"] },
  { className: "orbit orbit--two", planets: ["planet planet--blue", "planet planet--small planet--delay"] },
  { className: "orbit orbit--three", planets: ["planet planet--violet", "planet planet--wide"] },
  { className: "orbit orbit--four", planets: ["planet planet--amber", "planet planet--small planet--delay"] }
];

export function CelestialOrreryBackground({
  className,
  intensity = "normal",
  ...props
}: CelestialOrreryBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("celestial-orrery", `celestial-orrery--${intensity}`, className)}
      {...props}
    >
      <div className="hero-orrery">
        <div className="glyph-field">
          {glyphs.map((glyph, index) => (
            <span key={`${glyph}-${index}`} className={`glyph-container glyph-container--${index + 1}`}>
              <span className="glyph-part" data-glyph={glyph} />
            </span>
          ))}
        </div>
        <div className="orrery-field">
          {orbits.map((orbit) => (
            <div key={orbit.className} className={orbit.className}>
              {orbit.planets.map((planet, index) => (
                <span key={`${planet}-${index}`} className={planet} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
