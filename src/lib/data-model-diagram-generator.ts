import { DataModelAccess, DataModelSnippetConfig, DataModel, ClassModel, Codelist, Attribute, Association } from './data-model-types';

export function parseDataModelSnippetConfig(code: string): DataModelSnippetConfig {
  const lines = code.split('\n');
  let modelId = '';
  let classes: string[] = [];
  let lang = 'fi';
  let inClassesSection = false;
  let title;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    if (inClassesSection && trimmed.startsWith('-')) {
      const item = trimmed.substring(1).trim().replace(/^['"]|['"]$/g, '');
      if (item) classes.push(item);
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, colonIndex).trim();
    const val = trimmed.substring(colonIndex + 1).trim();

    if (key === 'modelId') {
      modelId = val.replace(/^['"]|['"]$/g, '');
      inClassesSection = false;
    } else if (key === 'lang') {
      lang = val.replace(/^['"]|['"]$/g, '') || 'fi';
      inClassesSection = false;
    } else if (key == 'title') {
      title = val.replace(/^['"]|['"]$/g, '');
      inClassesSection = false;
    } else if (key === 'classes') {
      if (val.startsWith('[') && val.includes(']')) {
        try {
          classes = JSON.parse(val);
        } catch {
          classes = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
        inClassesSection = false;
      } else if (val === '' || val === '[') {
        inClassesSection = true;
      } else {
        classes = [val.replace(/^['"]|['"]$/g, '')];
        inClassesSection = false;
      }
    }
  }

  return { modelId, classes, title, lang };
}

function deriveTechNameFromId(id: string | null): string {
  if (!id) return 'UnknownClass';
  const cleaned = id.replace(/\/+$/, '');
  const lastPart = cleaned.split('/').pop() || cleaned;
  return lastPart.replace(/^.*?:/, '');
}

export async function transpileDataModelSnippetToMermaid(
  code: string,
  access: DataModelAccess
): Promise<string> {
  const config = parseDataModelSnippetConfig(code);
  const lang = config.lang || 'fi';

  if (!config.modelId) {
    return `classDiagram\n    note "Error: No modelId specified in snippet"`;
  }

  const dataModel: DataModel | null = await access.getDataModel(config.modelId);
  if (!dataModel) {
    return `classDiagram\n    note "Tietomallia ei löytynyt: ${config.modelId}"`;
  }

  const modelClasses: ClassModel[] = dataModel.classes || [];
  const diagramTitle = config.title;

  // Map requested classes
  const includedClassObjs: ClassModel[] = [];
  const includedTechNames = new Set<string>();

  for (const requestedId of config.classes) {
    const techNameFromReq = deriveTechNameFromId(requestedId);
    let matchedClass = modelClasses.find((c: ClassModel) => c.id === requestedId);
    if (!matchedClass) {
      matchedClass = modelClasses.find(
        (c: ClassModel) => c.technicalName === techNameFromReq || (c.id && c.id.endsWith('/' + techNameFromReq))
      );
    }
    if (!matchedClass) {
      matchedClass = modelClasses.find(
        (c: ClassModel) =>
          c.technicalName?.toLowerCase() === techNameFromReq.toLowerCase() ||
          (c.id && c.id.toLowerCase().endsWith('/' + techNameFromReq.toLowerCase()))
      );
    }

    const techName = matchedClass?.technicalName || techNameFromReq;
    const classObj = matchedClass || {
      id: requestedId,
      technicalName: techName,
      name: { [lang]: techName },
      attributes: [],
      associations: []
    };

    includedClassObjs.push(classObj);
    includedTechNames.add(techName);
  }

  const referencedCodelists = new Map<string, { data: Codelist; uri: string }>();
  const codelistUseRelations: { classTechName: string; codelistTechName: string }[] = [];
  const plainBoxTechNames = new Set<string>();
  const classBlocks: string[] = [];
  const relationLines: string[] = [];
  const drawnAssociations = new Set<string>();

  for (const cls of includedClassObjs) {
    const classTechName = cls.technicalName || deriveTechNameFromId(cls.id);
    const classLocalizedName =
      cls.name?.[lang] || cls.name?.fi || cls.name?.sv || cls.name?.en || classTechName;

    const attrLines: string[] = [];

    for (const attr of cls.attributes || []) {
      const attrLocalizedName =
        attr.name?.[lang] || attr.name?.fi || attr.name?.sv || attr.name?.en || attr.id?.split('/').pop() || 'attribuutti';

      let typeName = attr.type || attr.datatype || 'string';

      const codelistProp = attr.codelist;
      if (codelistProp && (Array.isArray(codelistProp) ? codelistProp.length > 0 : Boolean(codelistProp))) {
        const codelistUris = Array.isArray(codelistProp) ? codelistProp : [codelistProp];
        const techNames: string[] = [];

        for (const codelistUri of codelistUris) {
          const codelistData = await access.getCodelist(codelistUri);

          let codelistTechName = '';
          if (!codelistData) {
            console.warn(`Codelist not found for URI: ${codelistUri}`);
          } else {
            if (codelistData.technicalName) {
              codelistTechName = codelistData.technicalName;
            }
            const uriLast = codelistUri.replace(/\/+$/, '').split('/').pop() || 'codelist';
            codelistTechName = uriLast.replace(/_v\d+_\d+$/, '');

            techNames.push(codelistTechName);

            if (!referencedCodelists.has(codelistTechName)) {
              referencedCodelists.set(codelistTechName, { data: codelistData, uri: codelistUri });
            }

            if (!codelistUseRelations.some(r => r.classTechName === classTechName && r.codelistTechName === codelistTechName)) {
              codelistUseRelations.push({ classTechName, codelistTechName });
            }
          }
        }

        typeName = techNames.join(' or ');
      }

      let cardinality = attr.cardinality || '[0..1]';
      if (!cardinality.startsWith('[')) {
        cardinality = `[${cardinality}]`;
      }

      attrLines.push(`        +${attrLocalizedName} : ${typeName} ${cardinality}`);
    }

    classBlocks.push(
      `    class ${classTechName}["${classLocalizedName}"] {\n${attrLines.join('\n')}\n    }`
    );
  }

  // Generate codelist blocks
  const codelistBlocks: string[] = [];
  for (const [codelistTechName, info] of referencedCodelists.entries()) {
    const data = info.data;
    const codelistLocalizedName =
      data?.name?.[lang] ||
      data?.name?.fi ||
      data?.name?.sv ||
      data?.name?.en ||
      data?.name?.[lang] ||
      data?.name?.fi ||
      codelistTechName;
    const vocabulary = data?.vocabulary || data?.uri || info.uri;
    const uri = data?.uri || data?.vocabulary || info.uri;
    codelistBlocks.push(
      `    class ${codelistTechName}["${codelistLocalizedName}"]:::codelistClass {\n        <<codelist>>\n        vocabulary = ${vocabulary} \n    }\n`
    );
  }

  // Generate inheritance and association relations
  for (const cls of includedClassObjs) {
    const classTechName = cls.technicalName || deriveTechNameFromId(cls.id);

    // Inheritance check: superclass property or "Yläluokka" association
    let superclassTargetId = cls.superclass || null;
    if (!superclassTargetId && Array.isArray(cls.associations)) {
      const ylaluokkaAssoc = cls.associations.find(
        (a: Association) => a.name?.fi === 'Yläluokka' || a.name?.en === 'Upper category' || a.name?.sv === 'Överkategori'
      );
      if (ylaluokkaAssoc) {
        superclassTargetId = ylaluokkaAssoc.targetClassId;
      }
    }

    if (superclassTargetId) {
      const superclassClassObj = modelClasses.find(
        (c: ClassModel) => c.id === superclassTargetId
      );
      const superclassTechName = superclassClassObj?.technicalName || deriveTechNameFromId(superclassTargetId);
      relationLines.push(`    ${superclassTechName} <|-- ${classTechName}`);
      if (!includedTechNames.has(superclassTechName) && !referencedCodelists.has(superclassTechName)) {
        plainBoxTechNames.add(superclassTechName);
      }
    }

    // Direct associations
    for (const assoc of cls.associations || []) {
      if (
        assoc.name?.fi === 'Yläluokka' ||
        assoc.name?.en === 'Upper category' ||
        assoc.name?.sv === 'Överkategori'
      ) {
        continue;
      }

      if (assoc.id && drawnAssociations.has(assoc.id)) {
        continue;
      }

      const targetClassObj = modelClasses.find(
        (c: ClassModel) => c.id === assoc.targetClassId
      );
      const targetTechName = targetClassObj?.technicalName || deriveTechNameFromId(assoc.targetClassId);

      const isSelfAssociation = cls.id === assoc.targetClassId || classTechName === targetTechName;

      if (assoc.oppositeDirection && !isSelfAssociation) {
        // Bi-directional association
        let cardA = assoc.oppositeDirection.cardinality || '0..*';
        cardA = cardA.replace(/^\[|\]$/g, '');
        let cardB = assoc.cardinality || '0..*';
        cardB = cardB.replace(/^\[|\]$/g, '');

        const labelA = assoc.name?.[lang] || assoc.name?.fi || assoc.name?.sv || assoc.name?.en || '';
        const labelB = assoc.oppositeDirection.name?.[lang] || assoc.oppositeDirection.name?.fi || assoc.oppositeDirection.name?.sv || assoc.oppositeDirection.name?.en || '';
        let label = '';
        if (labelA && labelB) {
          label = labelA === labelB ? labelA : `${labelA} / ${labelB}`;
        } else {
          label = labelA || labelB || '';
        }

        relationLines.push(`    ${classTechName} "${cardA}" <--> "${cardB}" ${targetTechName} : ${label}`);
        if (assoc.id) {
          drawnAssociations.add(assoc.id);
        }
        if (assoc.oppositeDirection.id) {
          drawnAssociations.add(assoc.oppositeDirection.id);
        }
      } else {
        // Uni-directional association
        let cardStr = assoc.cardinality || '0..*';
        cardStr = cardStr.replace(/^\[|\]$/g, '');

        const assocLocalizedName =
          assoc.name?.[lang] || assoc.name?.fi || assoc.name?.sv || assoc.name?.en || '';

        relationLines.push(`    ${classTechName} --> "${cardStr}" ${targetTechName} : ${assocLocalizedName}`);
        if (assoc.id) {
          drawnAssociations.add(assoc.id);
        }
      }

      if (!includedTechNames.has(targetTechName) && !referencedCodelists.has(targetTechName)) {
        plainBoxTechNames.add(targetTechName);
      }
    }

    // Codelist «use» relations
    const classCodelistUses = codelistUseRelations.filter(r => r.classTechName === classTechName);
    for (const rel of classCodelistUses) {
      relationLines.push(`    ${classTechName} ..> ${rel.codelistTechName} : «use»`);
    }
  }

  const plainBoxBlocks: string[] = [];
  for (const plainTechName of plainBoxTechNames) {
    const plainClassObj = modelClasses.find(
      (c: ClassModel) => c.technicalName === plainTechName || deriveTechNameFromId(c.id) === plainTechName
    );
    const plainLocalizedName =
      plainClassObj?.name?.[lang] ||
      plainClassObj?.name?.fi ||
      plainClassObj?.name?.sv ||
      plainClassObj?.name?.en ||
      plainTechName;

    plainBoxBlocks.push(`    class ${plainTechName}["${plainLocalizedName}"]:::plainClass`);
  }

  const sections: string[] = [];
  let header = `---
    title: ${diagramTitle || ''}
    config:
        layout: elk
        class:
            hideEmptyMembersBox: true
---
classDiagram
    %% Automatically generated from ${dataModel.id} modified on ${dataModel.metadata?.lastModified || '[n/a]'}
    %% Information downloaded from tietomallit.suomi.fi on ${dataModel.metadata?.originSyncTime || '[n/a]'}
    `

  sections.push(header);

  if (classBlocks.length > 0) {
    sections.push(classBlocks.join('\n\n'));
  }

  if (plainBoxBlocks.length > 0) {
    sections.push(plainBoxBlocks.join('\n'));
  }

  if (codelistBlocks.length > 0) {
    sections.push(codelistBlocks.join('\n\n'));
  }

  if (relationLines.length > 0) {
    sections.push(relationLines.join('\n'));
  }

  return sections.join('\n\n');
}

export async function convertDataModelDiagramsToMermaid(
  markdown: string,
  access: DataModelAccess
): Promise<string> {
  const pattern = /```data-model-snippet[\r\n]+([\s\S]*?)```/g;
  let result = markdown;
  let match: RegExpExecArray | null;

  const matches: { fullMatch: string; code: string }[] = [];
  while ((match = pattern.exec(markdown)) !== null) {
    matches.push({ fullMatch: match[0], code: match[1] });
  }

  for (const m of matches) {
    const transpiledMermaid = await transpileDataModelSnippetToMermaid(m.code, access);
    const replacement = `\`\`\`mermaid\n${transpiledMermaid}\n\`\`\``;
    result = result.replace(m.fullMatch, replacement);
  }

  return result;
}
