import { SparklesIcon } from '../common/Icons';
import { FREE_TIER_DOMAIN_LIMIT } from '../../services/storage';

export function LimitNotice({ currentCount = 0 }) {
  const isAtLimit = currentCount >= FREE_TIER_DOMAIN_LIMIT;

  return (
    <div
      className={`p-3 rounded-lg border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-between text-xs transition-colors ${
        isAtLimit
          ? 'bg-[#FFB8B5] text-black font-semibold'
          : 'bg-[#FBE76D] text-black'
      }`}
    >
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-4 h-4 text-black shrink-0" />
        <span className="font-istok font-semibold">
          Free Plan allowance: {currentCount} of {FREE_TIER_DOMAIN_LIMIT} slots used
        </span>
      </div>
      {isAtLimit && (
        <span className="text-[10px] font-istok font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-black bg-white text-black">
          Limit Reached
        </span>
      )}
    </div>
  );
}
