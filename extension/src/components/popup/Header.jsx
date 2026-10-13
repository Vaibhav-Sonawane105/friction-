import { ProtectionIcon } from '../common/Icons';

export function Header() {
  return (
    <header className="flex items-center justify-between pb-3 border-b-2 border-black">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#FFB8B5] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
          <ProtectionIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-jeju text-base font-bold text-black leading-none">
            Progressive Friction
          </h1>
          <p className="font-istok text-[11px] text-[#555555] mt-0.5">
            Mindful browsing gatekeeper
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#4ECDC4] border-2 border-black shadow-[2px_2px_0px_#000] text-black text-[11px] font-istok font-bold">
        <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
        <span>Active</span>
      </div>
    </header>
  );
}
