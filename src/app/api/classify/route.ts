import { NextRequest, NextResponse } from 'next/server';
import { classifyQuery } from '@/lib/agent/classifier';
import { resolveExecutionPlan } from '@/lib/skills/graph';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const classification = await classifyQuery(query);
    const plan = resolveExecutionPlan(classification.primarySkills);

    return NextResponse.json({
      classification,
      executionPlan: plan,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
