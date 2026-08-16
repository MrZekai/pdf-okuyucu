import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PdfToolId } from '@/lib/pdfTools';

const TOOL_USAGE_KEY = '@pdf-reader/tool-usage-v1';
const allTools: PdfToolId[] = ['merge', 'extract', 'remove', 'reorder', 'rotate', 'clean'];

type ToolUsage = Partial<Record<PdfToolId, number>>;

async function loadUsage(): Promise<ToolUsage> {
  try {
    const raw = await AsyncStorage.getItem(TOOL_USAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return Object.fromEntries(allTools.filter((id) => Number.isFinite(parsed[id])).map((id) => [id, Number(parsed[id])])) as ToolUsage;
  } catch {
    return {};
  }
}

export async function recordToolUse(id: PdfToolId) {
  const usage = await loadUsage();
  usage[id] = (usage[id] || 0) + 1;
  await AsyncStorage.setItem(TOOL_USAGE_KEY, JSON.stringify(usage));
}

export async function clearToolUsage() {
  await AsyncStorage.removeItem(TOOL_USAGE_KEY);
}

/** Two most-used tools plus one deterministic daily discovery card. */
export async function getSuggestedTools(): Promise<PdfToolId[]> {
  const usage = await loadUsage();
  const ranked = [...allTools].sort((a, b) => (usage[b] || 0) - (usage[a] || 0));
  const used = ranked.filter((id) => (usage[id] || 0) > 0).slice(0, 2);
  const pool = allTools.filter((id) => !used.includes(id));
  const day = Math.floor(Date.now() / 86_400_000);
  const discovery = pool[day % pool.length];
  return [...used, ...ranked.filter((id) => !used.includes(id) && id !== discovery).slice(0, 2 - used.length), discovery].slice(0, 3);
}
