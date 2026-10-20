import { useCallback, useEffect, useMemo, useState } from 'react';
import { BlockedOverlay } from '../components/blocked/BlockedOverlay';
import { normalizeDomain } from '../utils/domain';

export function BlockedPage() {
  const [challengeVersion, setChallengeVersion] = useState(0);
  const { targetUrl, tabId, domain } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const rawTarget = params.get('target') || 'https://example.com';
    const rawTabId = params.get('tabId');
    return {
      targetUrl: rawTarget,
      tabId: rawTabId ? Number(rawTabId) : null,
      domain: normalizeDomain(rawTarget),
    };
  }, []);

  const handleUnlocked = useCallback(() => {
    // In standalone mode, redirect to target URL after unlock
    window.location.href = targetUrl;
  }, [targetUrl]);

  useEffect(() => {
    if (!(typeof __PF_CHALLENGE_DEV__ !== 'undefined' && __PF_CHALLENGE_DEV__) || !globalThis.chrome?.runtime?.onMessage) return;
    let active = true;
    const onMessage = message => {
      if (message?.type !== 'TAB_URL_UPDATED') return;
      chrome.runtime.sendMessage({ type: 'CHECK_TAB_STATUS' }).then(status => {
        if (!active || status?.success === false) return;
        if (status?.shouldBlock === false) handleUnlocked();
        else if (message.resetChallenge) setChallengeVersion(version => version + 1);
      }).catch(() => {});
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => { active = false; chrome.runtime.onMessage.removeListener(onMessage); };
  }, [handleUnlocked]);

  return (
    <main className="min-h-screen bg-[#1E1E1E]/90 flex items-center justify-center p-4">
      <BlockedOverlay
        key={challengeVersion}
        domain={domain}
        tabId={tabId}
        standalone={true}
        onUnlocked={handleUnlocked}
      />
    </main>
  );
}
