import { ApiProviderId, KeyConfig } from '../types/secrets';

const STORAGE_KEY = 'nexus_api_keys_pool';
const FREE_ONLY_KEY = 'nexus_prefer_only_custom_keys';

export interface ModelPreset {
  id: string;
  label: string;
  badge: string;
}

export interface ProviderPresetInfo {
  id: ApiProviderId;
  label: string;
  freeTierNote: string;
  keyPlaceholder: string;
  defaultBaseUrl?: string;
  models: ModelPreset[];
}

export const PROVIDER_CATALOG: ProviderPresetInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini (Free Tier · AI Studio)',
    freeTierNote: 'Free API key at aistudio.google.com (AIza... or AQ....) — supports tool calling & coding',
    keyPlaceholder: 'AIzaSy... or AQ.Ab8...',
    models: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', badge: 'Free · Ultra Fast' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', badge: 'Free · Coding' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', badge: 'Free · 1500 RPD' },
      { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', badge: 'Pro · Architecture' },
      { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen', badge: 'Deep Reasoning' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (Free :free Models)',
    freeTierNote: 'Multiple free coding models at openrouter.ai/keys ($0/token)',
    keyPlaceholder: 'sk-or-v1-...',
    models: [
      { id: 'openrouter/free', label: 'OpenRouter Free Auto-Router', badge: 'Free · Auto' },
      { id: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder 480B (:free)', badge: 'Free · Coding' },
      { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (:free)', badge: 'Free · Reasoning' },
      { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek Chat V3 (:free)', badge: 'Free · General' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (:free)', badge: 'Free · 70B' },
      { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (:free)', badge: 'Free · Google' },
      { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1 24B (:free)', badge: 'Free · Fast' },
    ],
  },
  {
    id: 'groq',
    label: 'Groq Cloud (Free Tier · Ultra-Fast LPU)',
    freeTierNote: 'Free high-speed API key at console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', badge: 'Free · Coding' },
      { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B', badge: 'Free · Reasoning' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', badge: 'Free · Instant' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', badge: 'Free · 120B' },
    ],
  },
  {
    id: 'cerebras',
    label: 'Cerebras Inference (Free Tier)',
    freeTierNote: 'Free ultra-low-latency API key at cloud.cerebras.ai',
    keyPlaceholder: 'csk-...',
    models: [
      { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', badge: 'Free · Fast' },
      { id: 'qwen-3-32b', label: 'Qwen 3 32B', badge: 'Free · Coding' },
      { id: 'llama3.1-8b', label: 'Llama 3.1 8B', badge: 'Free · Instant' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI (Free Experiment Tier)',
    freeTierNote: 'Free API key & Codestral at console.mistral.ai',
    keyPlaceholder: 'mistral key...',
    models: [
      { id: 'codestral-latest', label: 'Codestral Latest', badge: 'Free · Coding' },
      { id: 'mistral-small-latest', label: 'Mistral Small Latest', badge: 'Free · Fast' },
      { id: 'devstral-small-latest', label: 'Devstral Small', badge: 'Free · Agents' },
    ],
  },
  {
    id: 'grok',
    label: 'xAI Grok',
    freeTierNote: 'xAI console API key',
    keyPlaceholder: 'xai-...',
    models: [
      { id: 'grok-2-latest', label: 'Grok 2 Latest', badge: 'Default' },
      { id: 'grok-3-mini', label: 'Grok 3 Mini', badge: 'Fast' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Free OpenAI-Compatible API',
    freeTierNote: 'GitHub Models, NVIDIA NIM, Together, Ollama, or any /v1/chat/completions endpoint',
    keyPlaceholder: 'Bearer / API Key...',
    defaultBaseUrl: 'https://models.inference.ai.azure.com',
    models: [
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini (GitHub Models Free)', badge: 'Custom' },
      { id: 'deepseek-r1', label: 'deepseek-r1', badge: 'Custom' },
      { id: 'qwen2.5-coder-32b-instruct', label: 'qwen2.5-coder-32b-instruct', badge: 'Custom' },
    ],
  },
];

export function getProviderPreset(provider: ApiProviderId): ProviderPresetInfo {
  return PROVIDER_CATALOG.find(p => p.id === provider) || PROVIDER_CATALOG[0];
}

export function getLocalKeys(): KeyConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse local API keys:', err);
    return [];
  }
}

export function saveLocalKeys(keys: KeyConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    fetch('/api/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save local API keys:', err);
  }
}

export function addLocalKey(keyData: Partial<KeyConfig>): KeyConfig {
  const current = getLocalKeys();
  const provider = keyData.provider || 'gemini';
  const preset = getProviderPreset(provider);
  const newKey: KeyConfig = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    provider,
    name: keyData.name || `${provider.toUpperCase()} Free Key`,
    apiKey: (keyData.apiKey || '').trim(),
    model: (keyData.model || preset.models[0]?.id || 'gemini-3.8-flash').trim(),
    baseUrl: keyData.baseUrl?.trim() || preset.defaultBaseUrl,
    isActive: keyData.isActive !== false,
    rpmLimit: keyData.rpmLimit || 15,
    status: 'healthy',
  };
  current.push(newKey);
  saveLocalKeys(current);
  return newKey;
}

export function addLocalKeysBatch(
  items: Array<Partial<KeyConfig>>,
  labelPrefix?: string
): { added: KeyConfig[]; skippedDuplicates: number } {
  const current = getLocalKeys();
  const seen = new Set(current.map((k) => `${k.provider}::${(k.apiKey || '').trim()}`));
  const providerCounts = new Map<ApiProviderId, number>();
  for (const k of current) {
    providerCounts.set(k.provider, (providerCounts.get(k.provider) || 0) + 1);
  }

  const added: KeyConfig[] = [];
  let skippedDuplicates = 0;

  items.forEach((item, idx) => {
    const cleanApiKey = (item.apiKey || '').trim().replace(/^["']|["']$/g, '');
    if (!cleanApiKey) return;
    const provider = item.provider || 'gemini';
    const dedupKey = `${provider}::${cleanApiKey}`;
    if (seen.has(dedupKey)) {
      skippedDuplicates++;
      return;
    }
    seen.add(dedupKey);
    const nextNum = (providerCounts.get(provider) || 0) + 1;
    providerCounts.set(provider, nextNum);

    const preset = getProviderPreset(provider);
    const model = (item.model || preset.models[0]?.id || 'gemini-3.8-flash').trim();
    const baseName = labelPrefix?.trim()
      ? `${labelPrefix.trim()} #${nextNum}`
      : item.name?.trim() || `${provider.toUpperCase()} #${nextNum}`;

    const newKey: KeyConfig = {
      id: `key_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      provider,
      name: baseName,
      apiKey: cleanApiKey,
      model,
      baseUrl: item.baseUrl?.trim() || preset.defaultBaseUrl,
      isActive: item.isActive !== false,
      rpmLimit: item.rpmLimit || (provider === 'gemini' || provider === 'groq' ? 15 : 20),
      status: 'healthy',
    };
    current.push(newKey);
    added.push(newKey);
  });

  if (added.length > 0) {
    saveLocalKeys(current);
  }
  return { added, skippedDuplicates };
}

export function updateLocalKey(id: string, patch: Partial<KeyConfig>): void {
  const current = getLocalKeys();
  const updated = current.map(k => k.id === id ? { ...k, ...patch } : k);
  saveLocalKeys(updated);
}

export function removeLocalKey(id: string): void {
  const current = getLocalKeys();
  const filtered = current.filter(k => k.id !== id);
  saveLocalKeys(filtered);
}

export function toggleKeyActive(id: string): void {
  const current = getLocalKeys();
  const updated = current.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k);
  saveLocalKeys(updated);
}

export function getPreferOnlyCustomKeys(): boolean {
  try {
    return localStorage.getItem(FREE_ONLY_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPreferOnlyCustomKeys(value: boolean): void {
  try {
    localStorage.setItem(FREE_ONLY_KEY, value ? 'true' : 'false');
  } catch {}
}

const STICKY_KEY_STORAGE = 'nexus_last_successful_key_id';

export function getLastSuccessfulKeyId(): string | null {
  try {
    return localStorage.getItem(STICKY_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setLastSuccessfulKeyId(keyId: string | null): void {
  try {
    if (keyId) {
      localStorage.setItem(STICKY_KEY_STORAGE, keyId);
    } else {
      localStorage.removeItem(STICKY_KEY_STORAGE);
    }
  } catch {}
}
