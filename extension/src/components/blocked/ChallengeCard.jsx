import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { validateAnswer } from '../../utils/mathGenerator';

export function ChallengeCard({ challenge, onCorrectAnswer }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) {
      setError('Please enter your answer.');
      return;
    }

    const isCorrect = validateAnswer(userAnswer, challenge.answer);

    if (isCorrect) {
      setError('');
      onCorrectAnswer();
    } else {
      setError('Incorrect answer. Recalculate carefully.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <Card
      padding="p-8"
      className={`w-full max-w-lg transition-transform ${
        shake ? 'animate-bounce' : ''
      }`}
    >
      <div className="text-center space-y-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8C6016] px-3 py-1 rounded-full bg-[#FCF7ED] border border-[#E0A238]">
            <Sparkles className="w-3.5 h-3.5" />
            {challenge.label} Challenge
          </span>
          <p className="text-xs text-[#555555] pt-1">
            Solve this equation to unlock temporary browsing access:
          </p>
        </div>

        {/* Equation Display */}
        <div className="py-6 px-4 rounded-2xl bg-[#F5F3EC] border border-[#D8D4C9]">
          <div className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1E1E1E]">
            {challenge.expression} = <span className="text-[#8C6016]">?</span>
          </div>
        </div>

        {/* Answer Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="challenge-answer-input"
            type="number"
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter solution..."
            autoFocus
            error={error}
            className="text-center text-lg font-semibold tracking-wider"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center shadow-md"
            disabled={!userAnswer.trim()}
          >
            <span>Submit Solution</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
