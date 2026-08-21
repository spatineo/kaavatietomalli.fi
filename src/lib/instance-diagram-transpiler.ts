/**
 * Transpiles the custom "Instance Diagram" DSL code block into a standard Mermaid flowchart diagram.
 * It configures the flowchart to use the ELK layout engine.
 *
 * @param code The Instance DSL code string.
 * @returns The transpiled standard Mermaid code string.
 */
export function transpileInstanceToMermaid(code: string): string {
  const lines = code.split('\n');
  const titleRegex = /^\s*title\s*[:=]\s*(.+)$/i;

  let title: string | null = null;
  for (const rawLine of lines) {
    const titleMatch = rawLine.match(titleRegex);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
      break;
    }
  }

  const mermaidLines: string[] = [
    '---',
  ];
  if (title) {
    mermaidLines.push(`title: ${title}`);
  }
  mermaidLines.push(
    'config:',
    '  layout: elk',
    '---',
    'flowchart LR'
  );

  const objectDeclRegex = /^(?:object|instance)\s+([a-zA-Z0-9_äöåÄÖÅ]+)\s*:\s*([^\{\r\n]+?)(?:\s*\{)?$/;
  const attrRegex = /^\s*([a-zA-Z0-9_äöåÄÖÅ\s:-]+?)\s*=\s*(.+)$/;
  const relationRegex = /^([a-zA-Z0-9_äöåÄÖÅ]+)\s*(<-{1,3}>|-{2,3}|-{1,2}>|\.->)\s*([a-zA-Z0-9_äöåÄÖÅ]+)(?:\s*:\s*(.+))?$/;

  let currentId: string | null = null;
  let currentClass: string | null = null;
  let currentAttrs: string[] = [];

  const flushObject = () => {
    if (!currentId || !currentClass) return;
    let instanceContent = `${currentId}["<b>${currentId} : ${currentClass}</b><hr/>`
    
    for (const attr of currentAttrs){
      instanceContent += `<span>${attr}</span><br/>`;
    }
    instanceContent += '"]';
    currentId = null;
    currentClass = null;
    currentAttrs = [];
    mermaidLines.push(instanceContent);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || line === 'instanceDiagram' || titleRegex.test(line)) {
      continue;
    }

    const objMatch = line.match(objectDeclRegex);
    if (objMatch) {
      if (currentId) flushObject();
      currentId = objMatch[1];
      currentClass = objMatch[2].trim();
      if (!line.endsWith('{')) flushObject();
      continue;
    }

    if (line === '}' && currentId) {
      flushObject();
      continue;
    }

    if (currentId) {
      const attrMatch = line.match(attrRegex);
      if (attrMatch) {
        const key = attrMatch[1].trim();
        const val = attrMatch[2].replace(/"/g, '&quot;'); 
        currentAttrs.push(`${key} = ${val}`);
      }
      continue;
    }

    const relMatch = line.match(relationRegex);
    if (relMatch) {
      const [_, source, rawArrow, target, rawLabel] = relMatch;
      const label = rawLabel ? rawLabel.trim() : '';
      const isBidirectional = rawArrow.includes('<') || rawArrow === '---' || rawArrow === '--';

      if (isBidirectional && label.includes('|')) {
        const [leftRole, rightRole] = label.split('|').map(r => r.trim());
        let arrow = rawArrow.includes('<') ? '<-->' : '---';
        let delimiter = rawArrow.includes('<') ? '◄───►' : '─────────────────';
        const formattedLabel = `<span class="edgeLabel">:${leftRole}&nbsp;${delimiter}&nbsp;:${rightRole}</span>`;
        mermaidLines.push(`  ${source} ${arrow}|"${formattedLabel}"| ${target}`);
      } else if (label) {
        let arrow = rawArrow.includes('.') ? '-.->' : '-->';
        mermaidLines.push(`  ${source} ${arrow}|"${label}"| ${target}`);
      } else {
        mermaidLines.push(`  ${source} ${rawArrow} ${target}`);
      }
    }
  }

  if (currentId) flushObject();
  return mermaidLines.join('\n');
}
