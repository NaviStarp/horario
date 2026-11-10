import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

class AuthState {
	user = $state<User | null>(null);
	session = $state<Session | null>(null);
	loading = $state(true);
	isDemo = $state(false);

	constructor() {
		if (typeof window !== 'undefined') {
			this.isDemo =
				localStorage.getItem('demo_user') === 'true' ||
				document.cookie.includes('demo_user=true');

			if (isSupabaseConfigured()) {
				supabase.auth
					.getSession()
					.then(({ data: { session } }) => {
						this.session = session;
						this.user = session?.user ?? null;
						this.loading = false;
					})
					.catch((err) => {
						console.error('Error al obtener sesión:', err);
						this.loading = false;
					});

				supabase.auth.onAuthStateChange((_event, session) => {
					this.session = session;
					this.user = session?.user ?? null;
					this.loading = false;
				});
			} else {
				this.loading = false;
			}
		} else {
			this.loading = false;
		}
	}
}

export const auth = new AuthState();
