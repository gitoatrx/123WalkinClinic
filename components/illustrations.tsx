// Original flat illustrations in the live site's palette. They stand in for the
// live site's Lottie animations, which stay on 123walkin.com and are never loaded.

const navy = "#14214a";
const gold = "#c18700";
const teal = "#5bbfc0";
const sky = "#bee2ea";
const skin = "#f1b894";
const skinDark = "#c98a67";
const coral = "#e8645a";
const sand = "#e9dcc9";
const green = "#6fb28a";

type ArtProps = { className?: string };

export function HeroArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 500 520" className={className} aria-hidden="true">
      {/* skyline */}
      <g fill={sand} opacity="0.9">
        <rect x="40" y="250" width="46" height="170" rx="3" />
        <rect x="92" y="200" width="38" height="220" rx="3" />
        <rect x="136" y="280" width="52" height="140" rx="3" />
        <rect x="330" y="230" width="44" height="190" rx="3" />
        <rect x="380" y="270" width="60" height="150" rx="3" />
        <path d="M101 200 111 170 121 200Z" />
      </g>
      <g fill="#fff" opacity="0.7">
        {[260, 290, 320, 350].map((y) => (
          <g key={y}>
            <rect x="50" y={y} width="8" height="12" />
            <rect x="66" y={y} width="8" height="12" />
            <rect x="342" y={y} width="8" height="12" />
            <rect x="356" y={y} width="8" height="12" />
          </g>
        ))}
      </g>
      {/* clouds */}
      <g fill="#fff">
        <ellipse cx="360" cy="120" rx="34" ry="14" />
        <ellipse cx="385" cy="110" rx="22" ry="14" />
        <ellipse cx="110" cy="140" rx="28" ry="11" />
        <ellipse cx="128" cy="132" rx="18" ry="11" />
      </g>
      {/* balloon */}
      <g>
        <path d="M200 40c-30 0-50 22-50 50 0 30 30 55 42 70h16c12-15 42-40 42-70 0-28-20-50-50-50Z" fill={gold} />
        <path d="M200 40c-12 0-20 22-20 50 0 30 10 55 12 70h16c2-15 12-40 12-70 0-28-8-50-20-50Z" fill={coral} />
        <path d="M150 90h100" stroke="#fff" strokeWidth="3" opacity="0.6" />
        <path d="M193 160l-3 18M207 160l3 18" stroke={navy} strokeWidth="1.5" />
        <rect x="188" y="178" width="24" height="16" rx="3" fill="#8a5a3b" />
      </g>
      {/* ground */}
      <ellipse cx="250" cy="455" rx="230" ry="26" fill={sky} opacity="0.6" />
      {/* bushes */}
      <g fill={green}>
        <circle cx="70" cy="430" r="26" />
        <circle cx="100" cy="440" r="20" />
        <circle cx="420" cy="432" r="24" />
        <circle cx="448" cy="442" r="18" />
      </g>
      {/* lamp post */}
      <g>
        <rect x="392" y="250" width="8" height="190" rx="3" fill={navy} />
        <path d="M380 250h32l-6-26h-20Z" fill={navy} />
        <circle cx="396" cy="236" r="9" fill="#ffd66b" />
      </g>
      {/* bench */}
      <g fill="#8a5a3b">
        <rect x="170" y="360" width="190" height="12" rx="4" />
        <rect x="170" y="330" width="190" height="10" rx="4" />
        <rect x="170" y="312" width="190" height="10" rx="4" />
        <rect x="186" y="372" width="8" height="70" />
        <rect x="336" y="372" width="8" height="70" />
      </g>
      {/* woman */}
      <g>
        <path d="M262 356c-6 30-8 58-4 84h14c4-24 8-46 10-70Z" fill={navy} />
        <path d="M296 356c10 26 16 52 14 84h14c4-30 0-58-8-84Z" fill={navy} />
        <rect x="252" y="436" width="24" height="10" rx="5" fill={coral} />
        <rect x="306" y="436" width="24" height="10" rx="5" fill={coral} />
        <path d="M258 280c0-18 14-30 32-30s32 12 32 30v82h-64Z" fill={gold} />
        <path d="M262 290c-18 6-34 18-44 34l10 8c10-12 22-20 36-24Z" fill={gold} />
        <path d="M318 290c18 4 30 10 38 22l-8 10c-8-8-18-14-30-16Z" fill={gold} />
        <circle cx="222" cy="330" r="7" fill={skin} />
        <circle cx="352" cy="318" r="7" fill={skin} />
        <rect x="346" y="296" width="14" height="24" rx="3" fill={navy} />
        <rect x="282" y="236" width="16" height="16" fill={skin} />
        <circle cx="290" cy="218" r="24" fill={skin} />
        <path d="M266 214c0-18 12-30 26-30 16 0 26 12 24 30-6-10-16-14-26-12-10 2-16 8-24 12Z" fill="#3a2a22" />
        <circle cx="282" cy="220" r="2" fill={navy} />
        <circle cx="297" cy="220" r="2" fill={navy} />
        <path d="M284 230q6 5 12 0" stroke={skinDark} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function DoctorsArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 480 440" className={className} aria-hidden="true">
      <circle cx="240" cy="220" r="190" fill="#e3faff" />
      {/* phone */}
      <rect x="150" y="60" width="170" height="320" rx="26" fill={navy} />
      <rect x="162" y="80" width="146" height="280" rx="16" fill="#fff" />
      <rect x="215" y="68" width="40" height="5" rx="2.5" fill="#2f4a86" />
      {/* doctor on screen */}
      <rect x="162" y="80" width="146" height="170" rx="16" fill={sky} />
      <path d="M190 250c0-34 20-54 45-54s45 20 45 54Z" fill="#fff" />
      <path d="M223 196l12 30 12-30" fill={teal} />
      <path d="M205 214q-6 20 6 30" stroke={navy} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="212" cy="246" r="5" fill={navy} />
      <rect x="227" y="170" width="16" height="18" fill={skin} />
      <circle cx="235" cy="150" r="24" fill={skin} />
      <path d="M211 148c0-18 10-28 24-28s24 10 24 28c-6-8-14-12-24-12s-18 4-24 12Z" fill="#4a3426" />
      <circle cx="227" cy="152" r="2" fill={navy} />
      <circle cx="243" cy="152" r="2" fill={navy} />
      {/* chat lines */}
      <rect x="176" y="268" width="96" height="12" rx="6" fill="#e9f0f9" />
      <rect x="198" y="288" width="96" height="12" rx="6" fill="#fdf1d6" />
      <rect x="176" y="308" width="70" height="12" rx="6" fill="#e9f0f9" />
      <circle cx="235" cy="340" r="10" fill={coral} />
      {/* heart bubble */}
      <g>
        <circle cx="110" cy="110" r="34" fill="#fff" stroke="#e9f0f9" strokeWidth="4" />
        <path d="M110 126s-18-10-18-22a9 9 0 0 1 18-4 9 9 0 0 1 18 4c0 12-18 22-18 22Z" fill={coral} />
      </g>
      {/* pill bottle */}
      <g>
        <rect x="70" y="270" width="70" height="100" rx="10" fill={green} />
        <rect x="64" y="252" width="82" height="24" rx="6" fill="#fff" stroke="#dfe6ef" strokeWidth="3" />
        <rect x="80" y="300" width="50" height="40" rx="4" fill="#fff" />
        <path d="M105 308v24M93 320h24" stroke={coral} strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* woman with clipboard */}
      <g>
        <path d="M352 300c-4 30-4 60 0 90h14c2-28 4-56 4-84Z" fill={navy} />
        <path d="M382 300c6 30 8 60 6 90h14c4-30 2-60-4-90Z" fill={navy} />
        <path d="M342 222c0-20 14-32 34-32s34 12 34 32v84h-68Z" fill="#ffd66b" />
        <rect x="318" y="236" width="40" height="52" rx="4" fill="#fff" stroke={navy} strokeWidth="3" />
        <path d="M326 252h24M326 264h24M326 276h14" stroke="#a2b5d5" strokeWidth="3" strokeLinecap="round" />
        <circle cx="356" cy="282" r="7" fill={skin} />
        <rect x="368" y="176" width="16" height="16" fill={skin} />
        <circle cx="376" cy="158" r="22" fill={skin} />
        <path d="M352 160c-2-22 10-34 26-34 16 0 26 14 22 34l-6-14c-10 4-24 4-34-2Z" fill="#2b2b3a" />
        <circle cx="369" cy="160" r="2" fill={navy} />
        <circle cx="383" cy="160" r="2" fill={navy} />
      </g>
      {/* pills */}
      <rect x="390" y="330" width="34" height="14" rx="7" fill={gold} transform="rotate(-30 407 337)" />
      <rect x="420" y="360" width="30" height="12" rx="6" fill={coral} transform="rotate(20 435 366)" />
    </svg>
  );
}

export function CtaArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 420 300" className={className} aria-hidden="true">
      <ellipse cx="210" cy="276" rx="190" ry="16" fill="#fff" opacity="0.12" />
      {/* laptop */}
      <rect x="90" y="60" width="240" height="160" rx="12" fill="#fff" />
      <rect x="102" y="72" width="216" height="136" rx="6" fill={sky} />
      <path d="M60 220h300l-14 22H74Z" fill="#dfe6ef" />
      {/* video tiles */}
      <rect x="112" y="82" width="120" height="116" rx="6" fill="#e3faff" />
      <path d="M140 198c0-26 12-40 32-40s32 14 32 40Z" fill={navy} />
      <circle cx="172" cy="130" r="20" fill={skin} />
      <path d="M152 128c0-16 8-24 20-24s20 8 20 24c-6-6-12-8-20-8s-14 2-20 8Z" fill="#3a2a22" />
      <rect x="240" y="82" width="68" height="54" rx="6" fill="#fdf1d6" />
      <path d="M254 136c0-14 8-22 20-22s20 8 20 22Z" fill="#fff" />
      <circle cx="274" cy="104" r="11" fill={skinDark} />
      <rect x="240" y="144" width="68" height="54" rx="6" fill="#fff" />
      <path d="M252 160h44M252 172h44M252 184h28" stroke="#a2b5d5" strokeWidth="4" strokeLinecap="round" />
      {/* call controls */}
      <circle cx="190" cy="236" r="0" />
      {/* speech bubble */}
      <g>
        <path d="M320 30h70a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12h-40l-16 14v-14h-14a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12Z" fill={gold} />
        <circle cx="336" cy="59" r="5" fill="#fff" />
        <circle cx="355" cy="59" r="5" fill="#fff" />
        <circle cx="374" cy="59" r="5" fill="#fff" />
      </g>
      {/* plant */}
      <rect x="20" y="220" width="36" height="40" rx="6" fill={coral} />
      <path d="M38 222c-18-20-18-44 0-60 18 16 18 40 0 60Z" fill={green} />
      <path d="M38 222c-26-6-34-26-28-40 18 4 28 20 28 40Z" fill="#4f9a70" />
    </svg>
  );
}

/* ---- Small spot icons, two-tone like the live site's animated ones ---- */

type SpotProps = { className?: string };

export function SpotWave({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="34" r="26" fill="#fdf1d6" />
      <path d="M22 50c-6-6-8-14-8-20l4-2 6 8V14a3 3 0 0 1 6 0v14V10a3 3 0 0 1 6 0v18V13a3 3 0 0 1 6 0v17-11a3 3 0 0 1 6 0v17c0 9-4 16-12 18Z" fill={skin} stroke={navy} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 8c3 2 5 5 5 9M46 4c5 2 9 7 10 13" stroke={gold} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function SpotClock({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="34" r="26" fill="#e3faff" />
      <circle cx="32" cy="32" r="20" fill="#fff" stroke={navy} strokeWidth="3" />
      <path d="M32 20v12l8 6" stroke={gold} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M22 50h20" stroke={navy} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SpotConsult({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="34" r="26" fill="#e9f0f9" />
      <rect x="8" y="10" width="30" height="20" rx="5" fill={navy} />
      <path d="M14 30v6l6-6" fill={navy} />
      <path d="M15 20h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="26" y="30" width="30" height="24" rx="5" fill="#fff" stroke={navy} strokeWidth="2.5" />
      <circle cx="35" cy="40" r="4" fill={skin} />
      <circle cx="47" cy="40" r="4" fill={skinDark} />
      <path d="M31 50c0-4 2-6 4-6s4 2 4 6M43 50c0-4 2-6 4-6s4 2 4 6" fill={gold} />
    </svg>
  );
}

export function SpotSneeze({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="30" cy="32" r="20" fill={skin} stroke={navy} strokeWidth="2.5" />
      <path d="M22 28l4 2M38 28l-4 2" stroke={navy} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="36" width="20" height="10" rx="4" fill="#fff" stroke={navy} strokeWidth="2" />
      <path d="M50 22l6-3M52 32h7M50 42l6 3" stroke={teal} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SpotSkin({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill={skin} stroke={navy} strokeWidth="2.5" />
      <circle cx="25" cy="29" r="2" fill={navy} />
      <circle cx="39" cy="29" r="2" fill={navy} />
      <path d="M26 40q6 4 12 0" stroke={navy} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="37" r="2.5" fill={coral} />
      <circle cx="44" cy="36" r="2.5" fill={coral} />
      <circle cx="40" cy="20" r="2" fill={coral} />
    </svg>
  );
}

export function SpotClipboard({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="14" y="10" width="36" height="46" rx="5" fill="#fff" stroke={navy} strokeWidth="2.5" />
      <rect x="24" y="6" width="16" height="9" rx="3" fill={gold} />
      <path d="M22 26h20M22 34h20M22 42h12" stroke="#a2b5d5" strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="48" r="9" fill={coral} />
      <path d="M46 44v8M42 48h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function SpotNote({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="18" y="8" width="32" height="42" rx="4" fill="#e9f0f9" stroke={navy} strokeWidth="2.5" />
      <rect x="12" y="14" width="32" height="42" rx="4" fill="#fff" stroke={navy} strokeWidth="2.5" />
      <path d="M19 26h18M19 34h18M19 42h10" stroke="#a2b5d5" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 48l4 4 8-9" stroke={gold} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const spots = {
  wave: SpotWave,
  clock: SpotClock,
  consult: SpotConsult,
  sneeze: SpotSneeze,
  skin: SpotSkin,
  clipboard: SpotClipboard,
  note: SpotNote,
};

export type SpotName = keyof typeof spots;

export function Spot({ name, className }: { name: SpotName; className?: string }) {
  const Component = spots[name];
  return <Component className={className} />;
}
