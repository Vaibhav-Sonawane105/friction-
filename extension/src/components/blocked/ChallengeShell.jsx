import { ArrowExitIcon, ProtectionIcon } from '../common/Icons';

export function ChallengeShell({ level, maths, puzzleTitle, instructions, status, error, feedback, onRetry, onLeave, children }) {
  if (maths || puzzleTitle) return <div className="neo-glow-wrapper"><section className={`neo-modal-content pf-maths-panel${puzzleTitle?' pf-game-panel':''}`} aria-label="Website unlock challenge" aria-busy={status === 'saving'}>
    <header className="pf-maths-heading"><h1>Restricted website</h1><button type="button" onClick={onLeave} className="pf-maths-leave">Leave <ArrowExitIcon className="w-5 h-5" /></button></header>
    <div className="pf-maths-meta"><strong>Level {level} · {puzzleTitle || 'Maths'}</strong>{maths && <span>Question <b>{Math.min(maths.solved + 1, maths.total)}</b> of {maths.total}</span>}</div>
    {children}
    {error && <div role="alert" className="pf-maths-alert">{error} <button type="button" onClick={onRetry}>Retry</button></div>}
    {feedback && <p role="status" className="pf-maths-feedback">{feedback}</p>}
    {status === 'saving' && <p role="status">Saving challenge…</p>}
    <footer>Access ends when you leave this site or close the tab.</footer>
  </section></div>;
  return <div className="neo-glow-wrapper"><section className="neo-modal-content" aria-label="Website unlock challenge" aria-busy={status === 'loading' || status === 'saving'}>
    <header className="flex flex-wrap items-center justify-between gap-4 mb-7">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-[#FFB8B5] border-2 border-black shadow-brutal-header flex items-center justify-center shrink-0"><ProtectionIcon className="w-12 h-12" /></div>
        <div><h1 className="text-[#F24822] font-jeju text-2xl sm:text-[34px] font-bold">Restricted Website</h1>
          <p className="text-[#555555] font-istok text-sm mt-1 max-w-sm">{instructions}</p></div>
      </div>
      <button type="button" onClick={onLeave} className="bg-[#4ECDC4] border-2 border-black rounded-xl shadow-brutal-header px-6 h-16 flex items-center gap-3 font-jeju text-2xl focus:outline-2 focus:outline-offset-4">Leave <ArrowExitIcon className="w-7 h-7" /></button>
    </header>
    <div className="mb-7 inline-flex bg-[#FBE76D] border-2 border-black rounded-xl shadow-brutal-badge px-6 py-3 font-istok font-bold">{level ? `Level ${level} challenge` : 'Preparing challenge'}</div>
    {status === 'loading' && <p role="status" className="font-istok py-10">Loading your saved challenge…</p>}
    {error && <div role="alert" className="font-istok mb-5 text-[#F24822]"><p>{error}</p>
      <button type="button" onClick={onRetry} className="mt-3 bg-white text-black border-2 border-black rounded-lg px-4 py-2">Retry</button></div>}
    {feedback && <p role="status" className="mb-4 font-istok text-[#F24822]">{feedback}</p>}
    {children}
    {status === 'saving' && <p role="status" className="font-istok mt-4">Saving challenge…</p>}
    <p className="mt-8 text-center text-[#F24822] font-istok text-sm">Leaving this domain or closing the tab ends temporary access.</p>
  </section></div>;
}
