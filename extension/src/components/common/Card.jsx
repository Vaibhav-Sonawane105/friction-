
/**
 * Tactile Card component with soft cream background, delicate hairline border, and ample padding.
 */
export function Card({ children, className = '', padding = 'p-4' }) {
  return (
    <div
      className={`bg-[#FAF8F5] border border-[#D8D4C9] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Editorial Divider with thin hairline rule
 */
export function Divider({ className = '' }) {
  return <hr className={`border-t border-[#D8D4C9] my-3.5 ${className}`} />;
}
