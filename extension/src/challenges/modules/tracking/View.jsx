import { useEffect, useRef, useState } from 'react';
import { buildTimeline } from './playback';
import styles from './view.css?inline';

function Ball({ highlighted = false }) {
  return <span className={`pf-track-ball ${highlighted ? 'pf-track-highlight' : ''}`} aria-hidden="true">{highlighted ? '★' : '●'}</span>;
}
function Positions({ size }) {
  return <div className="grid font-istok text-center text-xs mt-3" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }} aria-hidden="true">
    {Array.from({ length: size }, (_, i) => <span key={i}>Position {i + 1}</span>)}
  </div>;
}
function MotionPlayback({ plan, onDone }) {
  const [frame, setFrame] = useState(() => buildTimeline(plan)[0]);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    const timers = buildTimeline(plan).slice(1).map(next => setTimeout(() => {
      setFrame(next); if (next.finished) done.current();
    }, next.at));
    return () => timers.forEach(clearTimeout);
  }, [plan]);
  return <>
    <p role="status" className="font-istok text-center mt-4">{frame.highlight ? 'Remember the highlighted object.' : 'Follow the target through the swaps.'}</p>
    <div className="pf-track-lane" aria-hidden="true">
      {frame.positions.map((position, id) => <span key={id} className="pf-track-object"
        style={{ width: `${100 / plan.size}%`, transform: `translate(${position * 100}%, ${frame.lifts[id]}px)`, transitionDuration: `${plan.stepMs / 3}ms` }}>
        <Ball highlighted={frame.highlight && id === plan.target} />
      </span>)}
    </div>
    <Positions size={plan.size} />
  </>;
}
function StepPlayback({ plan, onDone, disabled }) {
  const [step, setStep] = useState(0);
  const swap = plan.swaps[step - 1];
  return <div className="font-istok text-center mt-5">
    <p role="status" className="bg-[#FFF1F0] border-2 border-black rounded-xl p-4 min-h-20">
      {step === 0 ? `The target starts at position ${plan.target + 1}.`
        : `Swap ${step} of ${plan.swaps.length}: positions ${swap[0] + 1} and ${swap[1] + 1} exchange places.`}
    </p>
    <p className="text-sm my-4">Track the target mentally. These steps do not animate.</p>
    <button type="button" disabled={disabled} className="pf-track-action" onClick={() => {
      if (disabled) return;
      if (step < plan.swaps.length) setStep(step + 1); else onDone();
    }}>{step === 0 ? 'Begin steps' : step < plan.swaps.length ? 'Next swap' : 'Choose position'}</button>
  </div>;
}

export default function TrackingView({ state, disabled, onAction }) {
  const [stepMode, setStepMode] = useState(() => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const [activeRun, setActiveRun] = useState(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => { setStepMode(media.matches); setActiveRun(null); };
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (activeRun === null) return;
    const interrupt = () => { setActiveRun(null); setNotice('Round paused. Start again to replay it; completed rounds are saved.'); };
    const visibility = () => { if (document.hidden) interrupt(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', interrupt);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', interrupt); };
  }, [activeRun]);
  const playing = state.phase === 'watching' && activeRun === state.run;
  const choosing = state.phase === 'choose' && activeRun === state.run;
  const ready = !playing && !choosing;
  const finish = () => { if (!disabled) onAction({ type: 'finish' }); };
  return <div className="bg-white border-2 border-black rounded-xl shadow-brutal-card p-4 sm:p-6">
    <style>{styles}</style>
    <p role="status" className="font-istok font-bold mb-2">{`Round ${state.roundNumber} of ${state.totalRounds}`}</p>
    <progress aria-label="Tracking rounds completed" max={state.totalRounds} value={state.completedRounds} className="w-full h-3 accent-[#4ECDC4]" />
    <p className="font-istok text-sm my-4">Watch the highlighted object, follow the shuffle, then select its final position. Refresh replays the current round.</p>
    <label className="font-istok text-sm flex items-center gap-2"><input type="checkbox" checked={stepMode} disabled={disabled}
      onChange={event => { setStepMode(event.target.checked); setActiveRun(null); }} />Use step-by-step mode (no animation)</label>
    {notice && <p role="status" className="font-istok text-sm mt-3">{notice}</p>}
    {ready && <div className="text-center mt-5">
      <div className="flex justify-around p-5 bg-[#FFF1F0] border-2 border-black rounded-xl">{Array.from({ length: state.size }, (_, i) => <Ball key={i} />)}</div>
      <Positions size={state.size} />
      <button className="pf-track-action mt-5" type="button" disabled={disabled} onClick={() => {
        if (disabled) return;
        setNotice(''); setActiveRun(state.run + 1); onAction({ type: 'start', mode: stepMode ? 'steps' : 'motion' });
      }}>Start round</button>
    </div>}
    {playing && (state.mode === 'steps' ? <StepPlayback key={state.run} plan={state.plan} onDone={finish} disabled={disabled} />
      : <MotionPlayback key={state.run} plan={state.plan} onDone={finish} />)}
    {choosing && <div className="mt-5">
      <p className="font-istok text-center mb-4">Where did the highlighted object finish?</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}>
        {Array.from({ length: state.size }, (_, i) => <button key={i} type="button" disabled={disabled}
          aria-label={`Choose position ${i + 1}`} className="pf-track-choice" onClick={() => {
            if (!disabled) onAction({ type: 'choose', index: i });
          }}><Ball /><span className="block font-istok text-xs mt-2">Position {i + 1}</span></button>)}
      </div>
    </div>}
  </div>;
}
