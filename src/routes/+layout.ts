import type { LayoutLoad } from './$types';
import { isSupabaseConfigured } from '#lib/supabaseClient';

export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';

export const load: LayoutLoad = async () => {
	return {
		isConfigured: isSupabaseConfigured(),
		user: null,
		session: null
	};
};
