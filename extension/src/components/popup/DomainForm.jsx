import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
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
          <Input
            id="domain-input"
            value={domainInput}
            onChange={(e) => {
              setDomainInput(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. reddit.com or youtube.com"
            disabled={isAtLimit || isSubmitting}
            error={error}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isAtLimit || isSubmitting || !domainInput.trim()}
          className="shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Restrict</span>
        </Button>
      </div>
    </form>
  );
}
