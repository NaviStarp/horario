import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

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

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
	if (!client) {
		const { url, anonKey } = getSupabaseEnv();
		const effectiveUrl = isSupabaseConfigured() ? url : 'https://placeholder.supabase.co';
		const effectiveKey = isSupabaseConfigured() ? anonKey : 'placeholder-anon-key';

		client = createClient(effectiveUrl, effectiveKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
				storage: typeof window !== 'undefined' ? window.localStorage : undefined
			}
		});
	}
	return client;
}

export const supabase = getSupabaseClient();
