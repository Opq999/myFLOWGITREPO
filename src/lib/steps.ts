/**
 * Pull the numbered step lines out of the `## Steps` section of a raw MDX
 * body. Used to build schema.org HowTo JSON-LD without a markdown parser.
 */
export function extractSteps(body: string): string[] {
  const sectionMatch = body.match(/^##\s+Steps\b[\s\S]*?(?=^##\s|(?![\s\S]))/m);
  if (!sectionMatch) return [];
  const steps: string[] = [];
  for (const match of sectionMatch[0].matchAll(/^\d+\.\s+(.+)$/gm)) {
    // Strip markdown emphasis/links down to plain text for JSON-LD.
    const text = match[1]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim();
    if (text) steps.push(text);
  }
  return steps;
}
