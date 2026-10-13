
/**
 * Organic Accent Badges following Tactile Editorial Minimalist style.
 * Variants:
 * - neutral: cream with charcoal text
 * - sage: success / active unlocked state (#8DAA82)
 * - ochre: friction / tier indicator (#E0A238)
 * - rose: limit alert / motivation highlight (#E8A2A8)
 * - slate: subtle secondary container (#A3B8C2)
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full tracking-wide transition-colors';

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  const variantStyles = {
    neutral: 'bg-[#ECE9DF] text-[#1E1E1E] border border-[#D8D4C9]',
    sage: 'bg-[#EFF5EE] text-[#3E6334] border border-[#8DAA82]',
    ochre: 'bg-[#FCF7ED] text-[#8C6016] border border-[#E0A238]',
    rose: 'bg-[#FAF0F1] text-[#9E3642] border border-[#E8A2A8]',
    slate: 'bg-[#EFF3F6] text-[#3C5766] border border-[#A3B8C2]',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.sm} ${
        variantStyles[variant] || variantStyles.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Circular dark badge hosting crisp line-art symbol.
 */
export function CircleIconBadge({ icon: Icon, className = '' }) {
  return (
    <div
      className={`w-7 h-7 rounded-full bg-[#1E1E1E] text-[#FAF8F5] inline-flex items-center justify-center shrink-0 shadow-xs ${className}`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
    </div>
  );
}
