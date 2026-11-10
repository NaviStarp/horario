import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// En Vite y SvelteKit, import.meta.env.PUBLIC_* se reemplaza estáticamente si no se usa optional chaining
const clientUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const clientAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export function getSupabaseEnv() {
	return {
		url: String(clientUrl).trim(),
		anonKey: String(clientAnonKey).trim()
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
