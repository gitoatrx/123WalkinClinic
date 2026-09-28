"use client";

import { useEffect, useRef, useState } from "react";
import type { SpotName } from "./illustrations";

/**
 * Plays one of the live site's Lottie animations from this site's own
 * /public/lottie folder — never from 123walkin.com. Each animation loads when
 * it scrolls near the viewport and pauses when it leaves, so the page stays
 * light with ten of them. Loops and autoplays, as on the live site.
 */
export function Lottie({ src, className, ratio = "1 / 1" }: { src: string; className?: string; ratio?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim: { destroy: () => void; play: () => void; pause: () => void } | undefined;
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const load = async () => {
      const lottie = (await import("lottie-web/build/player/lottie_light")).default;
      if (cancelled) return;
      anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: !reduceMotion,
        autoplay: !reduceMotion,
        path: `/lottie/${src}`,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      (anim as unknown as { addEventListener: (e: string, cb: () => void) => void }).addEventListener("DOMLoaded", () =>
        setLoaded(true),
      );
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!anim) load();
          else if (!reduceMotion) anim.play();
        } else {
          anim?.pause();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      anim?.destroy();
    };
  }, [src]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ aspectRatio: ratio }}
      className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

const spotFiles: Record<SpotName, string> = {
  wave: "wave.json",
  clock: "time.json",
  consult: "consultation.json",
  sneeze: "sneezing.json",
  skin: "acne.json",
  clipboard: "clipboard.json",
  note: "copy.json",
};

/** The small animated icons used for the steps and service cards. */
export function AnimatedSpot({ name, className }: { name: SpotName; className?: string }) {
  return <Lottie src={spotFiles[name]} className={className} />;
}
