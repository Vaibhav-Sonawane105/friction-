import { useMemo } from 'react';
import { BlockedOverlay } from '../components/blocked/BlockedOverlay';
import { normalizeDomain } from '../utils/domain';

export function BlockedPage() {
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

  const handleUnlocked = () => {
    // In standalone mode, redirect to target URL after unlock
    window.location.href = targetUrl;
  };

  return (
    <main className="min-h-screen bg-[#1E1E1E]/90 flex items-center justify-center p-4">
      <BlockedOverlay
        domain={domain}
        tabId={tabId}
        standalone={true}
        onUnlocked={handleUnlocked}
      />
    </main>
  );
}
