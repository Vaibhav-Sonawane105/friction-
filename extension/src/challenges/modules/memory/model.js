import { getLevel } from '../../progression';

const shapes = ['Circle', 'Triangle', 'Square', 'Diamond', 'Star', 'Plus'];
const invalid = () => { throw new Error('Saved memory challenge is invalid. Saved data was preserved.'); };
const validIndices = (values, max, cardCount) => Array.isArray(values) && values.length <= max &&
  new Set(values).size === values.length && Array.from(values).every(index => Number.isSafeInteger(index) && index >= 0 && index < cardCount);

export function createState({ count, random = Math.random }) {
  if (getLevel(count) !== 3) throw new Error('Memory challenges require Level 3.');
  const shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random source.');
      const j = Math.floor(value * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const selected = shuffle(shapes);
  return { cards: shuffle([...selected, ...selected]), matched: [], revealed: [] };
}

export function validateState(state) {
  const cardCount = state?.cards?.length;
  // Existing eight-card attempts remain playable; every new board has twelve cards.
  if (!state || !Array.isArray(state.cards) || ![8, 12].includes(cardCount) ||
      state.cards.some(shape => !shapes.includes(shape)) || new Set(state.cards).size !== cardCount / 2 ||
      state.cards.some(shape => state.cards.filter(card => card === shape).length !== 2) ||
      !validIndices(state.matched, cardCount, cardCount) || state.matched.length % 2 !== 0 || !validIndices(state.revealed, 2, cardCount)) invalid();
  if (state.matched.some(index => state.matched.filter(other => state.cards[other] === state.cards[index]).length !== 2) ||
      state.revealed.some(index => state.matched.includes(index)) ||
      (state.revealed.length === 2 && state.cards[state.revealed[0]] === state.cards[state.revealed[1]])) invalid();
}

export function toPublicState(state) {
  validateState(state);
  return {
    cards: state.cards.map((value, index) => {
      const matched = state.matched.includes(index), faceUp = matched || state.revealed.includes(index);
      return { value: faceUp ? value : null, matched, faceUp };
    }),
    pairsMatched: state.matched.length / 2, totalPairs: state.cards.length / 2,
    instructions: `Find all ${state.cards.length / 2} pairs. Flip two cards at a time. Matches stay visible; after a mismatch, choose another face-down card to continue.`,
  };
}

export function reduceAction({ state, action }) {
  validateState(state);
  const index = action?.index;
  if (action?.type !== 'flip' || !Number.isSafeInteger(index) || index < 0 || index >= state.cards.length ||
      state.matched.includes(index) || state.revealed.includes(index)) throw new Error('Invalid memory action. Choose a face-down card.');
  const revealed = state.revealed.length === 2 ? [index] : [...state.revealed, index];
  if (revealed.length === 2 && state.cards[revealed[0]] === state.cards[revealed[1]]) {
    const matched = [...state.matched, ...revealed];
    return { state: { ...state, matched, revealed: [] }, completed: matched.length === state.cards.length, feedback: 'Pair matched. Progress saved.' };
  }
  return { state: { ...state, revealed }, completed: false,
    feedback: revealed.length === 2 ? 'Those cards do not match. Choose another face-down card to continue.' : '' };
}
