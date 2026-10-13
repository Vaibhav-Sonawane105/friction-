import { Globe, Trash2, Zap } from 'lucide-react';
import { Badge } from '../common/Badge';

export function DomainList({ domains = [], onRemoveDomain }) {
  if (domains.length === 0) {
    return (
      <div className="text-center py-7 px-4 rounded-2xl border border-dashed border-[#D8D4C9] bg-[#FAF8F5]">
        <div className="w-10 h-10 rounded-full bg-[#F5F3EC] border border-[#D8D4C9] mx-auto flex items-center justify-center text-[#555555] mb-2.5">
          <Globe className="w-5 h-5 stroke-[1.7]" />
        </div>
        <h3 className="font-serif text-sm font-semibold text-[#1E1E1E]">
          No restricted sites yet
        </h3>
        <p className="text-xs text-[#555555] max-w-[240px] mx-auto mt-1 leading-relaxed">
          Add up to 2 distracting websites above to introduce progressive math challenges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#555555] px-1">
        <span>Restricted Domains</span>
        <span>{domains.length} Active</span>
      </div>

      <ul className="space-y-2">
        {domains.map((item) => (
          <li
            key={item.domain}
            className="flex items-center justify-between p-3 rounded-xl border border-[#D8D4C9] bg-[#FAF8F5] shadow-xs hover:border-[#1E1E1E]/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#1E1E1E] text-[#FAF8F5] flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1E1E1E] truncate">
                  {item.domain}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="ochre" size="sm">
                    Tier {item.difficultyLevel || 1}
                  </Badge>
                  <span className="text-[11px] text-[#555555] flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-[#E0A238]" />
                    {item.successfulUnlockCount || 0} unlock
                    {(item.successfulUnlockCount || 0) === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemoveDomain(item.domain)}
              title={`Remove ${item.domain}`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#555555] hover:text-[#9E3642] hover:bg-[#FAF0F1] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
