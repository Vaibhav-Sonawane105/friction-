import { it, expect } from 'vitest';
import * as registry from './redesignWorker';
import { createChallengeCoordinator } from '../services/challenges';
import { migrateChallengeState } from '../services/challengeState';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getModuleDescriptor } from './redesignRegistry';
const domains = [{
  domain: 'example.com',
  enabled: true,
  successfulUnlockCount: 20
}];
const context = tabId => ({
  epoch: 'x',
  tabId,
  domain: 'example.com'
});
it('keeps earlier tab levels and bag history while a second tab crosses 20', async () => {
  let db = {
    epoch: 'x',
    domains: structuredClone(domains),
    sessions: {},
    challengeState: migrateChallengeState({
      domains,
      epoch: 'x'
    })
  };
  const c = createChallengeCoordinator({
    registry,
    readSnapshot: async () => structuredClone(db),
    writeSnapshot: async next => {
      db = structuredClone(next);
    },
    random: () => 0.32
  });
  const first = await c.getChallenge(context(1)),
    second = await c.getChallenge(context(2), {
      moduleId: 'maths'
    });
  let q = second;
  const questions = db.challengeState.attempts[q.attemptId].state.questions;
  for (const problem of questions) {
    const request = {
      attemptId: q.attemptId,
      revision: q.revision,
      action: {
        type: 'submit',
        answer: String(problem.answer ?? problem.answers[0])
      }
    };
    q = await c.dispatchAction(context(2), request);
    if (q.completed) await c.dispatchAction(context(2), request);
  }
  expect(db.domains[0].successfulUnlockCount).toBe(21);
  expect((await c.getChallenge(context(1))).level).toBe(1);
  const next = await c.getChallenge(context(3));
  expect(next.level).toBe(2);
  expect(next.moduleId).not.toBe(first.moduleId);
  expect(migrateChallengeState({
    domains: db.domains,
    stored: db.challengeState,
    epoch: 'x',
    redesign: true
  }).domains['example.com'].rotation).toEqual(db.challengeState.domains['example.com'].rotation);
});
it('retires only incompatible active modules and keeps old memory matches', async () => {
  const base = migrateChallengeState({
      domains,
      epoch: 'x'
    }),
    gen = base.domains['example.com'].generation;
  const common = {
    domain: 'example.com',
    epoch: 'x',
    generation: gen,
    level: 3,
    count: 35,
    moduleVersion: 1,
    persistence: 'tab',
    revision: 0,
    status: 'active',
    tabId: 1
  };
  const old = await registry.getModuleDescriptor('memory', 1).loadModel(),
    s = old.createState({
      count: 35
    });
  s.revealed = [0];
  base.attempts.old = {
    ...common,
    id: 'old',
    moduleId: 'attention',
    state: {}
  };
  base.attempts.mem = {
    ...common,
    id: 'mem',
    moduleId: 'memory',
    state: s,
    tabId: 2
  };
  const next = migrateChallengeState({
    domains,
    stored: base,
    epoch: 'x',
    redesign: true
  });
  expect(Object.keys(next.attempts)).toEqual(['mem']);
  old.validateState(next.attempts.mem.state);
  expect(next.attempts.mem.state.revealed).toEqual([0]);
  expect(migrateChallengeState({
    domains,
    stored: next,
    epoch: 'x',
    redesign: true
  })).toEqual(next);
});
it('all four views render usable controls from public state', async () => {
  for (const id of registry.selectModuleIds(4)) {
    const m = await registry.getModuleDescriptor(id).loadModel(),
      s = m.toPublicState(m.createState({
        count: 51
      }));
    const {
      default: View
    } = await getModuleDescriptor(id).loadView();
    const html = renderToStaticMarkup(createElement(View, {
      state: s,
      onAction() {},
      disabled: false
    }));
    expect(html).toContain('<button');
    if (id === 'memory') {
      expect(html).toContain('Card 16, face down');
      expect(html).not.toContain('<svg');
    }
    if (id === 'route') expect(html).toContain('Undo');
    if (id === 'ordering') expect(html).toContain('earlier');
  }
});
