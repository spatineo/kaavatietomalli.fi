import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isContentEqual } from './content-utils';

export interface DataModelConfig {
  remote: {
    api: string;
    name: string;
  };
  models: Array<{
    name: string;
    versions: string[];
  }>;
}

export interface TietomalliIndexItem {
  id: string;
  names: Record<string, string>;
  version: string;
  status: string;
  lastModified: string;
  path: string;
}

export function formatStatus(statusData: any): string {
  if (!statusData) return 'Unknown Status';
  const rawStatus = typeof statusData === 'string'
    ? statusData
    : (statusData['@id'] || (typeof statusData === 'object' ? String(statusData) : String(statusData)));

  if (typeof rawStatus !== 'string') return 'Unknown Status';

  const trimmed = rawStatus.replace(/\/+$/, '');
  const lastSlash = trimmed.lastIndexOf('/');
  if (lastSlash !== -1) {
    return trimmed.substring(lastSlash + 1);
  }
  return trimmed;
}

export function getAllLabels(labelNode: any): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!labelNode) return labels;

  if (Array.isArray(labelNode)) {
    labelNode.forEach((l: any) => {
      if (l && typeof l === 'object' && l['@language'] && l['@value'] !== undefined) {
        labels[l['@language']] = String(l['@value']);
      }
    });
  } else if (typeof labelNode === 'object' && labelNode['@language'] && labelNode['@value'] !== undefined) {
    labels[labelNode['@language']] = String(labelNode['@value']);
  } else if (typeof labelNode === 'string') {
    labels['unknown'] = labelNode;
  }
  return labels;
}

export function getClassTargetId(cls: any): string {
  const targetClass = cls['sh:targetClass'];
  if (targetClass) {
    if (Array.isArray(targetClass)) {
      const tcId = targetClass[0]?.['@id'] || (typeof targetClass[0] === 'string' ? targetClass[0] : null);
      if (tcId) return tcId;
    } else if (typeof targetClass === 'object' && targetClass['@id']) {
      return targetClass['@id'];
    } else if (typeof targetClass === 'string') {
      return targetClass;
    }
  }
  return cls['@id'];
}

export function transformJsonLdToModel(
  jsonContent: any,
  requestedModel: string,
  requestedVersion: string,
  fetchTimestamp: string
) {
  const graph = jsonContent['@graph'] || [];

  // Map all nodes by their @id for easy property lookups
  const nodes = new Map<string, any>();
  graph.forEach((node: any) => {
    if (node && node['@id']) {
      nodes.set(node['@id'], node);
    }
  });

  // Filter nodes that define a class (sh:NodeShape)
  const classNodes = graph.filter(
    (n: any) =>
      n['@type'] === 'sh:NodeShape' || (Array.isArray(n['@type']) && n['@type'].includes('sh:NodeShape'))
  );

  // Pre-build lookup maps to resolve Shape / TargetClass URIs to refined Class IDs and labels
  const shapeOrClassToRefinedId = new Map<string, string>();
  const targetClassToLabels = new Map<string, Record<string, string>>();

  classNodes.forEach((cls: any) => {
    const refinedId = getClassTargetId(cls);
    const labels = getAllLabels(cls['rdfs:label']);

    if (cls['@id']) {
      shapeOrClassToRefinedId.set(cls['@id'], refinedId);
      targetClassToLabels.set(cls['@id'], labels);
    }

    const targetClass = cls['sh:targetClass'];
    if (targetClass) {
      const tcId = Array.isArray(targetClass)
        ? (targetClass[0]?.['@id'] || (typeof targetClass[0] === 'string' ? targetClass[0] : null))
        : (typeof targetClass === 'object' ? targetClass['@id'] : (typeof targetClass === 'string' ? targetClass : null));
      if (tcId) {
        shapeOrClassToRefinedId.set(tcId, refinedId);
        targetClassToLabels.set(tcId, labels);
      }
    }

    targetClassToLabels.set(refinedId, labels);
  });

  // Find Ontology metadata
  let modelName: Record<string, string> = { unknown: requestedModel };
  let modelId = requestedModel;
  let modelVersion = requestedVersion;
  let modelModified = 'Unknown Date';
  let modelStatus = 'Unknown Status';
  let modelDocumentation: Record<string, string> = { unknown: 'n/a' };
  let modelDescription: Record<string, string> = { unknown: 'n/a' };

  const ontologyNode = graph.find(
    (n: any) =>
      n['@type'] === 'owl:Ontology' || (Array.isArray(n['@type']) && n['@type'].includes('owl:Ontology'))
  );

  if (ontologyNode) {
    modelId = ontologyNode['@id'] || modelId;
    modelName = getAllLabels(ontologyNode['rdfs:label']);
    modelVersion = ontologyNode['owl:versionInfo'] || modelVersion;
    modelDocumentation = getAllLabels(ontologyNode['suomi-meta:documentation']);
    modelDescription = getAllLabels(ontologyNode['rdfs:comment']);

    const modifiedData = ontologyNode['dcterms:modified'];
    if (modifiedData) {
      modelModified = typeof modifiedData === 'string' ? modifiedData : modifiedData['@value'] || modelModified;
    }

    const statusData = ontologyNode['suomi-meta:publicationStatus'];
    if (statusData) {
      modelStatus = formatStatus(statusData);
    }
  }

  const rawModelUri = modelId;
  const verWithV = modelVersion.startsWith('v') ? modelVersion : `v${modelVersion}`;
  const uniqueId = `${rawModelUri}#${verWithV}`;

  const outputJson = {
    metadata: {
      id: uniqueId,
      modelUri: rawModelUri,
      name: modelName,
      version: modelVersion,
      status: modelStatus,
      description: modelDescription,
      documentation: modelDocumentation,
      documentationUrl: `https://tietomallit.suomi.fi/model/${requestedModel}?ver=${modelVersion}`,
      lastModified: modelModified,
      originSyncTime: fetchTimestamp
    },
    classes: [] as any[]
  };

  classNodes.forEach((cls: any) => {
    const classCodelists = new Set<string>();
    const attributes: any[] = [];
    const associations: any[] = [];
    let superclass: string | null = null;
    let hasSuperclass = false;

    let properties = cls['sh:property'];
    if (properties) {
      if (!Array.isArray(properties)) properties = [properties];

      properties.forEach((propRef: any) => {
        const propNode = nodes.get(propRef['@id']);
        if (propNode) {
          const propLabels = getAllLabels(propNode['rdfs:label']);

          // Extract cardinality
          const min = propNode['sh:minCount']?.['@value'] ?? propNode['sh:minCount'] ?? '0';
          const max = propNode['sh:maxCount']?.['@value'] ?? propNode['sh:maxCount'] ?? '*';
          const cardinality = `[${min}..${max}]`;

          // Differentiate between object properties (associations) and literal datatypes
          const isObjectProperty =
            (Array.isArray(propNode['@type'])
              ? propNode['@type'].includes('owl:ObjectProperty')
              : propNode['@type'] === 'owl:ObjectProperty') || !!propNode['sh:class'];

          // Extract associated Codelist URIs
          const attrCodelists: string[] = [];
          if (propNode['suomi-meta:codeList']) {
            const cl = propNode['suomi-meta:codeList'];
            const clArray = Array.isArray(cl) ? cl : [cl];
            clArray.forEach((c: any) => {
              if (c['@id']) {
                attrCodelists.push(c['@id']);
                classCodelists.add(c['@id']);
              }
            });
          }

          if (isObjectProperty) {
            const rawTargetClassId =
              propNode['sh:class']?.['@id'] ||
              (typeof propNode['sh:class'] === 'string' ? propNode['sh:class'] : null) ||
              (Array.isArray(propNode['sh:class'])
                ? propNode['sh:class'][0]?.['@id'] || (typeof propNode['sh:class'][0] === 'string' ? propNode['sh:class'][0] : null)
                : null);

            const targetClassId = rawTargetClassId
              ? (shapeOrClassToRefinedId.get(rawTargetClassId) || rawTargetClassId)
              : null;

            if (propLabels?.fi === 'Yläluokka') {
              hasSuperclass = true;
              superclass = targetClassId || null;
            } else {
              let targetClassName: Record<string, string> = { unknown: 'Unknown' };

              if (targetClassId) {
                if (targetClassToLabels.has(targetClassId)) {
                  targetClassName = targetClassToLabels.get(targetClassId)!;
                } else if (rawTargetClassId && targetClassToLabels.has(rawTargetClassId)) {
                  targetClassName = targetClassToLabels.get(rawTargetClassId)!;
                } else {
                  targetClassName = { unknown: targetClassId.split('/').pop() || 'Unknown' };
                }
              }

              associations.push({
                id: propNode['@id'],
                name: propLabels,
                targetClassId: targetClassId || null,
                targetClassName,
                cardinality
              });
            }
          } else {
            let datatype = propNode['sh:datatype'] || 'string';
            if (typeof datatype === 'string') {
              datatype = datatype.split('#').pop()?.split('/').pop() || 'string';
            }

            const attributeObj: any = {
              id: propNode['@id'],
              name: propLabels,
              type: datatype,
              cardinality
            };

            // Add codelist property for Literal types (always as an array)
            if (datatype === 'Literal' && attrCodelists.length > 0) {
              attributeObj.codelist = attrCodelists;
            }

            attributes.push(attributeObj);
          }
        }
      });
    }

    const sortedCodelists = Array.from(classCodelists).sort();

    // Sort attributes and associations alphabetically by ID
    attributes.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    associations.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    const classId = getClassTargetId(cls);
    const lastPart = classId ? classId.replace(/\/+$/, '').split('/').pop() || '' : '';
    const technicalName = lastPart.split(':').pop() || '';

    const classObj: any = {
      id: classId,
      technicalName,
      uri: cls['@id'],
      name: getAllLabels(cls['rdfs:label']),
      description: getAllLabels(cls['rdfs:comment'])
    };

    if (hasSuperclass) {
      classObj.superclass = superclass;
    }

    classObj.attributes = attributes;
    classObj.associations = associations;
    classObj.codelists = sortedCodelists;

    outputJson.classes.push(classObj);
  });

  // Alphabetically sort the top-level classes by ID
  outputJson.classes.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  return outputJson;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAndTransformTietomallit(
  configPath?: string,
  outputBaseDir?: string,
  delayMs: number = 500
): Promise<{ totalProcessed: number; changedCount: number }> {
  const resolvedConfigPath =
    configPath ||
    path.join(process.cwd(), 'data-index', 'suomi.fi', 'tietomallit', 'index.json');
  const resolvedOutputDir =
    outputBaseDir ||
    path.join(process.cwd(), 'public', 'data', 'suomi.fi', 'tietomallit');

  if (!fs.existsSync(resolvedConfigPath)) {
    console.warn(`Configuration file not found at ${resolvedConfigPath}`);
    return { totalProcessed: 0, changedCount: 0 };
  }

  const rawConfig = fs.readFileSync(resolvedConfigPath, 'utf-8');
  const config: DataModelConfig = JSON.parse(rawConfig);

  const baseUrl = config.remote?.api || 'https://tietomallit.suomi.fi/api/getModelAsFile';

  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  let requestCount = 0;
  let totalProcessed = 0;
  let changedCount = 0;
  const indexItems: TietomalliIndexItem[] = [];

  for (const model of config.models) {
    for (const version of model.versions) {
      if (requestCount > 0 && delayMs > 0) {
        await sleep(delayMs);
      }
      requestCount++;
      totalProcessed++;

      try {
        const fetchTimestamp = new Date().toISOString();
        const jsonldUrl = `${baseUrl}?modelId=${model.name}&fileType=JSON-LD&version=${version}`;

        console.log(`Fetching data model: ${model.name} (v${version}) from ${jsonldUrl}...`);
        const jsonResponse = await fetch(jsonldUrl);
        if (!jsonResponse.ok) {
          throw new Error(`HTTP ${jsonResponse.status}: ${jsonResponse.statusText}`);
        }

        const jsonContent = await jsonResponse.json();
        const modelOutput = transformJsonLdToModel(jsonContent, model.name, version, fetchTimestamp);

        const outputFilename = `${model.name}-${version}.json`;
        const outputPath = path.join(resolvedOutputDir, outputFilename);

        indexItems.push({
          id: modelOutput.metadata.id,
          names: modelOutput.metadata.name,
          version: modelOutput.metadata.version,
          status: modelOutput.metadata.status,
          lastModified: modelOutput.metadata.lastModified,
          path: outputFilename
        });

        let contentChanged = true;
        if (fs.existsSync(outputPath)) {
          try {
            const existingContent = fs.readFileSync(outputPath, 'utf-8');
            const existingJson = JSON.parse(existingContent);
            contentChanged = !isContentEqual(existingJson, modelOutput);
          } catch {
            contentChanged = true;
          }
        }

        if (contentChanged) {
          changedCount++;
          console.log(`Saved transformed model (CONTENT CHANGED) to ${outputPath}`);
        } else {
          console.log(`Saved transformed model (content unchanged) to ${outputPath}`);
        }

        fs.writeFileSync(outputPath, JSON.stringify(modelOutput, null, 2), 'utf-8');
      } catch (err) {
        console.error(`Failed to process data model ${model.name} version ${version}:`, err);
      }
    }
  }

  const indexFilePath = path.join(resolvedOutputDir, 'index.json');
  let indexChanged = true;
  if (fs.existsSync(indexFilePath)) {
    try {
      const existingIndexContent = fs.readFileSync(indexFilePath, 'utf-8');
      const existingIndexJson = JSON.parse(existingIndexContent);
      indexChanged = !isContentEqual(existingIndexJson, indexItems);
    } catch {
      indexChanged = true;
    }
  }

  if (indexChanged) {
    console.log(`Saved tietomallit index (CONTENT CHANGED) to ${indexFilePath}`);
  } else {
    console.log(`Saved tietomallit index (content unchanged) to ${indexFilePath}`);
  }

  fs.writeFileSync(indexFilePath, JSON.stringify(indexItems, null, 2), 'utf-8');

  return { totalProcessed, changedCount };
}

if (process.env.NODE_ENV !== 'test') {
  if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    fetchAndTransformTietomallit();
  }
}
