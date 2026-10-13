import { useEffect, useState } from 'react';
import { BlockedChallengeCard } from './BlockedChallengeCard';
import { generateChallenge } from '../../utils/mathGenerator';
import {
  recordSuccessfulUnlock,
  setTabUnlocked,
  getBlockedDomains,
} from '../../services/storage';

export function BlockedOverlay({
  domain,
  difficultyLevel: initialLevel = 1,
  tabId = null,
  onUnlocked,
  standalone = false,
}) {
  const [difficultyLevel, setDifficultyLevel] = useState(initialLevel);
  const [challenge, setChallenge] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // If difficulty level wasn't provided or we want to double check from storage
    const loadLevel = async () => {
      try {
        const domains = await getBlockedDomains();
        const found = domains.find((d) => d.domain === domain);
        const level = found ? found.difficultyLevel || 1 : initialLevel;
        setDifficultyLevel(level);
        setChallenge(generateChallenge(level));
      } catch {
        setChallenge(generateChallenge(initialLevel));
      }
    };

    loadLevel();
  }, [domain, initialLevel]);

  const handleSuccess = async () => {
    try {
      // 1. Record unlock and update difficulty in storage
      if (domain) {
        await recordSuccessfulUnlock(domain);
      }

      // 2. Mark this tab as unlocked
      if (tabId) {
        await setTabUnlocked(tabId, domain);
      }

      // 3. Inform background service worker
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'UNLOCK_TAB',
          tabId,
          domain,
        });
      }
    } catch (err) {
      console.warn('[Progressive Friction] Unlock record error:', err);
    }

    // 4. Smoothly fade out before unmounting
    setIsClosing(true);
    setTimeout(() => {
      if (onUnlocked) {
        onUnlocked();
      }
    }, 280);
  };

  const handleLeave = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'LEAVE_TAB',
        tabId,
      });
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({});
      if (tabId) {
        chrome.tabs.remove(Number(tabId));
      } else {
        window.close();
      }
    } else {
      // Fallback
      window.location.href = 'https://www.google.com';
    }
  };

  // If running standalone (e.g. on blocked.html page), use full height without fixed backdrop
  const containerClasses = standalone
    ? 'min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-[#000000]/60 backdrop-blur-xl'
    : `fixed inset-0 w-screen h-screen z-[2147483647] flex items-center justify-center p-4 sm:p-8 bg-black/45 backdrop-blur-[16px] overflow-y-auto transition-opacity duration-300 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`;

  return (
    <div
      id="friction-blocker-overlay-container"
      className={containerClasses}
      style={{
        backdropFilter: 'blur(16px) brightness(0.65)',
        WebkitBackdropFilter: 'blur(16px) brightness(0.65)',
      }}
    >
      <div className="w-full max-w-[780px] my-auto">
        <BlockedChallengeCard
          domain={domain}
          difficultyLevel={difficultyLevel}
          challenge={challenge}
          onSuccess={handleSuccess}
          onLeave={handleLeave}
        />
      </div>
    </div>
  );
}
