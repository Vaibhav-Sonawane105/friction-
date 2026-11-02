const artwork = {
  Moon: { fill: '#818CF8', stroke: '#4338CA', backdrop: '#E0E7FF', shape: <path d="M33 6a18 18 0 1 0 8 28A18 18 0 0 1 33 6Z" /> },
  Bolt: { fill: '#FB923C', stroke: '#C2410C', backdrop: '#FFEDD5', shape: <path d="M28 3 8 27h13l-2 18 22-28H28Z" /> },
  Circle: { fill: '#FB7185', stroke: '#BE123C', backdrop: '#FFE4E6', shape: <circle cx="24" cy="24" r="15" /> },
  Triangle: { fill: '#2DD4BF', stroke: '#0F766E', backdrop: '#CCFBF1', shape: <path d="M24 7 43 40H5Z" /> },
  Square: { fill: '#60A5FA', stroke: '#1D4ED8', backdrop: '#DBEAFE', shape: <rect x="9" y="9" width="30" height="30" rx="5" /> },
  Diamond: { fill: '#C084FC', stroke: '#7E22CE', backdrop: '#F3E8FF', shape: <path d="m24 5 18 19-18 19L6 24Z" /> },
  Star: { fill: '#FBBF24', stroke: '#B45309', backdrop: '#FEF3C7', shape: <path d="m24 4 6 13 14 2-10 10 2 15-12-7-12 7 2-15L4 19l14-2Z" /> },
  Plus: { fill: '#F472B6', stroke: '#BE185D', backdrop: '#FCE7F3', shape: <path d="M17 6h14v11h11v14H31v11H17V31H6V17h11Z" /> },
};
const palettes = { coral: artwork.Circle, teal: artwork.Triangle, blue: artwork.Square, purple: artwork.Diamond, amber: artwork.Star, pink: artwork.Plus };

// Views share one visual per symbol. Models retain plain names so artwork can be replaced later.
export default function ShapeSymbol({ name, color, fillStyle = 'filled' }) {
  const item = Object.hasOwn(artwork, name) ? artwork[name] : null;
  if (!item) return null;
  const palette = color && Object.hasOwn(palettes, color) ? palettes[color] : item;
  return <span className="inline-flex items-center justify-center">
    <span className="inline-flex rounded-xl p-1.5 sm:p-2" style={{ backgroundColor: palette.backdrop }}>
      <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" focusable="false"
        fill={fillStyle === 'outline' ? 'none' : palette.fill} stroke={palette.stroke} strokeWidth="2.5" strokeLinejoin="round">{item.shape}</svg>
    </span>
    <span className="sr-only">{color ? `${color} ${fillStyle} ${name}` : name}</span>
  </span>;
}
