<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import {
		Calendar,
		History,
		LogOut,
		Terminal,
		ShieldCheck,
		Cpu,
		User as UserIcon
	} from 'lucide-svelte';

	let { data, children }: LayoutProps = $props();

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
	<title>[SYS] Horario & Diario Técnico</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="min-h-screen flex flex-col bg-[#010302] text-[#f3f4f6] font-sans selection:bg-[#10b981]/20 selection:text-[#34d399]">
	<!-- Barra Superior Técnica (Obsidiana + Esmeralda) -->
	<header class="sticky top-0 z-40 w-full backdrop-blur-md bg-[#070d0a]/90 border-b border-[rgba(255,255,255,0.08)] px-4 sm:px-6 py-2.5 transition-colors">
		<div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
			<!-- Logo / Indicador de Sistema -->
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-2.5 group">
					<div class="w-7 h-7 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.18)] group-hover:border-[#10b981] transition-all">
						<Terminal class="w-3.5 h-3.5 stroke-[2.5]" />
					</div>
					<div class="flex flex-col">
						<div class="flex items-center gap-1.5">
							<span class="font-mono text-xs font-bold tracking-wider text-[#f3f4f6]">
								HORARIO<span class="text-[#10b981]">_SYS</span>
							</span>
							<span class="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981] animate-pulse"></span>
						</div>
						<span class="text-[9px] font-mono text-[#64748b] tracking-tight">
							v2.4 // OLED OBSIDIAN
						</span>
					</div>
				</a>

				<!-- Navegación Técnica -->
				{#if data.user || !data.isConfigured}
					<nav class="hidden sm:flex items-center gap-1 font-mono text-xs">
						<a
							href="/"
							class="px-3 py-1.5 rounded-[6px] border border-transparent text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e] hover:border-[rgba(255,255,255,0.08)] transition-all flex items-center gap-1.5"
						>
							<Calendar class="w-3 h-3 text-[#10b981]" />
							<span>// 01_DASHBOARD</span>
						</a>
						<a
							href="/historial"
							class="px-3 py-1.5 rounded-[6px] border border-transparent text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e] hover:border-[rgba(255,255,255,0.08)] transition-all flex items-center gap-1.5"
						>
							<History class="w-3 h-3 text-[#34d399]" />
							<span>// 02_HISTORIAL</span>
						</a>
					</nav>
				{/if}
			</div>

			<!-- Telemetría y Acciones -->
			<div class="flex items-center gap-3">
				<!-- Tag RLS Security Enforced -->
				<div class="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[10px] font-mono text-[#10b981]">
					<ShieldCheck class="w-3 h-3" />
					<span>RLS.ENFORCED</span>
				</div>

				{#if data.user}
					<div class="flex items-center gap-2 pl-3 border-l border-[rgba(255,255,255,0.08)]">
						<div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[11px] font-mono text-[#9ca3af]">
							<UserIcon class="w-3 h-3 text-[#10b981]" />
							<span class="max-w-[130px] truncate">{data.user.email}</span>
						</div>

						<button
							type="button"
							onclick={handleLogout}
							class="p-1.5 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#ef4444] hover:border-[#ef4444]/40 hover:bg-[#ef4444]/10 transition-all cursor-pointer"
							title="Cerrar sesión (DISCONNECT)"
							aria-label="Cerrar sesión"
						>
							<LogOut class="w-3.5 h-3.5" />
						</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Contenedor Principal con marco CAD sutil -->
	<main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
		{@render children()}
	</main>

	<!-- Pie de Página Técnico -->
	<footer class="py-4 border-t border-[rgba(255,255,255,0.08)] bg-[#000000] text-center font-mono text-[11px] text-[#64748b]">
		<div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<span class="w-1.5 h-1.5 rounded-full bg-[#10b981]/80"></span>
				<span>STATUS: OPERATIONAL</span>
				<span class="text-[rgba(255,255,255,0.08)]">|</span>
				<span>ENCRYPTION: POSTGRES_RLS</span>
			</div>
			<div class="text-[#9ca3af]">
				HORARIO_SYS // SWAYFX CORNERS [10px] // OLED 100% BLACK
			</div>
		</div>
	</footer>
</div>
