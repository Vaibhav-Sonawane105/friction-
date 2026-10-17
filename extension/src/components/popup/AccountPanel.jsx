import { useEffect, useRef, useState } from 'react';

const control = 'w-full border border-black rounded px-3 py-2 bg-white focus:outline-2 focus:outline-black';
const button = 'border border-black rounded px-3 py-2 shadow-[3px_2px_0px_#000] bg-[#4ECDC4] disabled:opacity-50 cursor-pointer';

export function AccountPanel({ onWebsitesChanged }) {
  const [account, setAccount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false);
  const inFlight = useRef(false);
  const available = Boolean(globalThis.chrome?.runtime?.id && globalThis.chrome?.runtime?.sendMessage);

  useEffect(() => {
    if (!available) return;
    let active = true;
    const refresh = () => chrome.runtime.sendMessage({ type: 'ACCOUNT', operation: 'status' }).then((response) => {
      if (!active) return;
      if (response?.success) setAccount(response.result);
      else setError(response?.error || 'Account controls unavailable. Reopen the popup to retry.');
    }).catch(() => { if (active) setError('Account controls unavailable. Reload the extension and retry.'); });
    refresh();
    const onChanged = (changes, area) => {
      if (area === 'session' && changes.pf_account_session || area === 'local' && changes.pf_account_sync) refresh();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => { active = false; chrome.storage.onChanged.removeListener(onChanged); };
  }, [available]);

  async function run(operation, args) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'ACCOUNT', operation, args });
      if (!response?.success) throw new Error(response?.error || 'Account request failed.');
      setAccount(response.result);
      setNotice(response.result.message || '');
      if (['login', 'signup'].includes(operation)) setPassword('');
      await onWebsitesChanged();
    } catch (err) { setError(err.message || 'Account unavailable. Local blocking still works.'); }
    finally { setBusy(false); inFlight.current = false; }
  }

  const signedIn = Boolean(account?.user);
  return (
    <details className="border border-black rounded bg-white p-3 text-xs shadow-[3px_2px_0px_#000]">
      <summary className="cursor-pointer font-bold">Account & automatic sync · optional</summary>
      <div className="pt-3 space-y-3">
        <p>Blocking works without an account. Only your website list syncs; challenge counts and browsing history stay on this device.</p>
        {!available ? <p>Account controls are available when installed in Chrome.</p> : !account && !error ? <p>Loading account...</p> : signedIn ? (
          <>
            <p className="break-all">Signed in as <strong>{account.user.email}</strong></p>
            <p>Sign-in lasts until Chrome closes. Passwords are never saved.</p>
            <p role="status">{account.enabled ? `Automatic sync: ${account.status}` : 'Automatic sync is off on this device.'}</p>
            <p>Enable sync to upload and download selected domains automatically, including removals. Other devices are checked about once a minute while Chrome runs. Turning it off stops this device immediately and requests account-wide disable; stored cloud data is retained.</p>
            <div className="flex flex-wrap gap-2">
              <button className={button} disabled={busy} onClick={() => run(account.enabled ? 'disable' : 'enable')}>{account.enabled ? 'Turn off sync' : 'Enable automatic sync'}</button>
              {!account.enabled && <button className={button} disabled={busy} onClick={() => run('disable')}>Disable sync for account</button>}
              <button className={button} disabled={busy} onClick={() => run('sync')}>Check sync now</button>
              <button className={button} disabled={busy} onClick={() => run('profile')}>Verify account</button>
              <button className={button} disabled={busy} onClick={() => run('logout')}>Sign out</button>
            </div>
            {account.profile && <p>Account verified · plan: {account.profile.plan}</p>}
            {account.status === 'conflict' && <div className="space-y-2 border border-black rounded bg-[#FBE76D] p-2">
              <p role="alert">{account.message}</p>
              <p>This device: {account.local?.map((item) => `${item.domain}${item.enabled ? '' : ' (off)'}`).join(', ') || 'empty'}</p>
              <p>Cloud: {account.cloud?.map((item) => `${item.domain}${item.enabled ? '' : ' (off)'}`).join(', ') || 'empty'}</p>
              <p>The list you choose replaces the other. Local challenge counts are preserved for retained domains.</p>
              <button className={button} disabled={busy} onClick={() => run('resolve', { choice: 'local' })}>Keep this device’s list</button>{' '}
              <button className={button} disabled={busy || account.cloudChoiceUnavailable} onClick={() => run('resolve', { choice: 'cloud' })}>Keep cloud list</button>
            </div>}
          </>
        ) : (
          <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); run(signup ? 'signup' : 'login', { email, password }); }}>
            <label className="block">Email<input className={control} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="block">Password<input className={control} type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <div className="flex gap-2">
              <button className={button} disabled={busy} type="submit">{signup ? 'Create account' : 'Sign in'}</button>
              <button className={button} disabled={busy} type="button" onClick={() => { setSignup(!signup); setPassword(''); }}>{signup ? 'Use existing account' : 'New account'}</button>
            </div>
          </form>
        )}
        {busy && <p role="status">Connecting… The server may need about a minute to wake up. Local blocking still works.</p>}
        {(notice || account?.status === 'error') && <p role="status">{notice || account.message}</p>}
        {error && <p role="alert" className="text-[#F24822]">{error}</p>}
      </div>
    </details>
  );
}
