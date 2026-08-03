import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

export function parseModelId(modelId: string): { name: string; version?: string } {
  let cleaned = modelId.trim();
  let version: string | undefined;

  const hashIndex = cleaned.indexOf('#');
  if (hashIndex !== -1) {
    const frag = cleaned.substring(hashIndex + 1);
    version = frag.replace(/^v/, '');
    cleaned = cleaned.substring(0, hashIndex);
  }

  cleaned = cleaned.replace(/\/+$/, '');
  const parts = cleaned.split('/');
  const lastPart = parts[parts.length - 1] || cleaned;

  if (!version) {
    if (/^v?\d+\.\d+\.\d+$/.test(lastPart)) {
      version = lastPart.replace(/^v/, '');
      parts.pop();
    }
  }

  const effectiveLast = parts[parts.length - 1] || lastPart;
  const dashMatch = effectiveLast.match(/^(.*?)-v?(\d+\.\d+\.\d+)$/);
  let name = effectiveLast;

  if (dashMatch) {
    name = dashMatch[1];
    if (!version) version = dashMatch[2];
  }

  return { name, version };
}

export function getStatusLabel(statusCode: string) {
  const t = getTranslations(CONFIG.language as Language);
  if (t) {
    switch (statusCode) {
      case 'VALID': return t.dataModel.statusValid;
      case 'SUPERSEDED': return t.dataModel.statusSuperceded;
      case 'RETIRED': return t.dataModel.statusRetired;
    }
  }
}
