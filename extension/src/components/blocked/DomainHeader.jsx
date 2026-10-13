import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Badge, CircleIconBadge } from '../common/Badge';

export function DomainHeader({ domain, difficultyLevel = 1, tabId = null }) {
  const handleLeave = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'LEAVE_TAB', tabId });
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({});
      if (tabId) {
        chrome.tabs.remove(Number(tabId));
      } else {
        window.close();
      }
    } else {
      // Fallback in web dev mode
      window.location.href = 'https://www.google.com';
    }
  };

  return (
    <div className="w-full max-w-lg flex items-center justify-between pb-6 border-b border-[#D8D4C9]">
      <div className="flex items-center gap-3">
        <CircleIconBadge icon={ShieldAlert} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl font-bold tracking-tight text-[#1E1E1E]">
              Restricted Website
            </h1>
            <Badge variant="ochre" size="sm">
              Tier {difficultyLevel}
            </Badge>
          </div>
          <p className="text-xs text-[#555555] mt-0.5">
            You designated <span className="font-semibold text-[#1E1E1E]">{domain}</span> for mindful friction.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLeave}
        className="inline-flex items-center gap-1.5 text-xs text-[#555555] hover:text-[#1E1E1E] px-3.5 py-1.5 rounded-full border border-[#D8D4C9] hover:bg-[#F5F3EC] transition-all cursor-pointer shadow-xs active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Leave</span>
      </button>
    </div>
  );
}
