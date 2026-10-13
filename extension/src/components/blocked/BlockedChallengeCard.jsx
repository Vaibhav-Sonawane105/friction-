import { useState } from 'react';
import { ProtectionIcon, ArrowExitIcon, DoneIcon, SparklesIcon } from '../common/Icons';
import { validateAnswer } from '../../utils/mathGenerator';

export function BlockedChallengeCard({
  difficultyLevel = 1,
  challenge,
  onSuccess,
  onLeave,
}) {
  const [solution, setSolution] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!solution.trim()) {
      setHasError(true);
      setErrorMessage('Please enter a solution.');
      return;
    }

    if (!challenge) return;

    const isCorrect = validateAnswer(solution, challenge.answer);
    if (isCorrect) {
      setHasError(false);
      setErrorMessage('');
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } else {
      setHasError(true);
      setErrorMessage('Incorrect solution. Recalculate carefully!');
      setTimeout(() => setHasError(false), 500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Format expression: replace multiplication with 'X' and ensure proper spacing
  const formattedExpression = challenge?.expression
    ? challenge.expression.replace(/×/g, 'X')
    : '12 X 8 + 27';

  return (
    <div className="neo-glow-wrapper">
      <div className="neo-modal-content">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 mb-7 sm:mb-8">
          <div className="flex items-center gap-4">
            {/* Peach Shield Box */}
            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl bg-[#FFB8B5] border-2 border-black shadow-brutal-header flex items-center justify-center shrink-0">
              <ProtectionIcon className="w-12 h-12 sm:w-[54px] sm:h-[54px]" />
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-[#F24822] font-jeju text-2xl sm:text-[34px] md:text-[38px] font-bold leading-tight tracking-normal">
                Restricted Website
              </h1>
              <p className="text-[#555555] font-istok text-sm sm:text-[15px] mt-1">
                Solve this equation to{' '}
                <strong className="font-bold text-black">unlock</strong> temporary browsing access:
              </p>
            </div>
          </div>

          {/* Leave Button - Enlarged text & icon, matching shield height */}
          <button
            type="button"
            onClick={onLeave}
            className="cursor-pointer bg-[#4ECDC4] border-2 border-black rounded-xl shadow-brutal-header h-16 sm:h-[72px] px-7 sm:px-8 flex items-center justify-center gap-3 sm:gap-3.5 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform select-none shrink-0"
            title="Leave this restricted website"
          >
            <span className="font-jeju text-2xl sm:text-[28px] md:text-[30px] font-bold text-black leading-none">
              Leave
            </span>
            <ArrowExitIcon className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-black" />
          </button>
        </div>

        {/* Tier Badge */}
        <div className="mb-6 sm:mb-7 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 bg-[#FBE76D] border-2 border-black rounded-xl shadow-brutal-badge px-6 py-3 sm:px-7 sm:py-3.5 select-none">
            <SparklesIcon className="w-7 h-7 sm:w-8 sm:h-8 text-black" strokeWidth={1.8} />
            <span className="font-istok font-bold text-base sm:text-lg md:text-xl text-black leading-none">
              Tier {difficultyLevel} equation
            </span>
          </div>

          {errorMessage && (
            <span className="text-sm sm:text-base font-istok font-bold text-[#F24822] animate-pulse">
              {errorMessage}
            </span>
          )}
        </div>

        {/* Central Equation Card */}
        <div
          className={`w-full bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-brutal-card overflow-hidden transition-all ${
            hasError ? 'animate-shake border-[#F24822]' : ''
          }`}
        >
          {/* Equation Display */}
          <div className="py-20 sm:py-28 px-6 bg-white min-h-[260px] sm:min-h-[300px] flex items-center justify-center text-center">
            <div className="font-jeju text-4xl sm:text-5xl md:text-[54px] font-bold text-black tracking-wider select-none">
              {formattedExpression} = ?
            </div>
          </div>

          {/* Bottom Solution Bar - Twin equal-sized Input and Submit buttons with enlarged typography and icons */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#ECECEC] border-t-2 border-black py-5 sm:py-6 px-6 sm:px-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8"
          >
            {/* Enter Solution Input - Enlarged font & twin size */}
            <input
              id="friction-solution-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9\-]*"
              value={solution}
              onChange={(e) => {
                setSolution(e.target.value);
                if (hasError) setHasError(false);
                if (errorMessage) setErrorMessage('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter Solution..."
              autoFocus
              className="bg-white border-2 border-black rounded-xl shadow-brutal-input px-5 h-14 sm:h-16 w-56 sm:w-60 md:w-64 text-center font-istok text-base sm:text-lg md:text-xl font-bold text-black placeholder:text-base sm:placeholder:text-lg placeholder:text-[#888888] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black/20"
            />

            {/* Submit Button - Enlarged text & icon, matching input size */}
            <button
              type="submit"
              disabled={isSuccess}
              className="cursor-pointer bg-white border-2 border-black rounded-xl shadow-brutal-submit px-5 h-14 sm:h-16 w-56 sm:w-60 md:w-64 flex items-center justify-center gap-2.5 sm:gap-3 hover:bg-[#F9F9F9] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all select-none"
            >
              <span className="font-istok font-bold text-base sm:text-lg md:text-xl text-black leading-none">
                {isSuccess ? 'Unlocked!' : 'Submit'}
              </span>
              <DoneIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[#757575]" />
            </button>
          </form>
        </div>

        {/* Footer Warning - Exactly matching font size with subtitle */}
        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-[#F24822] font-istok text-sm sm:text-[15px] font-medium">
            Leaving this domain or closing the tab will end the unlock section
          </p>
        </div>
      </div>
    </div>
  );
}
