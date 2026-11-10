<script lang="ts">
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { Lock, Mail, Key, AlertCircle, ArrowRight, ShieldCheck, Terminal } from 'lucide-svelte';

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	const configured = isSupabaseConfigured();

	async function handleLogin() {
		if (!email.trim() || !password) {
			errorMessage = 'Por favor completa todos los campos';
			return;
		}

		isLoading = true;
		errorMessage = null;

		try {
			if (!configured) {
				// Si no está configurado Supabase, guardamos un token demo en cookie para probar la app
				document.cookie = 'demo_user=true; path=/; max-age=86400';
				window.location.href = '/';
				return;
			}

			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});

			if (error) {
				errorMessage = error.message === 'Invalid login credentials'
					? 'Correo o contraseña incorrectos. Verifica que el usuario haya sido creado en Supabase.'
					: error.message;
				return;
			}

			if (data?.session) {
				window.location.href = '/';
			}
		} catch (err: any) {
			errorMessage = err?.message || 'Error inesperado al conectar con el servidor';
		} finally {
			isLoading = false;
		}
	}

	function handleDemoAccess() {
		document.cookie = 'demo_user=true; path=/; max-age=86400';
		window.location.href = '/';
	}
</script>

<div class="min-h-[85vh] flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Tarjeta de Login -->
		<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 sm:p-10 transition-all">
			<!-- Icono e Introducción -->
			<div class="text-center mb-8">
				<div class="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
					<Lock class="w-7 h-7" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
					Acceso Privado
				</h1>
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
					Sistema de rutina personal, notas y diario con cifrado RLS
				</p>
			</div>

			<!-- Mensaje de Error -->
			{#if errorMessage}
				<div class="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
					<AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Formulario de acceso -->
			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
				<div>
					<label for="email" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
						Correo Electrónico
					</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
							<Mail class="w-4 h-4" />
						</div>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
							placeholder="tu@correo.com"
							class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
						Contraseña
					</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
							<Key class="w-4 h-4" />
						</div>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							autocomplete="current-password"
							placeholder="••••••••••••"
							class="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if isLoading}
						<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
						<span>Iniciando sesión...</span>
					{:else}
						<span>Entrar a mi panel</span>
						<ArrowRight class="w-4 h-4" />
					{/if}
				</button>
			</form>

			<div class="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center">
				<p class="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1">
					<ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
					Acceso privado protegido. Registro público deshabilitado.
				</p>
			</div>
		</div>

		<!-- Guía de Configuración Supabase si aún no está configurado -->
		{#if !configured}
			<div class="mt-6 p-5 rounded-2xl bg-zinc-900/90 text-zinc-200 border border-zinc-800 shadow-lg text-xs space-y-3">
				<div class="flex items-center gap-2 text-amber-400 font-semibold">
					<Terminal class="w-4 h-4" />
					<span>Paso pendiente: Conectar con Supabase</span>
				</div>
				<p class="text-zinc-400 leading-relaxed">
					Para conectar tu base de datos de producción:
				</p>
				<ol class="list-decimal pl-4 space-y-1.5 text-zinc-300">
					<li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noreferrer" class="text-indigo-400 underline">supabase.com</a></li>
					<li>Ejecuta el archivo <code class="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono">supabase_schema.sql</code> en el Editor SQL de Supabase.</li>
					<li>Copia tus claves en el archivo <code class="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono">.env</code> de este proyecto.</li>
					<li>Crea tu usuario en Supabase (Auth &gt; Users &gt; Add user).</li>
				</ol>
				<div class="pt-2">
					<button
						type="button"
						onclick={handleDemoAccess}
						class="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
					>
						Entrar en Modo Prueba Local (Sin Supabase por ahora)
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
