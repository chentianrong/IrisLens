import { describe, expect, it } from 'vitest';
import { nextPlanState, parsePlan, updatePlan } from '../../src/agent/message.js';
import type { ChatMessage } from '../../src/types.js';

describe('scripted multi-step conversation', () => {
  it('advances plan lifecycle across assistant turns', () => {
    const content = '```json\n{"steps":[{"id":"inspect","title":"Inspect workspace"},{"id":"edit","title":"Propose edit"},{"id":"verify","title":"Run checks"}]}\n```';
    let message: ChatMessage = { id: 'm1', conversationId: 'c1', role: 'assistant', content, state: 'complete', createdAt: '' };
    message = { ...message, plan: parsePlan(message.content) };
    expect(message.plan?.map((step) => step.state)).toEqual(['active', 'pending', 'pending']);

    message = updatePlan(message, 'inspect', 'complete');
    message = updatePlan(message, 'edit', 'active');
    expect(nextPlanState(message)).toMatchObject({ id: 'edit', state: 'active' });
    expect(message.plan?.find((step) => step.id === 'inspect')?.state).toBe('complete');

    message = updatePlan(message, 'edit', 'complete');
    message = updatePlan(message, 'verify', 'active');
    expect(message.plan?.map((step) => step.state)).toEqual(['complete', 'complete', 'active']);
  });
});
