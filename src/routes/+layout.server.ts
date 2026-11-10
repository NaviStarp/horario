import type { LayoutServerLoad } from './$types';
import { isSupabaseConfigured } from '#lib/supabaseClient';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
		user: locals.user,
		isConfigured: isSupabaseConfigured()
	};
};
