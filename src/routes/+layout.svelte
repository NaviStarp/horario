<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import { onMount } from 'svelte';
	import {
		Calendar,
		History,
		LogOut,
		Moon,
		Sun,
		Clock,
		User as UserIcon,
		CheckCircle2
	} from 'lucide-svelte';

	let { data, children }: LayoutProps = $props();

	let isDarkMode = $state(false);

	onMount(() => {
		// Detectar preferencia de tema
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			isDarkMode = true;
			document.documentElement.classList.add('dark');
		} else {
			isDarkMode = false;
			document.documentElement.classList.remove('dark');
		}
	});

	function toggleTheme() {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	async function handleLogout() {
		try {
			if (isSupabaseConfigured()) {
				await supabase.auth.signOut();
			}
		} catch (e) {
			console.error(e);
		} finally {
			// Limpiar cookies de demo
			document.cookie = 'demo_user=; path=/; max-age=0';
			window.location.href = '/login';
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Horario & Diario Personal</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
	<!-- Barra Superior de Navegación -->
	<header class="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 py-3 transition-colors">
		<div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
			<!-- Logo / Título -->
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-2.5 font-bold text-base sm:text-lg tracking-tight group">
					<div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
						<Clock class="w-4 h-4" />
					</div>
					<span class="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-700 dark:from-zinc-100 dark:via-indigo-200 dark:to-zinc-300 bg-clip-text text-transparent">
						Horario & Diario
					</span>
				</a>

				<!-- Enlaces Principales -->
				{#if data.user || !data.isConfigured}
					<nav class="hidden sm:flex items-center gap-1 text-xs font-medium">
						<a
							href="/"
							class="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5"
						>
							<Calendar class="w-3.5 h-3.5" />
							Dashboard
						</a>
						<a
							href="/historial"
							class="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5"
						>
							<History class="w-3.5 h-3.5" />
							Historial
						</a>
					</nav>
				{/if}
			</div>

			<!-- Acciones Derecha: Tema, Usuario, Logout -->
			<div class="flex items-center gap-2">
				<!-- Toggle Modo Oscuro -->
				<button
					type="button"
					onclick={toggleTheme}
					class="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
					title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
					aria-label="Cambiar tema"
				>
					{#if isDarkMode}
						<Sun class="w-4 h-4 text-amber-400" />
					{:else}
						<Moon class="w-4 h-4 text-zinc-600" />
					{/if}
				</button>

				{#if data.user}
					<!-- Usuario y Logout -->
					<div class="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
						<div class="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300">
							<UserIcon class="w-3 h-3 text-indigo-500" />
							<span class="max-w-[140px] truncate">{data.user.email}</span>
						</div>

						<button
							type="button"
							onclick={handleLogout}
							class="p-2 rounded-xl text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
							title="Cerrar sesión"
							aria-label="Cerrar sesión"
						>
							<LogOut class="w-4 h-4" />
						</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Contenido de la Página -->
	<main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
		{@render children()}
	</main>

	<!-- Pie de página minimalista -->
	<footer class="py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-center text-xs text-zinc-400 dark:text-zinc-500">
		<p>Horario, Notas Rápidas & Diario Personal • Privacidad total con RLS</p>
	</footer>
</div>
