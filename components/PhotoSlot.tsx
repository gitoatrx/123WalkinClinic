import { cn } from "@/lib/ui";
import { Icon, type IconName } from "./icons";

/**
 * Stand-in for a photo on the live Services page. The live photos are not in
 * this project yet; drop a file into /public/images and pass `src` to show it.
 */
export function PhotoSlot({
  icon,
  label,
  src,
  className,
  tilt = 0,
}: {
  icon: IconName;
  label: string;
  src?: string;
  className?: string;
  tilt?: number;
}) {
  return (
    <div
      className={cn("relative overflow-hidden shadow-lg shadow-slate-900/10", className)}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export
        <img src={src} alt={label} className="size-full object-cover" loading="lazy" />
      ) : (
        <div role="img" aria-label={label} className="grid size-full place-items-center bg-linear-to-br from-[#e6eefc] via-[#f3f6fb] to-[#dff4fa]">
          <span className="grid size-24 place-items-center rounded-full bg-white/80 text-brand-600 shadow-sm">
            <Icon name={icon} className="size-11" />
          </span>
        </div>
      )}
    </div>
  );
}
