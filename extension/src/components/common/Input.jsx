
/**
 * Editorial Input field with soft background, refined border, and clear focus styling.
 */
export function Input({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  autoFocus = false,
  error = '',
  className = '',
  label,
  onKeyDown,
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full bg-[#FAF8F5] text-[#1E1E1E] text-sm px-3.5 py-2.5 rounded-xl border transition-all duration-150 placeholder:text-[#8E8B82] focus:outline-none focus:ring-2 focus:ring-[#1E1E1E] focus:border-transparent disabled:opacity-50 disabled:bg-[#ECE9DF] ${
            error ? 'border-[#E8A2A8] ring-1 ring-[#E8A2A8]' : 'border-[#D8D4C9]'
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#9E3642] tracking-wide flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
}
