export interface DataModelAccess {
  getDataModel(modelId: string): Promise<any | null>;
  getCodelist(codelistUriOrId: string): Promise<any | null>;
}

export interface DataModelSnippetConfig {
  modelId: string;
  classes: string[];
  lang?: string;
}
