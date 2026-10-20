import { useCallback, useEffect, useRef, useState } from 'react';
import { getModuleDescriptor } from '../../challenges/registry';
import { requestChallenge } from '../../services/challengeClient';
import { ChallengeShell } from './ChallengeShell';

export default function ChallengeHost({ domain, onUnlocked, onLeave }) {
  const [display, setDisplay] = useState({ status: 'loading', attempt: null, View: null, error: '', feedback: '' });
  const sequence = useRef(0);
  const pending = useRef(false);

  const load = useCallback(async () => {
    const token = ++sequence.current;
    pending.current = true;
    setDisplay({ status: 'loading', attempt: null, View: null, error: '', feedback: '' });
    try {
      const attempt = await requestChallenge(domain, { type: 'GET_CHALLENGE' });
      if (token !== sequence.current) return;
      if (attempt.completed) { onUnlocked?.(); return; }
      const descriptor = getModuleDescriptor(attempt.moduleId, attempt.moduleVersion);
      const { default: View } = await descriptor.loadView();
      if (token !== sequence.current) return;
      setDisplay({ status: 'ready', attempt, View, error: '', feedback: '' });
    } catch (error) {
      if (token === sequence.current) setDisplay(previous => ({ ...previous, status: 'error', error: error.message }));
    } finally { if (token === sequence.current) pending.current = false; }
  }, [domain, onUnlocked]);

  useEffect(() => {
    // Start on a microtask so disposal during React's development effect replay is safe.
    let active = true;
    Promise.resolve().then(() => { if (active) load(); });
    return () => { active = false; sequence.current += 1; pending.current = false; };
  }, [load]);

  const act = async action => {
    if (pending.current || !display.attempt) return;
    pending.current = true;
    const token = sequence.current;
    const request = { type: 'CHALLENGE_ACTION', attemptId: display.attempt.attemptId, revision: display.attempt.revision, action };
    setDisplay(previous => ({ ...previous, status: 'saving', error: '', feedback: '' }));
    try {
      const attempt = await requestChallenge(domain, request);
      if (token !== sequence.current) return;
      if (attempt.completed) { onUnlocked?.(); return; }
      setDisplay(previous => ({ ...previous, attempt, status: 'ready', feedback: attempt.feedback || '' }));
    } catch (error) {
      if (token === sequence.current) setDisplay(previous => ({ ...previous, status: 'error', error: error.message }));
    } finally { if (token === sequence.current) pending.current = false; }
  };
  const descriptor = display.attempt && getModuleDescriptor(display.attempt.moduleId, display.attempt.moduleVersion);
  const View = display.View;
  return <ChallengeShell level={display.attempt?.level} instructions={descriptor?.instructions || 'Complete a challenge to unlock temporary browsing access.'}
    status={display.status} error={display.error} feedback={display.feedback} onLeave={onLeave}
    onRetry={load}>
    {View && <View key={display.attempt.attemptId} state={display.attempt.state} disabled={display.status === 'saving'} onAction={act} />}
  </ChallengeShell>;
}
