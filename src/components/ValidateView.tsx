/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  FileJson, 
  RefreshCw, 
  Copy, 
  Check, 
  HelpCircle,
  ExternalLink,
  Eye,
  EyeOff,
  ArrowLeft,
  Trash
} from 'lucide-react';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

// Built-in example of a ValidatePlan document based on Ryhti schema
const EXAMPLE_PLAN = {
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
};

const PLAN_TYPES = [
  { code: '11', label: 'Kokonaismaakuntakaava' },
  { code: '12', label: 'Vaihemaakuntakaava' },
  { code: '21', label: 'Yleiskaava' },
  { code: '22', label: 'Vaiheyleiskaava' },
  { code: '23', label: 'Osayleiskaava' },
  { code: '24', label: 'Kuntien yhteinen yleiskaava' },
  { code: '25', label: 'Maanalainen yleiskaava' },
  { code: '31', label: 'Asemakaava' },
  { code: '32', label: 'Vaiheasemakaava' },
  { code: '33', label: 'Ranta-asemakaava' },
  { code: '34', label: 'Vaiheranta-asemkaava' },
  { code: '35', label: 'Maanalaisten tilojen asemakaava' }
];

// JSON Path Line Parser Helper
interface PathNode {
  key: string;
  type: 'object' | 'array';
  index: number;
}

export function parseJsonToLines(jsonStr: string): { text: string; path: string; lineNum: number }[] {
  const lines = jsonStr.split('\n');
  const stack: PathNode[] = [];
  const result: { text: string; path: string; lineNum: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    if (!trimmed) {
      result.push({ text: line, path: '', lineNum });
      continue;
    }

    // Determine current indentation level (2 spaces per level)
    const indent = line.search(/\S/);
    const level = Math.max(0, Math.floor(indent / 2));

    // Pop the stack to match the current level
    while (stack.length > level) {
      stack.pop();
    }

    const keyMatch = trimmed.match(/"([^"]+)"\s*:/);
    const key = keyMatch ? keyMatch[1] : '';

    const startsObject = trimmed.endsWith('{') || trimmed.endsWith('{,') || trimmed.includes('{') || trimmed.includes(':{');
    const startsArray = trimmed.endsWith('[') || trimmed.endsWith('[,') || trimmed.includes('[') || trimmed.includes(':[');

    // If the parent in stack is an array, handle index increments
    const parentNode = stack[stack.length - 1];
    if (parentNode && parentNode.type === 'array') {
      const isNewItem = trimmed.startsWith('{') || trimmed.startsWith('[') || (!trimmed.startsWith('}') && !trimmed.startsWith(']'));
      if (isNewItem) {
        if (stack.length === level) {
          parentNode.index++;
        }
      }
    }

    // Determine path for this line
    let pathParts: string[] = [];
    for (let j = 0; j < stack.length; j++) {
      const node = stack[j];
      let part = '';
      if (node.key) {
        part = node.key;
      }
      if (node.index >= 0) {
        part += `[${node.index}]`;
      }
      if (part) {
        pathParts.push(part);
      }
    }

    let currentLinePath = pathParts.join('.');
    if (key && !startsObject && !startsArray) {
      if (currentLinePath) {
        currentLinePath += '.' + key;
      } else {
        currentLinePath = key;
      }
    }

    result.push({
      text: line,
      path: currentLinePath,
      lineNum
    });

    // Push new node if starting a structure
    if (startsObject || startsArray) {
      stack.push({
        key,
        type: startsArray ? 'array' : 'object',
        index: -1
      });
    }
  }

  return result;
}

// Normalize path strings to match regardless of leading "plan." prefix
export function normalizePath(p: string): string {
  if (!p) return '';
  let cleaned = p.trim();
  if (cleaned.startsWith('plan.')) {
    cleaned = cleaned.slice(5);
  } else if (cleaned === 'plan') {
    cleaned = '';
  }
  return cleaned;
}

// Get the parent path by stripping the last property or array index
export function getParentPath(path: string): string {
  if (!path) return '';
  
  if (path.endsWith(']')) {
    const lastOpenBracket = path.lastIndexOf('[');
    if (lastOpenBracket !== -1) {
      return path.slice(0, lastOpenBracket);
    }
  }
  
  const lastDot = path.lastIndexOf('.');
  if (lastDot !== -1) {
    return path.slice(0, lastDot);
  }
  
  return '';
}

interface ValidateViewProps {
  onBack: () => void;
}

export function ValidateView({ onBack }: ValidateViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  const strings = t.validation;

  // State variables
  const [env, setEnv] = useState<'test' | 'prod'>('test');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(`syke_api_key_${env}`) || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [planType, setPlanType] = useState('31');
  const [areaId, setAreaId] = useState('601');
  const [jsonInput, setJsonInput] = useState(() => JSON.stringify(EXAMPLE_PLAN, null, 2));
  
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null);
  const [showRawResponse, setShowRawResponse] = useState<boolean>(false);

  // Refs for scroll synchronization
  const lineCounterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Auto-save API Key securely to localStorage for convenience
  useEffect(() => {
    localStorage.setItem(`syke_api_key_${env}`, apiKey);
  }, [apiKey]);

  useEffect(() => {
    setApiKey(localStorage.getItem(`syke_api_key_${env}`));
  }, [env]);

  const clearApiKey = () => {
    localStorage.removeItem(`syke_api_key_${env}`);
    setApiKey('');
  }

  const handleFormatJson = () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      setJsonError(e.message || strings.invalidJson);
    }
  };

  const handleLoadExample = () => {
    setJsonError(null);
    setJsonInput(JSON.stringify(EXAMPLE_PLAN, null, 2));
    setResponseStatus(null);
    setRawResponse(null);
    setErrorMsg(null);
    setSelectedLineNum(null);
  };

  const handleCopyResponse = () => {
    if (!rawResponse) return;
    navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = async () => {
    setResponseStatus(null);
    setRawResponse(null);
    setErrorMsg(null);
    setJsonError(null);
    setSelectedLineNum(null);

    // Validate inputs
    let jsonDoc: any;
    try {
      jsonDoc = JSON.parse(jsonInput);
      const formatted = JSON.stringify(jsonDoc, null, 2);
      setJsonInput(formatted);
      setSelectedLineNum(null);
    } catch (e: any) {
      setJsonError(e.message || strings.invalidJson);
      return;
    }

    if (!apiKey.trim() || !areaId.trim()) {
      setErrorMsg(strings.missingParams);
      return;
    }

    setIsValidating(true);

    const baseUrl = env === 'test' 
      ? 'https://api-test.ymparisto.fi/ryhti/plan-public/api/Plan/Validate'
      : 'https://api.ymparisto.fi/ryhti/plan-public/api/Plan/Validate';

    // Query parameters
    const url = `${baseUrl}?planType=${planType}&administrativeAreaIdentifiers=${encodeURIComponent(areaId.trim())}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': CONFIG.remoteFetchOptions.headers['User-Agent'],
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey.trim()
        },
        body: JSON.stringify(jsonDoc)
      });

      setResponseStatus(response.status);

      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      setRawResponse(data || { success: true, status: response.status });

      if (response.status === 200) {
        // Success case
        setErrorMsg(null);
      } else if (response.status === 400 || response.status === 422) {
        // Validation failed or bad structure
        setErrorMsg(null);
      } else {
        // General server error
        setErrorMsg(`API returned status ${response.status}: ${data?.title || data?.message || 'Error occurred'}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`${strings.networkError} (${err.message})`);
    } finally {
      setIsValidating(false);
    }
  };

  // Helper to safely format error list
  const getValidationErrors = (): { ruleId?: string; field: string; message: string; severity: 'Error' | 'Warning' }[] => {
    if (!rawResponse) return [];

    const details: { ruleId?: string; field: string; message: string; severity: 'Error' | 'Warning' }[] = [];

    // 1. If errors is an array (the Syke Ryhti format)
    if (Array.isArray(rawResponse.errors)) {
      rawResponse.errors.forEach((err: any) => {
        const localizedMsg = err.localizedMessage?.fi || err.localizedMessage?.en || err.message;
        details.push({
          ruleId: err.ruleId,
          field: err.instance || strings.generalFallback,
          message: localizedMsg || strings.unknownError,
          severity: 'Error'
        });
      });
    } 
    // 2. If errors is a dictionary (the standard ASP.NET model validation format)
    else if (rawResponse.errors && typeof rawResponse.errors === 'object') {
      Object.entries(rawResponse.errors).forEach(([field, messages]) => {
        const msgs = Array.isArray(messages) ? messages : [String(messages)];
        msgs.forEach((m) => {
          details.push({
            field,
            message: m,
            severity: 'Error'
          });
        });
      });
    }

    // 3. If there are warnings as an array (Syke Ryhti format)
    if (Array.isArray(rawResponse.warnings)) {
      rawResponse.warnings.forEach((warn: any) => {
        const localizedMsg = warn.localizedMessage?.fi || warn.localizedMessage?.en || warn.message;
        details.push({
          ruleId: warn.ruleId,
          field: warn.instance || strings.generalFallback,
          message: localizedMsg || strings.unknownWarning,
          severity: 'Warning'
        });
      });
    }

    // 4. Fallback if no errors/warnings parsed but there is a detail string
    if (details.length === 0 && rawResponse.detail) {
      details.push({
        field: strings.generalFallback,
        message: rawResponse.detail,
        severity: 'Error'
      });
    }

    return details;
  };

  const validationErrors = getValidationErrors();

  // Generate parsed JSON line structures for interactive preview
  const docLines = parseJsonToLines(jsonInput);

  // Parse counts of objects/groups for high fidelity audit reports
  let planObjectsCount = 0;
  let planRegulationGroupsCount = 0;
  try {
    const parsed = JSON.parse(jsonInput);
    if (parsed) {
      if (Array.isArray(parsed.planObjects)) {
        planObjectsCount = parsed.planObjects.length;
      }
      if (Array.isArray(parsed.planRegulationGroups)) {
        planRegulationGroupsCount = parsed.planRegulationGroups.length;
      }
    }
  } catch {}

  // Enrich validation errors with resolved line numbers in the actual document (including parent-fallback for missing properties)
  const enrichedErrors = validationErrors.map(err => {
    let currentPath = normalizePath(err.field);
    let resolvedLineNum = 1; // Default fallback to line 1 (root object)
    let isFallback = false;

    // Check if the exact path exists in the document
    const exactMatch = docLines.find(line => normalizePath(line.path) === currentPath);
    if (exactMatch) {
      resolvedLineNum = exactMatch.lineNum;
    } else {
      isFallback = true;
      // Trace parent paths recursively until we find one that exists in the document
      let parentPath = getParentPath(currentPath);
      let found = false;
      while (parentPath !== '') {
        const parentMatch = docLines.find(line => normalizePath(line.path) === parentPath);
        if (parentMatch) {
          resolvedLineNum = parentMatch.lineNum;
          currentPath = parentPath;
          found = true;
          break;
        }
        parentPath = getParentPath(parentPath);
      }
      if (!found) {
        // Fall back to root object (line 1)
        resolvedLineNum = 1;
        currentPath = '';
      }
    }

    return {
      ...err,
      resolvedLineNum,
      resolvedField: currentPath,
      isFallback
    };
  });

  // Handles selecting/focusing an issue line in the editor
  const handleHighlightError = (lineNum: number) => {
    setSelectedLineNum(lineNum);

    // Scroll the textarea to the line center
    if (textareaRef.current) {
      const targetScrollTop = Math.max(0, (lineNum - 6) * 24);
      textareaRef.current.scrollTop = targetScrollTop;
    }
  };

  const handleTextareaClickOrChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const caretPos = textarea.selectionStart;
    const textUpToCaret = textarea.value.substring(0, caretPos);
    const lineNum = textUpToCaret.split('\n').length;
    setSelectedLineNum(lineNum);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    if (lineCounterRef.current) {
      lineCounterRef.current.scrollTop = textarea.scrollTop;
    }
    if (highlightsRef.current) {
      highlightsRef.current.scrollTop = textarea.scrollTop;
      highlightsRef.current.scrollLeft = textarea.scrollLeft;
    }
  };

  // Get active selected line's path and errors
  const selectedLineObj = docLines.find(line => line.lineNum === selectedLineNum);
  const clickedLinePath = selectedLineObj?.path || '';
  const clickedLineErrors = selectedLineNum
    ? enrichedErrors.filter(err => err.resolvedLineNum === selectedLineNum)
    : [];

  return (
    <div className="py-8 md:py-16 max-w-7xl mx-auto px-6 validate-view">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-8 mb-10">
        <div>
          <button
            onClick={onBack}  
            data-testid="back-to-home-btn"
            className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px] mb-6"
            aria-label={t.post.returnToList}
          >
           <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t.common.backToHome}
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">
            {strings.subtitle}
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">{strings.title}</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-2">
            {strings.apiInfoDesc}
          </p>
        </div>
      </div>

      {/* Credentials & Settings Panel */}
      <div className="bg-brand-muted/70 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col gap-5 mb-8 animate-fade-in">
        <h2 className="text-xs font-black uppercase tracking-widest text-brand-accent flex items-center gap-1.5 border-b border-white/5 pb-2">
          <span>Yhteysasetukset & Kaavan tiedot</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 content-end">
          {/* Environment */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {strings.environment}
            </label>
            <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEnv('test')}
                className={`py-1.5 px-2 rounded-lg transition-all ${env === 'test' ? 'bg-brand-accent text-black font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {strings.environmentTest}
              </button>
              <button
                type="button"
                onClick={() => setEnv('prod')}
                className={`py-1.5 px-2 rounded-lg transition-all ${env === 'prod' ? 'bg-brand-accent text-black font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {strings.environmentProduction}
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{strings.apiKey} ({env === 'prod' ? strings.environmentProduction : strings.environmentTest})</span>
              <span className="text-[10px] text-brand-accent font-semibold lowercase">
                * {strings.savedToBrowserMemory}
              </span>
            </label>
            <div className="relative flex items-center text-xs">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={strings.apiKeyPlaceholder}
                className="w-full bg-black/50 text-slate-100 placeholder-slate-500 rounded-xl border border-white/10 p-2.5 pr-10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 p-1.5 text-slate-400 hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={() => clearApiKey()}
                className="absolute right-8 p-1.5 text-slate-400 hover:text-white transition-colors"
              >
                {<Trash size={14} />}
              </button>
            </div>
          </div>

          {/* Administrative Area Identifier */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {strings.areaIdentifier}
            </label>
            <input
              type="text"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              placeholder={strings.areaPlaceholder}
              className="w-full bg-black/50 text-slate-100 placeholder-slate-500 rounded-xl border border-white/10 p-2.5 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-xs font-mono transition-all"
            />
          </div>

          {/* Plan Type */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {strings.planType}
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className="w-full bg-black/50 text-slate-100 rounded-xl border border-white/10 p-2.5 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-xs transition-all"
            >
              {PLAN_TYPES.map((type) => (
                <option key={type.code} value={type.code} className="bg-[#1A1A1C]">
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          
        </div>
      </div>

      {/* Direct Side-by-Side Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
        
        {/* Left Column: JSON Code Editor (Editable, Always Visible) */}
        <div className="lg:col-span-7 flex flex-col gap-4 code-editor">
          <div className="bg-brand-muted/40 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <FileJson size={16} className="text-brand-accent" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  {strings.editorLabel}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="text-[11px] font-semibold text-brand-accent hover:text-white transition-colors bg-brand-accent/5 border border-brand-accent/20 hover:border-brand-accent/40 px-2.5 py-1 rounded-lg"
                >
                  {strings.buttonExample}
                </button>
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="text-[11px] font-semibold text-slate-300 hover:text-white transition-colors bg-white/5 border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg"
                >
                  {strings.buttonFormat}
                </button>
              </div>
            </div>

            {/* Code editor container with synchronized line numbers gutter & highlights */}
            <div className="relative">
              <div className="relative flex bg-slate-950 rounded-xl border border-white/10 h-[500px] overflow-hidden group focus-within:border-brand-accent/40 transition-colors">
                
                {/* Line Numbers Gutter */}
                <div
                  ref={lineCounterRef}
                  className="w-12 shrink-0 bg-[#0c0c0e] border-r border-white/5 py-4 overflow-hidden select-none font-mono text-[10px] text-right text-slate-500 pr-3 leading-6"
                >
                  {docLines.map((line) => {
                    const lineErrors = enrichedErrors.filter(err => err.resolvedLineNum === line.lineNum);
                    const severity = lineErrors.length > 0 ? (lineErrors.some(m => m.severity === 'Error') ? 'Error' : 'Warning') : null;
                    const isSelected = selectedLineNum === line.lineNum;

                    let numClass = 'text-slate-600 hover:text-slate-300';
                    if (isSelected) {
                      numClass = 'text-brand-accent font-black';
                    } else if (severity === 'Error') {
                      numClass = 'text-red-400 font-bold';
                    } else if (severity === 'Warning') {
                      numClass = 'text-amber-400 font-bold';
                    }

                    return (
                      <button
                        key={line.lineNum}
                        type="button"
                        onClick={() => {
                          setSelectedLineNum(line.lineNum);
                          if (textareaRef.current) {
                            const targetScrollTop = Math.max(0, (line.lineNum - 6) * 24);
                            textareaRef.current.scrollTop = targetScrollTop;
                          }
                        }}
                        className={`w-full block h-6 text-right focus:outline-none transition-colors ${numClass}`}
                      >
                        {line.lineNum}
                      </button>
                    );
                  })}
                </div>

                {/* Main Textarea and Highlights Overlay */}
                <div className="relative flex-1 h-full overflow-hidden">
                  
                  {/* Background Highlight Rows */}
                  <div
                    ref={highlightsRef}
                    className="absolute inset-0 pointer-events-none overflow-hidden select-none py-4 leading-6"
                  >
                    {docLines.map((line) => {
                      const lineErrors = enrichedErrors.filter(err => err.resolvedLineNum === line.lineNum);
                      const severity = lineErrors.length > 0 ? (lineErrors.some(m => m.severity === 'Error') ? 'Error' : 'Warning') : null;
                      const isSelected = selectedLineNum === line.lineNum;

                      let bgClass = '';
                      let borderClass = 'border-l-2 border-transparent';
                      if (isSelected && severity !== 'Error' && severity !== 'Warning') {
                        bgClass = 'bg-green-500/15';
                        borderClass = 'border-l-2 border-green-300';
                      } else if (severity === 'Error') {
                        bgClass = 'bg-red-500/10';
                        borderClass = 'border-l-2 border-red-500';
                      } else if (severity === 'Warning') {
                        bgClass = 'bg-amber-500/10';
                        borderClass = 'border-l-2 border-amber-500';
                      }

                      return (
                        <div
                          key={line.lineNum}
                          className={`h-6 w-full transition-colors duration-150 ${bgClass} ${borderClass}`}
                        />
                      );
                    })}
                  </div>

                  {/* Editable raw Textarea on top */}
                  <textarea
                    ref={textareaRef}
                    value={jsonInput}
                    onChange={(e) => {
                      setJsonInput(e.target.value);
                      handleTextareaClickOrChange(e);
                      // Clear validation state on any edit
                      setResponseStatus(null);
                      setRawResponse(null);
                      setErrorMsg(null);
                      setJsonError(null);
                      setSelectedLineNum(null);
                    }}
                    onClick={handleTextareaClickOrChange}
                    onKeyUp={handleTextareaClickOrChange}
                    onScroll={handleScroll}
                    spellCheck={false}
                    wrap="off"
                    className="code-container absolute inset-0 bg-transparent text-slate-100 font-mono text-xs pt-4 px-4 leading-6 focus:outline-none resize-none overflow-auto selection:bg-brand-accent/25 focus:ring-0 focus:border-transparent border-transparent"
                    placeholder="{}"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tarkastusraportti (Error/Warning Details Panel) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Run Validation Trigger Button */}
          <button
            type="button"
            disabled={isValidating}
            onClick={handleValidate}
            className="w-full bg-brand-accent text-black font-extrabold text-sm py-4 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none cursor-pointer shadow-lg"
          >
            {isValidating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {strings.loading}
              </>
            ) : (
              <>
                <Play size={16} fill="black" />
                {strings.buttonValidate}
              </>
            )}
          </button>

          <div className="bg-brand-muted/70 backdrop-blur-md rounded-2xl border border-white/10 p-6 min-h-[500px] flex flex-col justify-between gap-6">
            
            {/* Initial empty state */}
            {responseStatus === null && !errorMsg && !isValidating && !jsonError && (
              <div className="my-auto text-center py-12 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <HelpCircle size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-300">{strings.noResult}</h3>
                  <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                    {strings.noResultDesc}
                  </p>
                </div>
              </div>
            )}

            {/* Loading Spinner */}
            {isValidating && (
              <div className="my-auto text-center py-12 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-accent/5 border border-brand-accent/20 flex items-center justify-center text-brand-accent animate-spin">
                  <RefreshCw size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-300">{strings.loading}</h3>
                  <p className="text-slate-500 text-xs mt-1">
                    {strings.analyzingResponse}
                  </p>
                </div>
              </div>
            )}

            {/* JSON parsing and formatting errors alert */}
            {jsonError && (
              <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 flex gap-3 text-red-200 text-xs leading-relaxed animate-fade-in">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-red-400">
                    {strings.invalidJson}
                  </span>
                  <span className="font-mono">{jsonError}</span>
                </div>
              </div>
            )}

            {/* Network / Server Error Message */}
            {errorMsg && (
              <div className="bg-red-950/25 border border-red-500/25 rounded-2xl p-5 flex gap-3 text-red-200 text-sm my-auto animate-fade-in">
                <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-400 mb-1">
                    {strings.connectionOrServerError}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-300">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Real-time validation results and line specific error report */}
            {responseStatus !== null && !isValidating && (
              <div className="flex flex-col gap-5 flex-1">
                
                {/* Compact Status Indicator combined with Localized Result Message */}
                {responseStatus === 200 && validationErrors.length === 0 ? (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex gap-4 text-emerald-200">
                      <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-emerald-400 font-extrabold text-sm">{strings.successTitle}</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {strings.successDesc}
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 flex flex-col gap-4 mt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-emerald-500/15 pb-2">
                        <span>{strings.auditSummary}</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">{strings.status}</span>
                          <span className="text-emerald-400 font-extrabold">{responseStatus} OK ({strings.valid})</span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">{strings.timestamp}</span>
                          <span className="text-slate-200 font-semibold font-mono">
                            {new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">{strings.endpointAndInterface}</span>
                          <span className="text-slate-200 font-semibold truncate block">
                            {env === 'test' ? strings.ryhtiTest : strings.ryhtiProd}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 leading-relaxed border-t border-white/5 pt-3 mt-1">
                        <p className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1.5">
                          <CheckCircle2 size={12} />
                          {strings.rulesPassed}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                          <li>{strings.schemaValid}</li>
                          <li>
                            {strings.observedPrefix}<span className="font-bold text-emerald-400">{planObjectsCount}</span>{strings.observedObjects}<span className="font-bold text-emerald-400">{planRegulationGroupsCount}</span>{strings.observedGroups}
                          </li>
                          <li>{strings.requirementsMet}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-950/15 border border-amber-500/25 rounded-2xl p-4 flex gap-3 text-amber-200 animate-fade-in">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-amber-400 font-extrabold text-sm">{strings.errorTitle}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {strings.errorDesc}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Report Panel Details */}
                {validationErrors.length > 0 && (
                  <div className="flex-1 flex flex-col gap-4 border-t border-white/5 pt-4">
                    
                    {selectedLineNum && clickedLineErrors.length > 0 ? (
                      <div className="flex flex-col gap-3 animate-fade-in">
                        <div className="flex justify-between items-center bg-black/30 border border-white/5 p-3 rounded-xl">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {strings.selectedEditorPoint}
                            </span>
                            <span className="text-xs text-brand-accent font-mono font-bold mt-0.5 break-all">
                              {strings.line} {selectedLineNum} {clickedLinePath && `(${clickedLinePath})`}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            clickedLineErrors.some(e => e.severity === 'Error') 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {clickedLineErrors.length} {clickedLineErrors.length === 1 ? strings.issue : strings.issues}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                          {clickedLineErrors.map((err, idx) => (
                            <div
                              key={idx}
                              className={`border rounded-xl p-3 text-xs flex flex-col gap-2 ${
                                err.severity === 'Warning' 
                                  ? 'bg-amber-950/10 border-amber-500/20 text-amber-200/90' 
                                  : 'bg-red-950/10 border-red-500/20 text-red-200/90'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  err.severity === 'Warning' 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                  {err.severity === 'Warning' ? strings.warning : strings.error}
                                </span>
                                {err.ruleId && (
                                  <span className="font-mono text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 truncate">
                                    {err.ruleId}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-200 leading-relaxed font-medium">
                                {err.message}
                              </p>
                              {err.ruleId === 'quality__req_json_deserialization_failure' ? (
                                <div className="text-[10px] font-medium text-slate-400 bg-black/40 border border-white/5 rounded px-2.5 py-1.5 flex flex-col gap-1 mt-1 animate-fade-in">
                                  <span className="uppercase text-brand-accent tracking-wider text-[8px] font-black">
                                    {err.field === 'planDto' ? 'Juuriobjektin muodostusvirhe' : 'Objektin muodostusvirhe'}
                                  </span>
                                  <p className="text-slate-300 mt-1 leading-normal">
                                    {err.field === 'planDto' 
                                      ? strings.rootDeserializationFailure 
                                      : strings.deserializationFailure.replace('{{dto}}', err.field)}
                                  </p>
                                </div>
                              ) : (err.isFallback || err.ruleId === 'quality__req_json_unknown_property') && (
                                <div className="text-[10px] font-medium text-slate-400 bg-black/40 border border-white/5 rounded px-2.5 py-1.5 flex flex-col gap-1 mt-1 animate-fade-in">
                                  <span className="uppercase text-brand-accent tracking-wider text-[8px] font-black">
                                    {strings.targetProperty}
                                  </span>
                                  <span className="font-mono break-all text-slate-300">{err.field}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        <button className="text-[11px] font-semibold text-brand-accent hover:text-white transition-colors bg-brand-accent/5 border border-brand-accent/20 hover:border-brand-accent/40 px-2.5 py-1 rounded-lg mt-6"
                            onClick={() => setSelectedLineNum(null)}
                        >
                            {strings.showAllIssues}
                        </button>
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto py-8 text-center flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-400">
                          <Info size={18} className="text-brand-accent/80" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-300">
                            {selectedLineNum 
                              ? strings.noIssuesOnLine.replace('{{line}}', String(selectedLineNum)) 
                              : strings.clickLineToSeeDetails}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                            {selectedLineNum 
                              ? strings.selectAnotherLineDesc 
                              : strings.clickHighlightedLineDesc}
                          </p>
                        </div>

                        {/* List of shortcut buttons for lines with errors */}
                        {docLines.some(line => enrichedErrors.some(err => err.resolvedLineNum === line.lineNum)) && (
                          <div className="mt-4 flex flex-col gap-2 w-full max-w-sm text-left">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                              {strings.linesWithIssues}
                            </span>
                            <div className="flex flex-wrap gap-1.5 justify-start max-h-[160px] overflow-y-auto p-1 border border-white/5 rounded-xl bg-black/20">
                              {docLines
                                .filter(line => enrichedErrors.some(err => err.resolvedLineNum === line.lineNum))
                                .map((line) => {
                                  const lineErrors = enrichedErrors.filter(err => err.resolvedLineNum === line.lineNum);
                                  const isError = lineErrors.some(e => e.severity === 'Error');
                                  return (
                                    <button
                                      key={line.lineNum}
                                      type="button"
                                      onClick={() => handleHighlightError(line.lineNum)}
                                      className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                        isError 
                                          ? 'bg-red-500/10 border-red-500/20 hover:border-red-500/40 text-red-300'
                                          : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 text-amber-300'
                                      }`}
                                    >
                                      <span>{strings.line} {line.lineNum}</span>
                                      <span className="text-[9px] opacity-70">({lineErrors.length})</span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Raw Response Collapsible Section */}
      {rawResponse && (
        <div className="mt-8 bg-brand-muted/40 border border-white/10 rounded-2xl p-6 animate-fade-in">
          <button
            type="button"
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="flex items-center justify-between w-full text-left font-bold text-sm text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileJson size={16} className="text-brand-accent" />
              <span>{strings.showRawResponseJson}</span>
            </span>
            <span className="text-xs text-brand-accent font-semibold">
              {showRawResponse ? strings.hide : strings.show}
            </span>
          </button>
          
          {showRawResponse && (
            <div className="mt-4 flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between bg-black/40 rounded-xl px-4 py-2 text-xs border border-white/5">
                <span className="text-slate-400">
                  {strings.httpStatus} <span className="font-mono font-bold text-slate-200">{responseStatus}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyResponse}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? strings.copiedBtn : strings.copyBtn}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-4 rounded-xl leading-relaxed overflow-auto border border-white/5 max-h-[350px]">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
