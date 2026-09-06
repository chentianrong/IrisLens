import { describe, expect, it } from 'vitest';
import { nextPlanState, parsePlan, updatePlan } from '../../src/agent/message.js';
import type { ChatMessage } from '../../src/types.js';

const message: ChatMessage = {
  id: 'm1', conversationId: 'c1', role: 'assistant', content: '', state: 'generating', createdAt: ''
};

describe('Agent plan processing', () => {
  it('parses ordered plan steps from a fenced JSON block', () => {
    const plan = parsePlan('Here is my plan:\n```json\n{"steps":[{"id":"one","title":"Inspect"},{"id":"two","title":"Edit"}]}\n```');
    expect(plan).toEqual([
      { id: 'one', title: 'Inspect', state: 'active' },
      { id: 'two', title: 'Edit', state: 'pending' }
    ]);
  });

  it('updates state without erasing completed steps', () => {
    const planned = { ...message, plan: [{ id: 'one', title: 'Inspect', state: 'active' as const }, { id: 'two', title: 'Edit', state: 'pending' as const }] };
    const updated = updatePlan(planned, 'one', 'complete');
    expect(updated.plan?.[0]).toMatchObject({ state: 'complete' });
    expect(nextPlanState(updated)).toMatchObject({ id: 'two', state: 'pending' });
  });
});
