<script lang="ts">
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import { Lock, Mail, Key, AlertCircle, ArrowRight, ShieldCheck, Terminal } from 'lucide-svelte';

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	const configured = isSupabaseConfigured();

	async function handleLogin() {
		if (!email.trim() || !password) {
			errorMessage = 'Por favor completa todos los campos.';
			return;
		}

		isLoading = true;
		errorMessage = null;

		try {
			if (!configured) {
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
					? 'Correo o contraseña incorrectos. Verifica que el usuario haya sido creado en el panel de Supabase.'
					: error.message;
				return;
			}

			if (data?.session) {
				window.location.href = '/';
			}
		} catch (err: any) {
			errorMessage = err?.message || 'Error al conectar con el servidor de autenticación.';
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
		<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-7 sm:p-9 shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-all">
			<!-- Encabezado -->
			<div class="text-center mb-8">
				<div class="inline-flex p-3 rounded-[8px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] mb-3 shadow-[0_0_15px_rgba(16,185,129,0.18)]">
					<Lock class="w-6 h-6 stroke-[2.2]" />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-[#f3f4f6]">
					Acceso Privado
				</h1>
				<p class="text-xs text-[#64748b] mt-1">
					Inicia sesión para acceder a tu panel personal
				</p>
			</div>

			<!-- Mensaje de Error -->
			{#if errorMessage}
				<div class="mb-5 p-3 rounded-[6px] bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-start gap-2.5 text-xs text-[#ef4444]">
					<AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Formulario -->
			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4 text-xs">
				<div>
					<label for="email" class="block text-[#9ca3af] mb-1.5 font-medium">
						Correo Electrónico
					</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748b]">
							<Mail class="w-4 h-4" />
						</div>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
							placeholder="tu@correo.com"
							class="w-full pl-9 pr-3.5 py-2.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-[#9ca3af] mb-1.5 font-medium">
						Contraseña
					</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748b]">
							<Key class="w-4 h-4" />
						</div>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							autocomplete="current-password"
							placeholder="••••••••••••"
							class="w-full pl-9 pr-3.5 py-2.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none transition-all"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full mt-3 py-2.5 px-4 rounded-[6px] font-semibold text-xs text-[#010302] bg-[#10b981] hover:bg-[#34d399] active:bg-[#059669] disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if isLoading}
						<span class="w-3.5 h-3.5 border-2 border-[#010302]/30 border-t-[#010302] rounded-full animate-spin"></span>
						<span>Iniciando sesión...</span>
					{:else}
						<span>Iniciar Sesión</span>
						<ArrowRight class="w-3.5 h-3.5" />
					{/if}
				</button>
			</form>

			<div class="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)] text-center text-[11px] text-[#64748b]">
				<p class="flex items-center justify-center gap-1.5">
					<ShieldCheck class="w-3.5 h-3.5 text-[#10b981]" />
					Acceso privado protegido. Registro público deshabilitado.
				</p>
			</div>
		</div>

		<!-- Opción de Modo de Prueba si aún no ha creado el usuario en Supabase -->
		<div class="mt-4 text-center">
			<button
				type="button"
				onclick={handleDemoAccess}
				class="text-xs text-[#64748b] hover:text-[#10b981] transition-colors cursor-pointer underline"
			>
				¿Aún no has creado tu usuario en Supabase? Probar en modo local
			</button>
		</div>
	</div>
</div>
