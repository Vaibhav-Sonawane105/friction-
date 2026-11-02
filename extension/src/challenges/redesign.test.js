import { expect, it } from 'vitest';
import { getProfile } from './profiles';
import { generateVerified } from './generation';
import { reserveType } from './rotation';
import * as memory from './modules/memory/v2';
import * as maths from './modules/maths/model';
import * as route from './modules/route/model';
import * as ordering from './modules/ordering/model';
it('checks the four profiles and memory privacy', () => {
  for (const [i, count] of [0, 21, 31, 51].entries()) {
    const s = memory.createState({
      count
    });
    expect(s.cards.length).toBe(2 * [3, 4, 6, 8][i]);
    expect(getProfile(i + 1).memoryPairs).toBe(s.cards.length / 2);
    expect(memory.toPublicState(s).cards.every(c => c.value === null)).toBe(true);
  }
});
it('exhausts generation safely', () => {
  const opts = {
    make: () => null,
    validate: x => x === 1,
    maxAttempts: 2,
    reserves: [1]
  };
  expect(generateVerified(opts)).toBe(1);
  expect(() => generateVerified({
    ...opts,
    reserves: []
  })).toThrow();
});
it('never repeats across a bag boundary', () => {
  let history;
  let list = [];
  for (let i = 0; i < 12; i++) {
    const r = reserveType({
      history,
      choices: ['maths', 'route', 'memory', 'ordering'],
      random: () => 0
    });
    list.push(r.moduleId);
    history = r.nextHistory;
  }
  expect(new Set(list.slice(0, 4)).size).toBe(4);
  expect(list[3]).not.toBe(list[4]);
});
it('retains the same maths problem after incorrect input', () => {
  const state = maths.createState({
    count: 51
  });
  expect(state.questions).toHaveLength(4);
  expect(maths.reduceAction({
    state,
    action: {
      type: 'submit',
      answer: 'junk'
    }
  }).state).toEqual(state);
});
it('keeps the route when a move is invalid', () => {
  const state = route.createState({
    count: 0
  });
  expect(route.reduceAction({
    state,
    action: {
      type: 'extend',
      cell: state.path[0]
    }
  }).state).toEqual(state);
});
it('ordering reports exactly the broken clues', () => {
  const state = ordering.createState({
    count: 0
  });
  const result = ordering.reduceAction({
    state,
    action: {
      type: 'submit'
    }
  });
  expect(result.completed).toBe(false);
  expect(result.state.broken.length).toBeGreaterThan(0);
});
it('rejects corrupt boards instead of accepting an empty solution', () => {
  expect(() => ordering.reduceAction({
    state: {
      board: {
        objects: [],
        clues: []
      },
      row: [],
      broken: []
    },
    action: {
      type: 'submit'
    }
  })).toThrow();
  expect(() => route.reduceAction({
    state: {
      board: {
        size: 4,
        start: 0,
        exit: 0,
        blocks: [],
        checkpoints: []
      },
      path: [0]
    },
    action: {
      type: 'submit'
    }
  })).toThrow();
});
it('accepts a non-shortest route and retains board and path after failed submit, undo and clear', () => {
  const board = {
    size: 4,
    start: 0,
    exit: 3,
    blocks: [15],
    checkpoints: [1, 2],
    ordered: false
  };
  let state = {
    board,
    path: [0]
  };
  for (const cell of [4, 5, 1, 2, 3]) state = route.reduceAction({
    state,
    action: {
      type: 'extend',
      cell
    }
  }).state;
  expect(route.reduceAction({
    state,
    action: {
      type: 'submit'
    }
  }).completed).toBe(true);
  state = route.reduceAction({
    state,
    action: {
      type: 'undo'
    }
  }).state;
  expect(state.path).toEqual([0, 4, 5, 1, 2]);
  expect(route.reduceAction({
    state,
    action: {
      type: 'submit'
    }
  }).state).toEqual(state);
  expect(route.reduceAction({
    state,
    action: {
      type: 'clear'
    }
  }).state).toEqual({
    board,
    path: [0]
  });
});
it('accepts each equivalent operator assignment', () => {
  const state = maths.createState({
    count: 0,
    variant: 'operators'
  });
  state.questions[0] = {
    family: 'operators',
    id: 'operators:0',
    prompt: '2 □ 2 □ 2 = 6',
    tokens: [2, '□', 2, '□', 2],
    target: 6,
    answers: ['++', '+×', '×+']
  };
  for (const answer of state.questions[0].answers) expect(maths.reduceAction({
    state,
    action: {
      type: 'submit',
      answer
    }
  }).state.index).toBe(1);
});
it('clears broken clues after a correction and accepts either satisfying arrangement', () => {
  const objects = ['Key', 'Bell', 'Cup', 'Leaf'],
    clues = [{
      kind: 'before',
      a: 'Key',
      b: 'Leaf'
    }, {
      kind: 'apart',
      a: 'Key',
      b: 'Cup'
    }, {
      kind: 'end',
      a: 'Key'
    }];
  let s = {
    board: {
      objects,
      clues
    },
    row: [...objects].reverse(),
    broken: []
  };
  const failed = ordering.reduceAction({
    state: s,
    action: {
      type: 'submit'
    }
  });
  expect(failed.state.row).toEqual(s.row);
  expect(failed.state.broken).toContain(0);
  s = ordering.reduceAction({
    state: failed.state,
    action: {
      type: 'reorder',
      from: 3,
      to: 0
    }
  }).state;
  expect(s.broken).toEqual([]);
  for (const row of [objects, ['Key', 'Leaf', 'Bell', 'Cup']]) expect(ordering.reduceAction({
    state: {
      ...s,
      row
    },
    action: {
      type: 'submit'
    }
  }).completed).toBe(true);
});
