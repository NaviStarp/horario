/// <reference types="@sveltejs/kit" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

const CACHE_NAME = `cache-horario-${version}`;
const ASSETS_TO_CACHE = [...assets, ...immutable];

self.addEventListener('install', (event: any) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS_TO_CACHE))
			.then(() => (self as any).skipWaiting())
	);
});

self.addEventListener('activate', (event: any) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
			await (self as any).clients.claim();
		})
	);
});

self.addEventListener('fetch', (event: any) => {
	const url = new URL(event.request.url);

	// No interceptar peticiones que no sean GET o que vayan a otros dominios (ej. Supabase)
	if (event.request.method !== 'GET' || url.origin !== location.origin) {
		return;
	}

	// Archivos inmutables o estáticos: Cache-First
	if (ASSETS_TO_CACHE.includes(url.pathname)) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				return cached || fetch(event.request);
			})
		);
		return;
	}

	// Navegación de páginas: Network-First con fallback a caché
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseClone);
					});
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(event.request);
					return cached || (await caches.match('/'));
				})
		);
	}
});
