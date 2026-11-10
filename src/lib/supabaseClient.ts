import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseEnv() {
	const url =
		(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
		(typeof process !== 'undefined' ? process.env?.PUBLIC_SUPABASE_URL : '') ||
		'';
	const anonKey =
		(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) ||
		(typeof process !== 'undefined' ? process.env?.PUBLIC_SUPABASE_ANON_KEY : '') ||
		'';

	return {
		url: String(url).trim(),
		anonKey: String(anonKey).trim()
	};
}

export function isSupabaseConfigured(): boolean {
	const { url, anonKey } = getSupabaseEnv();
	return Boolean(
		url &&
		anonKey &&
		url.startsWith('https://') &&
		!url.includes('tu-proyecto') &&
		anonKey !== 'tu-anon-public-key'
	);
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
	if (!browserClient) {
		const { url, anonKey } = getSupabaseEnv();
		const effectiveUrl = isSupabaseConfigured() ? url : 'https://placeholder.supabase.co';
		const effectiveKey = isSupabaseConfigured() ? anonKey : 'placeholder-anon-key';

		browserClient = createBrowserClient(effectiveUrl, effectiveKey);
	}
	return browserClient;
}

export const supabase = getSupabaseBrowserClient();
