import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

const SKILLS_DIR = path.resolve(__dirname, '../skills');
const OUTPUT_DIR = path.resolve(__dirname, '../src/data/skills');

interface RawSkill {
  slug: string;
  frontmatter: {
    name: string;
    description: string;
    source_book: string;
    source_chapter: string;
    tags: string[];
    related_skills: string[];
  };
  sections: {
    R: string;
    I: string;
    A1: string;
    A2: { raw: string; languageSignals: string[] };
    E: Array<{
      stepNumber: number;
      instruction: string;
      completionCriteria: string;
      stopCondition?: string;
    }>;
    B: string;
  };
  relationships: {
    dependsOn: string[];
    composesWith: string[];
    contrastsWith: string[];
  };
}

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionPattern = /^## ([RIBA\d]+)\s*[-—]\s*.+$/gm;
  const matches: Array<{ key: string; index: number }> = [];

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    const key = match[1].charAt(0);
    matches.push({ key, index: match.index + match[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index - 50 : content.length;
    const key = matches[i].key;

    // Handle duplicate keys (A1, A2)
    let actualKey = key;
    if (key === 'A') {
      // Determine A1 vs A2 from the section header
      const headerStart = matches[i].index - 10;
      const headerText = content.substring(Math.max(0, headerStart), start);
      if (headerText.includes('A2') || headerText.includes('触发场景')) {
        actualKey = 'A2';
      } else {
        actualKey = 'A1';
      }
    }

    // Find the actual section end
    let sectionEnd = end;
    // Look for the next ## heading
    const nextHeadingIdx = content.indexOf('\n## ', start);
    if (nextHeadingIdx !== -1 && nextHeadingIdx < sectionEnd) {
      sectionEnd = nextHeadingIdx;
    }

    sections[actualKey] = content.substring(start, sectionEnd).trim();
  }

  return sections;
}

function parseA1A2Sections(content: string): { A1: string; A2: string } {
  const result = { A1: '', A2: '' };

  // Find A1 section
  const a1Match = content.match(/##\s*A1\s*[-—]\s*.*?\n([\s\S]*?)(?=##\s*A2|$)/i);
  if (a1Match) result.A1 = a1Match[1].trim();

  // Find A2 section
  const a2Match = content.match(/##\s*A2\s*[-—]\s*.*?\n([\s\S]*?)(?=##\s*[EB]|$)/i);
  if (a2Match) result.A2 = a2Match[1].trim();

  return result;
}

function parseLanguageSignals(a2Text: string): string[] {
  const signals: string[] = [];
  const lines = a2Text.split('\n');
  let inSignals = false;
  for (const line of lines) {
    if (line.includes('语言信号')) {
      inSignals = true;
      continue;
    }
    if (inSignals) {
      if (line.startsWith('###') || line.startsWith('## ')) {
        inSignals = false;
        continue;
      }
      const quoted = line.match(/[""「"]([^""」"]+)[""」"]/g);
      if (quoted) {
        signals.push(...quoted.map(q => q.replace(/[""「」"]/g, '')));
      }
    }
  }
  return signals;
}

function parseESection(eText: string): RawSkill['sections']['E'] {
  const steps: RawSkill['sections']['E'] = [];
  const stepPattern = /\d+\.\s*\*\*(.+?)\*\*\n([\s\S]*?)(?=\d+\.\s*\*\*|$)/g;
  let match;
  let stepNum = 0;

  while ((match = stepPattern.exec(eText)) !== null) {
    stepNum++;
    const instruction = match[1];
    const body = match[2].trim();

    let completionCriteria = '';
    let stopCondition: string | undefined;

    // Parse completion criteria
    const criteriaMatch = body.match(/完成标准[：:]\s*(.+)/);
    if (criteriaMatch) completionCriteria = criteriaMatch[1].trim();

    // Parse stop condition
    const stopMatch = body.match(/判停[：:]\s*(.+)/);
    if (stopMatch) stopCondition = stopMatch[1].trim();

    steps.push({
      stepNumber: stepNum,
      instruction: instruction + '\n' + body,
      completionCriteria,
      stopCondition,
    });
  }

  // Fallback: if no numbered steps found, treat as single step
  if (steps.length === 0 && eText.trim()) {
    steps.push({
      stepNumber: 1,
      instruction: eText.trim(),
      completionCriteria: '',
    });
  }

  return steps;
}

function parseRelationships(content: string): RawSkill['relationships'] {
  const result: RawSkill['relationships'] = {
    dependsOn: [],
    composesWith: [],
    contrastsWith: [],
  };

  const dependsMatch = content.match(/depends-on:\s*(.+)/);
  if (dependsMatch) {
    result.dependsOn = dependsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  const composesMatch = content.match(/composes-with:\s*(.+)/);
  if (composesMatch) {
    result.composesWith = composesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  const contrastsMatch = content.match(/contrasts-with:\s*(.+)/);
  if (contrastsMatch) {
    result.contrastsWith = contrastsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  return result;
}

function parseSkillFile(dir: string): RawSkill {
  const skillMd = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8');
  const { data: frontmatter, content } = matter(skillMd);
  const slug = path.basename(dir);

  // Parse A1 and A2 sections
  const { A1, A2 } = parseA1A2Sections(content);

  // Parse R section
  const rMatch = content.match(/##\s*R\s*[-—]\s*.*?\n([\s\S]*?)(?=##\s*I\s*[-—]|$)/i);
  const R = rMatch ? rMatch[1].trim() : '';

  // Parse I section
  const iMatch = content.match(/##\s*I\s*[-—]\s*.*?\n([\s\S]*?)(?=##\s*A1|$)/i);
  const I = iMatch ? iMatch[1].trim() : '';

  // Parse E section
  const eMatch = content.match(/##\s*E\s*[-—]\s*.*?\n([\s\S]*?)(?=##\s*B\s*[-—]|$)/i);
  const eText = eMatch ? eMatch[1].trim() : '';

  // Parse B section
  const bMatch = content.match(/##\s*B\s*[-—]\s*.*?\n([\s\S]*?)(?=---|$)/i);
  const B = bMatch ? bMatch[1].trim() : '';

  // Parse relationships from footer
  const relationships = parseRelationships(content);

  return {
    slug,
    frontmatter: {
      name: frontmatter.name || slug,
      description: frontmatter.description || '',
      source_book: frontmatter.source_book || '',
      source_chapter: frontmatter.source_chapter || '',
      tags: frontmatter.tags || [],
      related_skills: frontmatter.related_skills || [],
    },
    sections: {
      R,
      I,
      A1,
      A2: {
        raw: A2,
        languageSignals: parseLanguageSignals(A2),
      },
      E: parseESection(eText),
      B,
    },
    relationships,
  };
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const skillDirs = fs.readdirSync(SKILLS_DIR).filter(name => {
    return fs.statSync(path.join(SKILLS_DIR, name)).isDirectory()
      && fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md'));
  });

  console.log(`Found ${skillDirs.length} skills to process`);

  const index: Array<{
    slug: string;
    name: string;
    description: string;
    tags: string[];
    source_chapter: string;
    relationships: RawSkill['relationships'];
  }> = [];

  let errors = 0;

  for (const dir of skillDirs) {
    try {
      const skill = parseSkillFile(path.join(SKILLS_DIR, dir));

      // Write individual skill JSON
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${dir}.json`),
        JSON.stringify(skill, null, 2),
        'utf-8'
      );

      // Add to index
      index.push({
        slug: skill.slug,
        name: skill.frontmatter.name,
        description: skill.frontmatter.description,
        tags: skill.frontmatter.tags,
        source_chapter: skill.frontmatter.source_chapter,
        relationships: skill.relationships,
      });

      console.log(`  ✓ ${dir} (${skill.sections.E.length} execution steps)`);
    } catch (err) {
      console.error(`  ✗ ${dir}: ${err}`);
      errors++;
    }
  }

  // Write index
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );

  console.log(`\nDone: ${index.length} skills processed, ${errors} errors`);
}

main();
