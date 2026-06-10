// Decorative Panini-album SVGs: footballs, vuvuzelas, aggressively patterned kits.
const INK = "#15233f";

export function Football({ size = 40, className = "", style }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke={INK} strokeWidth="4" />
      <polygon points="50,28 68,41 61,62 39,62 32,41" fill={INK} />
      <g stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round">
        <line x1="50" y1="28" x2="50" y2="8" />
        <line x1="68" y1="41" x2="86" y2="33" />
        <line x1="61" y1="62" x2="74" y2="80" />
        <line x1="39" y1="62" x2="26" y2="80" />
        <line x1="32" y1="41" x2="14" y2="33" />
      </g>
      <g fill={INK}>
        <polygon points="50,8 58,3 42,3" />
        <polygon points="86,33 90,24 78,27" />
        <polygon points="74,80 84,82 78,90" />
        <polygon points="26,80 16,82 22,90" />
        <polygon points="14,33 10,24 22,27" />
      </g>
    </svg>
  );
}

export function Vuvuzela({ size = 64, className = "", style, color = "#ffd23f" }) {
  return (
    <svg viewBox="0 0 130 70" width={size} height={(size * 70) / 130} className={className} style={style} aria-hidden="true">
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <rect x="6" y="30" width="64" height="11" rx="3" fill={color} />
        <path d="M66 12 L122 2 L122 68 L66 58 Z" fill={color} />
      </g>
      <circle cx="14" cy="35.5" r="3" fill={INK} />
    </svg>
  );
}

const PATTERNS = {
  stripes: (id, c1, c2) => (
    <pattern id={id} width="14" height="10" patternUnits="userSpaceOnUse">
      <rect width="14" height="10" fill={c1} /><rect width="7" height="10" fill={c2} />
    </pattern>
  ),
  hoops: (id, c1, c2) => (
    <pattern id={id} width="10" height="14" patternUnits="userSpaceOnUse">
      <rect width="10" height="14" fill={c1} /><rect width="10" height="7" fill={c2} />
    </pattern>
  ),
  checks: (id, c1, c2) => (
    <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill={c1} /><rect width="8" height="8" fill={c2} /><rect x="8" y="8" width="8" height="8" fill={c2} />
    </pattern>
  ),
  dots: (id, c1, c2) => (
    <pattern id={id} width="13" height="13" patternUnits="userSpaceOnUse">
      <rect width="13" height="13" fill={c1} /><circle cx="6.5" cy="6.5" r="3.4" fill={c2} />
    </pattern>
  ),
  chevron: (id, c1, c2) => (
    <pattern id={id} width="20" height="18" patternUnits="userSpaceOnUse">
      <rect width="20" height="18" fill={c1} /><path d="M0,12 L10,2 L20,12 L20,18 L10,8 L0,18 Z" fill={c2} />
    </pattern>
  ),
};

export function Kit({ pattern = "stripes", c1 = "#e2342b", c2 = "#ffffff", size = 64, rotate = 0, className = "", style }) {
  const id = `k_${pattern}_${c1}_${c2}`.replace(/[^a-z0-9_]/gi, "");
  const shirt = "M8,38 L28,18 L40,18 L50,28 L60,18 L72,18 L92,38 L78,47 L74,86 L26,86 L22,47 Z";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}
      style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden="true">
      <defs>{PATTERNS[pattern](id, c1, c2)}</defs>
      <path d={shirt} fill={`url(#${id})`} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M40,18 L50,28 L60,18" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

// A row of mixed kits for headers / dividers.
export function KitParade({ className = "" }) {
  const kits = [
    { pattern: "stripes", c1: "#e2342b", c2: "#fff", rotate: -8 },
    { pattern: "hoops", c1: "#1f6fe0", c2: "#fff", rotate: 5 },
    { pattern: "checks", c1: "#15233f", c2: "#f6c430", rotate: -4 },
    { pattern: "chevron", c1: "#1b9e57", c2: "#fff", rotate: 7 },
    { pattern: "dots", c1: "#e2342b", c2: "#15233f", rotate: -6 },
  ];
  return (
    <div className={`kit-parade ${className}`} aria-hidden="true">
      {kits.map((k, i) => <Kit key={i} {...k} size={50} />)}
    </div>
  );
}
