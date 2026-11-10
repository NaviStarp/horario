import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { building } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';
import { getSupabaseEnv, isSupabaseConfigured } from '#lib/supabaseClient';

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	const pathname = event.url.pathname;
	if (
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/icons/') ||
		pathname === '/manifest.webmanifest' ||
		pathname === '/service-worker.js' ||
		pathname === '/favicon.svg' ||
		pathname === '/robots.txt'
	) {
		return resolve(event);
	}

	if (!isSupabaseConfigured()) {
		event.locals.supabase = null;
		event.locals.session = null;
		event.locals.user = null;
		event.locals.safeGetSession = async () => ({ session: null, user: null });
		return resolve(event);
	}

	const { url, anonKey } = getSupabaseEnv();
	const allCookies = event.cookies.getAll();
	const hasAuthCookie = allCookies.some(
		(c) => c.name.startsWith('sb-') || c.name.includes('-auth-token')
	);

	event.locals.supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		if (!event.locals.supabase || !hasAuthCookie) {
			return { session: null, user: null };
		}
		const {
			data: { user },
			error: userError
		} = await event.locals.supabase.auth.getUser();

		if (userError || !user) {
			return { session: null, user: null };
		}

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const isLoginPage = event.url.pathname === '/login';
	const isAuthCallback = event.url.pathname.startsWith('/auth');
	const isDemoUser = event.cookies.get('demo_user') === 'true';

	// Redirección si no hay sesión
	if (!user && !isDemoUser && !isLoginPage && !isAuthCallback) {
		redirect(303, '/login');
	}

	// Redirección si ya está autenticado
	if (user && isLoginPage) {
		redirect(303, '/');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name: string) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
