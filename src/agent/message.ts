import type { ChatMessage, PlanStep } from '../types.js';

export function updatePlan(message: ChatMessage, stepId: string, state: PlanStep['state']): ChatMessage {
  if (!message.plan) return message;
  const plan = message.plan.map((step) => (step.id === stepId ? { ...step, state } : step));
  return { ...message, plan };
}

export function nextPlanState(message: ChatMessage): PlanStep | undefined {
  return message.plan?.find((step) => step.state === 'active') ?? message.plan?.find((step) => step.state === 'pending');
}

export function parsePlan(content: string): PlanStep[] {
  const fenced = /```(?:json|plan)\s*([\s\S]*?)```/i.exec(content)?.[1];
  if (!fenced) return [];
  try {
    const parsed = JSON.parse(fenced) as { steps?: Array<{ id?: string; title?: string }> };
    return (parsed.steps ?? [])
      .filter((step): step is { id: string; title: string } => Boolean(step.id && step.title))
      .map((step, index) => ({ id: step.id, title: step.title, state: index === 0 ? 'active' : 'pending' }));
  } catch {
    return [];
  }
}
