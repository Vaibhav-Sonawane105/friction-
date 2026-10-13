import { useEffect, useState } from 'react';
import { Header } from '../components/popup/Header';
import { LimitNotice } from '../components/popup/LimitNotice';
import { DomainForm } from '../components/popup/DomainForm';
import { DomainList } from '../components/popup/DomainList';
import {
  getBlockedDomains,
  addBlockedDomain,
  removeBlockedDomain,
} from '../services/storage';

export function PopupPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDomains = async () => {
    try {
      const list = await getBlockedDomains();
      setDomains(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleAdd = async (newDomain) => {
    await addBlockedDomain(newDomain);
    await loadDomains();
  };

  const handleRemove = async (domain) => {
    await removeBlockedDomain(domain);
    await loadDomains();
  };

  return (
    <div className="w-[380px] min-h-[440px] bg-[#FAF8F5] text-[#1E1E1E] p-4 flex flex-col gap-4 font-sans selection:bg-[#E0A238]/30">
      <Header />
      <LimitNotice currentCount={domains.length} />
      <DomainForm onAddDomain={handleAdd} currentCount={domains.length} />
      <div className="flex-1">
        {loading ? (
          <div className="text-center py-8 text-xs text-[#555555]">
            Loading settings...
          </div>
        ) : (
          <DomainList domains={domains} onRemoveDomain={handleRemove} />
        )}
      </div>
      <footer className="pt-2 border-t border-[#D8D4C9] text-[10px] text-[#777777] flex items-center justify-between">
        <span>Solves grant temporary access</span>
        <span>Manifest V3</span>
      </footer>
    </div>
  );
}
