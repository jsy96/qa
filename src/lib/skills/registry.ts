import type { Skill, SkillMeta } from './types';
import indexData from '@/data/skills/index.json';

const skillCache: Map<string, Skill> = new Map();

let index: SkillMeta[] = [];

function getIndex(): SkillMeta[] {
  if (index.length === 0) {
    index = indexData as SkillMeta[];
  }
  return index;
}

function loadSkill(slug: string): Skill | null {
  if (skillCache.has(slug)) return skillCache.get(slug)!;

  try {
    // Dynamic import for JSON files
    const data = require(`@/data/skills/${slug}.json`) as Skill;
    skillCache.set(slug, data);
    return data;
  } catch {
    return null;
  }
}

export function getAllSkills(): SkillMeta[] {
  return getIndex();
}

export function getSkill(slug: string): Skill | null {
  return loadSkill(slug);
}

export function getSkillMeta(slug: string): SkillMeta | undefined {
  return getIndex().find(s => s.slug === slug);
}

export function searchSkillsByTags(tags: string[]): SkillMeta[] {
  return getIndex().filter(skill =>
    tags.some(tag => skill.tags.includes(tag))
  );
}

export function getSkillDescriptions(): Array<{
  slug: string;
  name: string;
  description: string;
  tags: string[];
  languageSignals: string[];
}> {
  return getIndex().map(skill => {
    const fullSkill = loadSkill(skill.slug);
    return {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      tags: skill.tags,
      languageSignals: fullSkill?.sections.A2.languageSignals || [],
    };
  });
}
