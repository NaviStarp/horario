import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const supabaseUrl = env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
	const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';

	return {
		server: {
			host: '0.0.0.0',
			port: 5173
		},
		preview: {
			host: '0.0.0.0',
			port: 5173
		},
		define: {
			'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
			'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
			'process.env.PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
			'process.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
		},
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter({
					pages: 'build',
					assets: 'build',
					fallback: '404.html',
					precompress: false,
					strict: true
				}),
				paths: {
					base: (mode === 'production' ? (process.env.BASE_PATH ?? '/horario') : '') as '' | `/${string}`
				}
			})
		]
	};
});
