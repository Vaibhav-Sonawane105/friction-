import { useState } from 'react';

export default function EquationView({ state, disabled, onAction }) {
  const [answer, setAnswer] = useState('');
  return <div className="bg-white border-2 border-black rounded-xl shadow-brutal-card overflow-hidden">
    <div className="py-12 sm:py-20 px-6 text-center">
      <p className="font-istok text-base sm:text-lg mb-8" id="friction-equation-instructions">{state.instructions}</p>
      <p className="font-jeju text-3xl sm:text-5xl break-words">{state.expression}</p>
    </div>
    <form className="bg-[#ECECEC] border-t-2 border-black p-6 flex flex-wrap justify-center gap-6" onSubmit={event => {
      event.preventDefault();
      if (!disabled) onAction({ type: 'submit', answer });
    }}>
      <label className="sr-only" htmlFor="friction-equation-answer">{state.answerLabel}</label>
      <input id="friction-equation-answer" aria-describedby="friction-equation-instructions" type="text" value={answer}
        onChange={event => setAnswer(event.target.value)} disabled={disabled} inputMode="numeric" autoComplete="off" autoFocus
        placeholder="Enter whole-number answer…"
        className="bg-white border-2 border-black rounded-xl shadow-brutal-input h-14 px-5 text-center font-istok text-lg w-56 focus:outline-2 focus:outline-offset-4" />
      <button type="submit" disabled={disabled} className="bg-white border-2 border-black rounded-xl shadow-brutal-submit h-14 px-8 font-istok font-bold disabled:opacity-60">{disabled ? 'Saving…' : 'Submit'}</button>
    </form>
  </div>;
}
