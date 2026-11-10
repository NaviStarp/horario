<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import { navigating } from '$app/state';
	import { onMount } from 'svelte';
	import {
		Calendar,
		History,
		LogOut,
		Clock,
		ShieldCheck,
		User as UserIcon,
		Download
	} from 'lucide-svelte';

	let { data, children }: LayoutProps = $props();

	let deferredInstallPrompt = $state<any>(null);

	onMount(() => {
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}

		const handlePrompt = (e: Event) => {
			e.preventDefault();
			deferredInstallPrompt = e;
		};

		window.addEventListener('beforeinstallprompt', handlePrompt);
		return () => {
			window.removeEventListener('beforeinstallprompt', handlePrompt);
		};
	});

	async function promptInstall() {
		if (!deferredInstallPrompt) return;
		deferredInstallPrompt.prompt();
		const { outcome } = await deferredInstallPrompt.userChoice;
		if (outcome === 'accepted') {
			deferredInstallPrompt = null;
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

<!-- Indicador de navegación superior -->
{#if navigating.to}
	<div class="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#10b981] via-[#34d399] to-[#10b981] z-50 animate-pulse shadow-[0_0_8px_#10b981]"></div>
{/if}

<div class="min-h-screen flex flex-col bg-[#010302] text-[#f3f4f6] font-sans selection:bg-[#10b981]/20 selection:text-[#34d399]">
	<!-- Barra superior -->
	<header class="sticky top-0 z-40 w-full backdrop-blur-md bg-[#070d0a]/90 border-b border-[rgba(255,255,255,0.08)] px-4 sm:px-6 py-3 transition-colors">
		<div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-2.5 group">
					<div class="w-8 h-8 rounded-[8px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.18)] group-hover:border-[#10b981] transition-all">
						<Clock class="w-4 h-4 stroke-[2.2]" />
					</div>
					<div class="flex flex-col">
						<div class="flex items-center gap-2">
							<span class="text-sm font-semibold tracking-tight text-[#f3f4f6]">
								Horario &amp; Diario
							</span>
							<span class="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
						</div>
						<span class="text-[11px] text-[#64748b]">
							Panel personal
						</span>
					</div>
				</a>

				{#if data.user || !data.isConfigured}
					<nav class="hidden sm:flex items-center gap-1 text-xs">
						<a
							href="/"
							class="px-3 py-1.5 rounded-[6px] border border-transparent text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e] hover:border-[rgba(255,255,255,0.08)] transition-all flex items-center gap-1.5 font-medium"
						>
							<Calendar class="w-3.5 h-3.5 text-[#10b981]" />
							<span>Dashboard</span>
						</a>
						<a
							href="/historial"
							class="px-3 py-1.5 rounded-[6px] border border-transparent text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e] hover:border-[rgba(255,255,255,0.08)] transition-all flex items-center gap-1.5 font-medium"
						>
							<History class="w-3.5 h-3.5 text-[#34d399]" />
							<span>Historial</span>
						</a>
					</nav>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				{#if deferredInstallPrompt}
					<button
						type="button"
						onclick={promptInstall}
						class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#10b981]/15 border border-[rgba(16,185,129,0.4)] text-[#10b981] hover:bg-[#10b981] hover:text-[#010302] text-xs font-semibold shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
						title="Instalar aplicación en tu pantalla de inicio"
					>
						<Download class="w-3.5 h-3.5" />
						<span>Instalar App</span>
					</button>
				{/if}

				<div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[11px] text-[#10b981] font-medium">
					<ShieldCheck class="w-3.5 h-3.5" />
					<span>Privacidad RLS</span>
				</div>

				{#if data.user}
					<div class="flex items-center gap-2 pl-3 border-l border-[rgba(255,255,255,0.08)]">
						<div class="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-xs text-[#9ca3af]">
							<UserIcon class="w-3.5 h-3.5 text-[#10b981]" />
							<span class="max-w-[150px] truncate">{data.user.email}</span>
						</div>

						<button
							type="button"
							onclick={handleLogout}
							class="p-2 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#ef4444] hover:border-[#ef4444]/40 hover:bg-[#ef4444]/10 transition-all cursor-pointer"
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

	<!-- Contenido -->
	<main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
		{@render children()}
	</main>

	<!-- Pie de página -->
	<footer class="py-4 border-t border-[rgba(255,255,255,0.08)] bg-[#000000] text-center text-xs text-[#64748b]">
		<div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
			<div class="flex items-center gap-2 justify-center sm:justify-start">
				<span class="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
				<span>Horario, Notas Rápidas &amp; Diario Personal</span>
			</div>
			<div class="text-[#9ca3af]">
				Base de datos PostgreSQL en Supabase con Row Level Security (RLS)
			</div>
		</div>
	</footer>
</div>
