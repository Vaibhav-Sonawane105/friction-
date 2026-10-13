
/**
 * Capsule / pill button following Tactile Editorial Minimalist style.
 * Variants:
 * - primary: solid deep charcoal with off-white text
 * - secondary: soft off-white canvas with charcoal border
 * - ghost: transparent with subtle hover
 * - danger: soft dusty rose background / border with charcoal text
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E1E1E] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#1E1E1E] text-[#FAF8F5] hover:bg-[#333333] active:scale-[0.98] shadow-sm',
    secondary:
      'bg-[#F5F3EC] text-[#1E1E1E] border border-[#D8D4C9] hover:bg-[#ECE9DF] active:scale-[0.98]',
    ghost:
      'bg-transparent text-[#1E1E1E] hover:bg-[#F5F3EC] active:scale-[0.98]',
    danger:
      'bg-[#FAF0F1] text-[#9E3642] border border-[#E8A2A8] hover:bg-[#F8E3E6] active:scale-[0.98]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
