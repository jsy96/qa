import type { ExecutionPlan, SkillMeta } from './types';
import { getAllSkills, getSkillMeta } from './registry';

type RelationshipMap = Map<string, {
  dependsOn: string[];
  composesWith: string[];
  contrastsWith: string[];
}>;

let graphCache: RelationshipMap | null = null;

function buildGraph(): RelationshipMap {
  if (graphCache) return graphCache;

  const graph: RelationshipMap = new Map();
  const skills = getAllSkills();

  for (const skill of skills) {
    graph.set(skill.slug, {
      dependsOn: skill.relationships.dependsOn || [],
      composesWith: skill.relationships.composesWith || [],
      contrastsWith: skill.relationships.contrastsWith || [],
    });
  }

  graphCache = graph;
  return graph;
}

function resolveDependencies(skillSlug: string, graph: RelationshipMap, visited: Set<string>): string[] {
  if (visited.has(skillSlug)) return [];
  visited.add(skillSlug);

  const node = graph.get(skillSlug);
  if (!node) return [skillSlug];

  const deps: string[] = [];
  for (const dep of node.dependsOn) {
    deps.push(...resolveDependencies(dep, graph, visited));
  }
  deps.push(skillSlug);
  return deps;
}

function topologicalSort(skills: string[], graph: RelationshipMap): string[] {
  const inDegree: Map<string, number> = new Map();
  const allSkills = new Set(skills);

  // Build in-degree map
  for (const s of skills) {
    inDegree.set(s, 0);
  }

  for (const s of skills) {
    const node = graph.get(s);
    if (node) {
      for (const dep of node.dependsOn) {
        if (allSkills.has(dep)) {
          inDegree.set(s, (inDegree.get(s) || 0) + 1);
        }
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [s, deg] of inDegree) {
    if (deg === 0) queue.push(s);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const s of skills) {
      const node = graph.get(s);
      if (node && node.dependsOn.includes(current)) {
        const newDeg = (inDegree.get(s) || 1) - 1;
        inDegree.set(s, newDeg);
        if (newDeg === 0) queue.push(s);
      }
    }
  }

  // Add any skills not in sorted (cycle or disconnected)
  for (const s of skills) {
    if (!sorted.includes(s)) sorted.push(s);
  }

  return sorted;
}

export function resolveExecutionPlan(primarySkills: string[]): ExecutionPlan {
  const graph = buildGraph();
  const visited = new Set<string>();

  // Resolve all dependencies recursively
  const allSkills: string[] = [];
  for (const skill of primarySkills) {
    const deps = resolveDependencies(skill, graph, visited);
    for (const d of deps) {
      if (!allSkills.includes(d)) allSkills.push(d);
    }
  }

  // Separate into categories
  const primarySet = new Set(primarySkills);
  const secondarySkills: string[] = [];
  const contrastSkills: string[] = [];

  for (const s of allSkills) {
    if (primarySet.has(s)) continue;

    // Check if it was pulled in as a compose-with from any primary
    let isCompose = false;
    for (const p of primarySkills) {
      const node = graph.get(p);
      if (node?.composesWith.includes(s)) {
        isCompose = true;
        break;
      }
    }

    if (isCompose) {
      secondarySkills.push(s);
    }
  }

  // Add contrast skills (don't execute, just include as reference)
  for (const p of primarySkills) {
    const node = graph.get(p);
    if (node) {
      for (const c of node.contrastsWith) {
        if (!contrastSkills.includes(c)) contrastSkills.push(c);
      }
    }
  }

  // Topological sort
  const executionOrder = topologicalSort(allSkills, graph);

  return {
    primarySkills,
    secondarySkills,
    contrastSkills,
    executionOrder,
  };
}

export function getGraphData(): {
  nodes: Array<{ id: string; label: string; group: string }>;
  edges: Array<{ from: string; to: string; type: 'depends-on' | 'composes-with' | 'contrasts-with' }>;
} {
  const graph = buildGraph();
  const nodes: Array<{ id: string; label: string; group: string }> = [];
  const edges: Array<{ from: string; to: string; type: 'depends-on' | 'composes-with' | 'contrasts-with' }> = [];

  const groups: Record<string, string> = {
    'circle-of-competence': '基础',
    'real-conservatism': '基础',
    'mr-market': '基础',
    'business-picker': '基础',
    'aesop-three-questions': '估值',
    'margin-of-safety': '估值',
    'look-through-earnings': '估值',
    'three-asset-categories': '估值',
    'economic-moat': '企业',
    'cigar-butt-vs-great-business': '企业',
    'float-thinking': '企业',
    'fear-and-greed': '行为',
    'institutional-imperative': '行为',
    'compounding-thinking': '资本',
    'hold-forever': '资本',
    'first-law-of-capital-allocation': '资本',
    'never-issue-shares': '资本',
    'partner-with-admired': '资本',
    'no-leverage': '风控',
    'ceo-as-risk-officer': '风控',
  };

  for (const [slug, rels] of graph) {
    const meta = getSkillMeta(slug);
    nodes.push({
      id: slug,
      label: meta?.name || slug,
      group: groups[slug] || '其他',
    });

    for (const dep of rels.dependsOn) {
      edges.push({ from: slug, to: dep, type: 'depends-on' });
    }
    for (const comp of rels.composesWith) {
      edges.push({ from: slug, to: comp, type: 'composes-with' });
    }
    for (const cont of rels.contrastsWith) {
      edges.push({ from: slug, to: cont, type: 'contrasts-with' });
    }
  }

  return { nodes, edges };
}
