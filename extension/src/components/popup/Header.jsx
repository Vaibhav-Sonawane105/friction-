import { ShieldCheck } from 'lucide-react';
import { CircleIconBadge } from '../common/Badge';

export function Header() {
  return (
    <header className="flex items-center justify-between pb-3 border-b border-[#D8D4C9]">
      <div className="flex items-center gap-2.5">
        <CircleIconBadge icon={ShieldCheck} />
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-tight text-[#1E1E1E] leading-none">
            Progressive Friction
          </h1>
          <p className="text-[11px] text-[#555555] tracking-wide mt-0.5">
            Mindful browsing gatekeeper
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF5EE] border border-[#8DAA82] text-[#3E6334] text-[10px] font-medium tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8DAA82] animate-pulse" />
        <span>Active</span>
      </div>
    </header>
  );
}
