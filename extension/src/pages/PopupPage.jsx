import { lazy, Suspense, useEffect, useState } from 'react';
import { Header } from '../components/popup/Header';
import { LimitNotice } from '../components/popup/LimitNotice';
import { DomainForm } from '../components/popup/DomainForm';
import { DomainList } from '../components/popup/DomainList';
import { AccountPanel } from '../components/popup/AccountPanel';
import {
  getBlockedDomains,
  addBlockedDomain,
  removeBlockedDomain,
} from '../services/storage';

const DevelopmentPanel = typeof __PF_DEV_CONTROLS__ !== 'undefined' && __PF_DEV_CONTROLS__
  ? lazy(() => import('../dev/ChallengePanel')) : null;

export function PopupPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDomains = async () => {
    try {
      const list = await getBlockedDomains();
      setDomains(list);
    } catch (err) {
      setError(err.message || 'Could not load settings. Reopen the popup to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = () => getBlockedDomains().then(
      (list) => { if (active) setDomains(list); },
      (err) => { if (active) setError(err.message || 'Could not load settings. Reopen the popup to try again.'); }
    ).finally(() => { if (active) setLoading(false); });
    refresh();
    const onChanged = (changes, area) => {
      if (area === 'local' && changes.pf_blocked_domains) refresh();
    };
    globalThis.chrome?.storage?.onChanged?.addListener(onChanged);
    return () => { active = false; globalThis.chrome?.storage?.onChanged?.removeListener(onChanged); };
  }, []);

  const handleAdd = async (newDomain) => {
    await addBlockedDomain(newDomain);
    await loadDomains();
  };

  const handleRemove = async (domain) => {
    try {
      setError('');
      await removeBlockedDomain(domain);
      await loadDomains();
    } catch (err) {
      setError(err.message || 'Could not remove this website. Please try again.');
    }
  };

  return (
    <div className="w-[380px] min-h-[460px] bg-[#F5F5F5] text-black p-4 flex flex-col gap-4 font-istok select-none">
      <Header />
      <LimitNotice currentCount={domains.length} />
      <DomainForm onAddDomain={handleAdd} currentCount={domains.length} />
      {error && <p role="alert" className="text-sm text-[#F24822]">{error}</p>}
      <div className="flex-1">
        {loading ? (
          <div className="text-center py-8 text-xs text-[#555555]">
            Loading settings...
          </div>
        ) : (
          <DomainList domains={domains} onRemoveDomain={handleRemove} />
        )}
      </div>
      <AccountPanel onWebsitesChanged={loadDomains} />
      {DevelopmentPanel && <Suspense fallback={<p role="status">Loading development controls…</p>}><DevelopmentPanel domains={domains} /></Suspense>}
      <footer className="pt-2 border-t-2 border-black text-[11px] text-[#555555] flex items-center justify-between font-medium">
        <span>Solves grant temporary access</span>
        <span>Manifest V3</span>
      </footer>
    </div>
  );
}
