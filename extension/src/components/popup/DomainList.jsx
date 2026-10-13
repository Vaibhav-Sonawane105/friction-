import { Globe, Trash2, Zap } from 'lucide-react';

export function DomainList({ domains = [], onRemoveDomain }) {
  if (domains.length === 0) {
    return (
      <div className="text-center py-7 px-4 rounded-xl border-2 border-dashed border-black bg-white">
        <div className="w-10 h-10 rounded-lg bg-[#FBE76D] border-2 border-black shadow-[2px_2px_0px_#000] mx-auto flex items-center justify-center text-black mb-2.5">
          <Globe className="w-5 h-5 stroke-[2]" />
        </div>
        <h3 className="font-jeju text-sm font-bold text-black">
          No restricted sites yet
        </h3>
        <p className="text-xs font-istok text-[#555555] max-w-[240px] mx-auto mt-1 leading-relaxed">
          Add up to 2 distracting websites above to introduce progressive math challenges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-istok font-bold uppercase tracking-wider text-[#555555] px-1">
        <span>Restricted Domains</span>
        <span>{domains.length} Active</span>
      </div>

      <ul className="space-y-2">
        {domains.map((item) => (
          <li
            key={item.domain}
            className="flex items-center justify-between p-3 rounded-lg border-2 border-black bg-white shadow-[3px_3px_0px_#000] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[#FFB8B5] border border-black text-black flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-istok font-bold text-black truncate">
                  {item.domain}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-black bg-[#FBE76D] text-[10px] font-istok font-bold text-black">
                    Tier {item.difficultyLevel || 1}
                  </span>
                  <span className="text-[11px] font-istok text-[#555555] flex items-center gap-0.5 font-medium">
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
              className="cursor-pointer w-7 h-7 rounded-md border border-black bg-[#FAF0F1] flex items-center justify-center text-black hover:bg-[#FFB8B5] transition-colors shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
