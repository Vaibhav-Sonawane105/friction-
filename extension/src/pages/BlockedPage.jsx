import { useEffect, useState, useMemo } from 'react';
import { DomainHeader } from '../components/blocked/DomainHeader';
import { ChallengeCard } from '../components/blocked/ChallengeCard';
import { SuccessBanner } from '../components/blocked/SuccessBanner';
import { normalizeDomain } from '../utils/domain';
import { generateChallenge } from '../utils/mathGenerator';
import {
  getBlockedDomains,
  recordSuccessfulUnlock,
  setTabUnlocked,
} from '../services/storage';

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

  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [challenge, setChallenge] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [nextTier, setNextTier] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const domains = await getBlockedDomains();
        const found = domains.find((d) => d.domain === domain);
        const level = found ? found.difficultyLevel || 1 : 1;
        setDifficultyLevel(level);
        setChallenge(generateChallenge(level));
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [domain]);

  const handleCorrectAnswer = async () => {
    // 1. Record unlock and increment difficulty level in storage
    const updatedRecord = await recordSuccessfulUnlock(domain);
    const updatedLevel = updatedRecord ? updatedRecord.difficultyLevel : difficultyLevel + 1;
    setNextTier(updatedLevel);

    // 2. Mark this tab as unlocked
    if (tabId) {
      await setTabUnlocked(tabId, domain);
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'UNLOCK_TAB',
          tabId,
          domain,
        });
      }
    }

    setIsUnlocked(true);
  };

  const handleContinue = () => {
    // Redirect to the originally intended target URL
    window.location.href = targetUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-[#555555]">
        Initializing challenge...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E] flex flex-col items-center justify-center p-6 selection:bg-[#E0A238]/30">
      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        <DomainHeader
          domain={domain}
          difficultyLevel={difficultyLevel}
          tabId={tabId}
        />

        {isUnlocked ? (
          <SuccessBanner
            targetUrl={targetUrl}
            nextTier={nextTier}
            onContinue={handleContinue}
          />
        ) : (
          challenge && (
            <ChallengeCard
              challenge={challenge}
              onCorrectAnswer={handleCorrectAnswer}
            />
          )
        )}

        <footer className="text-xs text-[#777777] text-center max-w-sm leading-relaxed">
          Leaving this domain or closing the tab will end the active unlock session.
        </footer>
      </div>
    </main>
  );
}
