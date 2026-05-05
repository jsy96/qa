import { NextRequest, NextResponse } from 'next/server';
import { getAllSkills, getSkill } from '@/lib/skills/registry';
import { getGraphData } from '@/lib/skills/graph';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const graph = searchParams.get('graph');

  if (graph === 'true') {
    return NextResponse.json(getGraphData());
  }

  if (slug) {
    const skill = getSkill(slug);
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    return NextResponse.json(skill);
  }

  return NextResponse.json(getAllSkills());
}
