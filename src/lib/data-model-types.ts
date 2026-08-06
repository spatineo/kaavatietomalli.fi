export interface LocalizedText {
  fi?: string;
  sv?: string;
  en?: string;
  [lang: string]: string | undefined;
}

export interface Attribute {
  id: string;
  name: LocalizedText;
  type?: string;
  datatype?: string;
  cardinality?: string;
  description?: LocalizedText;
  codelist?: string[];
}

export interface Association {
  id: string;
  name: LocalizedText;
  targetClassId: string | null;
  targetClassName?: LocalizedText;
  cardinality?: string;
  description?: LocalizedText;
}

export interface ClassModel {
  id: string;
  technicalName: string;
  name?: LocalizedText;
  description?: LocalizedText;
  conceptId?: string;
  superclass?: string;
  attributes?: Attribute[];
  associations?: Association[];
  codelists?: string[];
}

export interface ModelMetadata {
  name?: LocalizedText;
  status?: string;
  documentationUrl?: string;
  modelUri?: string;
  lastModified?: string;
  originSyncTime?: string;
  description?: LocalizedText;
  documentation?: LocalizedText;
}

export interface DataModel {
  id: string;
  version: string;
  versionCreated?: string;
  classes: ClassModel[];
  metadata?: ModelMetadata;
}

export interface CodeItem {
  uri: string;
  codeValue: string;
  name: LocalizedText;
  definition?: LocalizedText;
  description?: LocalizedText;
  status?: string;
  hierarchyLevel?: number;
  broaderCode?: string;
  created?: string;
  modified?: string;
  statusModified?: string;
  order?: number;
}

export interface Codelist {
  id: string;
  uri: string;
  vocabulary: string;
  technicalName: string;
  name?: LocalizedText;
  status: string;
  definition?: LocalizedText;
  description?: LocalizedText;
  codes: CodeItem[];
  created?: string;
  modified?: string;
  statusModified?: string;
  originSyncTime: string;
  allVersions: any;
  documentationUrl?: string;
}

export interface DataModelAccess {
  getDataModel(modelId: string): Promise<DataModel | null>;
  getCodelist(codelistUriOrId: string): Promise<Codelist | null>;
}

export interface DataModelSnippetConfig {
  modelId: string;
  classes: string[];
  title?: string;
  lang?: string;
}

export interface CodelistIndexItem {
  uri: string;
  path: string;
}

export interface ModelIndexItem {
  version: string;
  versionCreated?: string;
  path: string;
  status?: string;
}


