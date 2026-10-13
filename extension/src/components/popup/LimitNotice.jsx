import { Sparkles } from 'lucide-react';
import { FREE_TIER_DOMAIN_LIMIT } from '../../services/storage';

export function LimitNotice({ currentCount = 0 }) {
  const isAtLimit = currentCount >= FREE_TIER_DOMAIN_LIMIT;

  return (
    <div
      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
        isAtLimit
          ? 'bg-[#FAF0F1] border-[#E8A2A8] text-[#7A2833]'
          : 'bg-[#F5F3EC] border-[#D8D4C9] text-[#4A4A4A]'
      }`}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#E0A238] shrink-0" />
        <span className="font-medium">
          Free Plan allowance: {currentCount} of {FREE_TIER_DOMAIN_LIMIT} slots used
        </span>
      </div>
      {isAtLimit && (
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8A2A8] text-[#1E1E1E]">
          Limit Reached
        </span>
      )}
    </div>
  );
}
