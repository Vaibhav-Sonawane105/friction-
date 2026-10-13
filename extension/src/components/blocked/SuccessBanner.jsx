import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

export function SuccessBanner({ nextTier = 2, onContinue }) {
  return (
    <div className="w-full max-w-lg p-6 rounded-2xl bg-[#EFF5EE] border border-[#8DAA82] text-center space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="w-12 h-12 rounded-full bg-[#8DAA82] text-[#FAF8F5] mx-auto flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
      </div>

      <div>
        <h2 className="font-serif text-2xl font-bold text-[#1E1E1E]">
          Session Unlocked
        </h2>
        <p className="text-sm text-[#3E6334] mt-1 font-medium">
          Access granted for this session until you leave the site.
        </p>
        <p className="text-xs text-[#555555] mt-1.5">
          Progress recorded! Your next unlock attempt will advance to{' '}
          <span className="font-bold text-[#1E1E1E]">Tier {nextTier}</span>.
        </p>
      </div>

      <div className="pt-2">
        <Button
          onClick={onContinue}
          variant="primary"
          size="lg"
          className="w-full justify-center shadow-md"
        >
          <span>Continue to Website</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
