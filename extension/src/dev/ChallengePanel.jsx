import { useCallback, useEffect, useState } from 'react';

async function request(operation, domain, args = {}) {
  if (!globalThis.chrome?.runtime?.sendMessage) throw new Error('Load the unpacked development extension to use these controls.');
  const response = await chrome.runtime.sendMessage({ type: 'PF_DEV_CHALLENGE_CONTROL', operation, domain, ...args });
  if (!response?.success) throw new Error(response?.error || 'Development action failed.');
  return response;
}

export default function ChallengePanel({ domains }) {
  const [selected, setSelected] = useState('');
  const domain = domains.some(item => item.domain === selected) ? selected : domains[0]?.domain || '';
  const currentCount = domains.find(item => item.domain === domain)?.successfulUnlockCount;
  const [info, setInfo] = useState(null);
  const [count, setCount] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [variant, setVariant] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inspect = useCallback(async () => {
    if (!domain) return;
    try { setInfo(await request('INSPECT', domain)); setError(''); }
    catch (err) { setError(err.message); }
  }, [domain]);
  useEffect(() => {
    let active = true;
    if (domain) request('INSPECT', domain).then(value => { if (active) { setInfo(value); setError(''); } }, err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [domain, currentCount]);
  const act = async (operation, args = {}) => {
    if (busy || !domain) return;
    setBusy(true); setError('');
    try { setInfo(await request(operation, domain, args)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const visible = info?.domain === domain ? info : null;
  const modules = visible?.modules || [];
  const choice = modules.includes(moduleId) ? moduleId : modules[0] || '';
  const variants = visible?.variants?.[choice] || [];
  const selectedVariant = variants.includes(variant) ? variant : '';
  const inputClass = 'border-2 border-black rounded bg-white px-2 py-1 w-full';
  const buttonClass = 'border-2 border-black rounded bg-white px-2 py-1 disabled:opacity-40';
  return <section className="border-2 border-black rounded-xl bg-[#FBE76D] p-3 shadow-[3px_2px_0_black] text-xs flex flex-col gap-3" aria-label="Development challenge controls">
    <h2 className="font-bold text-sm">Development challenge controls</h2>
    <p>Local test build. Count changes persist on this device. These controls are excluded from production.</p>
    {!domains.length ? <p>Add a restricted website to begin testing.</p> : <>
      <label>Website<select value={domain} onChange={event => { setSelected(event.target.value); setCount(''); setModuleId(''); }} className={inputClass}>
        {domains.map(item => <option key={item.domain} value={item.domain}>{item.domain}</option>)}
      </select></label>
      <p role="status">{visible ? `Count ${visible.count} · Level ${visible.level} · ${visible.attempts.length} saved attempt(s)` : 'Reading test state…'}</p>
      <fieldset disabled={busy} className="flex flex-col gap-3">
        <form className="flex gap-2 items-end" onSubmit={event => { event.preventDefault(); if (count.trim()) act('SET_COUNT', { count: Number(count) }); }}>
          <label className="flex-1">Successful unlock count<input className={inputClass} type="number" min="0" step="1" required value={count} placeholder={String(currentCount ?? 0)} onChange={event => setCount(event.target.value)} /></label>
          <button className={buttonClass}>Set count</button>
        </form>
        <div className="flex flex-wrap gap-2">{[0,21,31,51].map((value, index) => <button key={value} type="button" className={buttonClass} onClick={() => act('SET_COUNT', { count: value })}>Level {index + 1} ({value})</button>)}</div>
        <label>Next challenge<select className={inputClass} value={choice} disabled={!modules.length} onChange={event => setModuleId(event.target.value)}>
          {!modules.length && <option value="">Module not implemented yet</option>}
          {modules.map(id => <option key={id} value={id}>{id}</option>)}
        </select></label>
        {variants.length > 0 && <label>Question type<select className={inputClass} value={selectedVariant} onChange={event => setVariant(event.target.value)}><option value="">Random</option>{variants.map(value => <option key={value} value={value}>{value === 'linear' ? 'Linear equation' : value === 'derivative' ? 'Derivative at a point' : value}</option>)}</select></label>}
        <button type="button" className={buttonClass} disabled={!choice} onClick={() => act('PREPARE_CHALLENGE', { moduleId: choice, ...(selectedVariant ? { variant: selectedVariant } : {}) })}>Prepare next challenge</button>
        <button type="button" className={buttonClass} onClick={() => act('RESET_CHALLENGE')}>Reset challenge (keep count)</button>
      </fieldset>
      <p>Changes replace this website’s attempts and end its temporary access. Other websites are preserved.</p>
      <p>Pending choice: {visible?.override?.moduleId || 'normal selection'}</p>
      <ul>{visible?.attempts.map(attempt => <li key={attempt.id}>Tab {attempt.tabId ?? 'none'} · {attempt.moduleId} · {attempt.status}</li>)}</ul>
      <button type="button" disabled={busy} className={buttonClass} onClick={inspect}>Refresh test state</button>
    </>}
    {busy && <p role="status">Applying test change…</p>}
    {error && <p role="alert" className="text-[#9c240b]">{error}</p>}
  </section>;
}
