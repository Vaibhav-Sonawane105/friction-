import { useState } from 'react';

export default function ArithmeticView({ state, disabled, onAction }) {
  const [answer, setAnswer] = useState('');
  return <div className="bg-white border-2 border-black rounded-xl shadow-brutal-card overflow-hidden">
    <div className="py-16 sm:py-24 px-6 text-center font-jeju text-4xl sm:text-5xl" aria-label="Arithmetic problem">{state.expression} = ?</div>
    <form className="bg-[#ECECEC] border-t-2 border-black p-6 flex flex-wrap justify-center gap-6" onSubmit={event => {
      event.preventDefault();
      if (!disabled) onAction({ type: 'submit', answer });
    }}>
      <label className="sr-only" htmlFor="friction-module-answer">Your answer</label>
      <input id="friction-module-answer" value={answer} onChange={event => setAnswer(event.target.value)} disabled={disabled}
        inputMode="numeric" autoFocus autoComplete="off" placeholder="Enter solution…"
        className="bg-white border-2 border-black rounded-xl shadow-brutal-input h-14 px-5 text-center font-istok text-lg w-56 focus:outline-2 focus:outline-offset-4" />
      <button disabled={disabled} className="bg-white border-2 border-black rounded-xl shadow-brutal-submit h-14 px-8 font-istok font-bold disabled:opacity-60">{disabled ? 'Saving…' : 'Submit'}</button>
    </form>
  </div>;
}
