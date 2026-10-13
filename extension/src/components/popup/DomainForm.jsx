import { useState } from 'react';
import { Plus } from 'lucide-react';
import { FREE_TIER_DOMAIN_LIMIT } from '../../services/storage';

export function DomainForm({ onAddDomain, currentCount = 0 }) {
  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAtLimit = currentCount >= FREE_TIER_DOMAIN_LIMIT;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!domainInput.trim()) {
      setError('Please type a website domain (e.g. youtube.com)');
      return;
    }

    if (isAtLimit) {
      setError(`Free plan limit reached (${FREE_TIER_DOMAIN_LIMIT} websites max).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddDomain(domainInput.trim());
      setDomainInput('');
    } catch (err) {
      setError(err.message || 'Failed to add website.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            id="domain-input"
            type="text"
            value={domainInput}
            onChange={(e) => {
              setDomainInput(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. reddit.com or youtube.com"
            disabled={isAtLimit || isSubmitting}
            className="w-full bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_#FF699B] px-3 py-2 text-xs font-istok font-medium text-black placeholder:text-[#888888] focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isAtLimit || isSubmitting || !domainInput.trim()}
          className="cursor-pointer shrink-0 bg-[#4ECDC4] border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] px-3.5 py-2 flex items-center gap-1.5 font-istok text-xs font-bold text-black hover:bg-[#3dbdb4] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 select-none"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Restrict</span>
        </button>
      </div>
      {error && (
        <p className="text-[11px] font-istok font-semibold text-[#F24822] px-1">
          {error}
        </p>
      )}
    </form>
  );
}
