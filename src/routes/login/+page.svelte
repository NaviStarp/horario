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
			errorMessage = 'ERR_EMPTY_FIELDS: Todos los campos son obligatorios';
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
					? 'ERR_AUTH_REJECTED: Correo o clave incorrectos. Verifica tu usuario en el panel Supabase.'
					: `ERR_AUTH: ${error.message}`;
				return;
			}

			if (data?.session) {
				window.location.href = '/';
			}
		} catch (err: any) {
			errorMessage = err?.message || 'ERR_NETWORK: Fallo de enlace con el servidor';
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
		<!-- Consola de Autenticación Técnica -->
		<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-7 sm:p-9 shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-all">
			<!-- Header -->
			<div class="text-center mb-8">
				<div class="inline-flex p-3 rounded-[8px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] mb-3 shadow-[0_0_15px_rgba(16,185,129,0.18)]">
					<Lock class="w-6 h-6 stroke-[2.2]" />
				</div>
				<h1 class="font-mono text-xl font-bold tracking-wider text-[#f3f4f6]">
					// ACCESS_CONTROL
				</h1>
				<p class="font-mono text-[11px] text-[#64748b] mt-1">
					SINGLE_OPERATOR_GATEWAY // RLS_LEVEL_STRICT
				</p>
			</div>

			<!-- Mensaje de Error Técnico -->
			{#if errorMessage}
				<div class="mb-5 p-3 rounded-[6px] bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-start gap-2.5 font-mono text-[11px] text-[#ef4444]">
					<AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Formulario -->
			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4 font-mono text-xs">
				<div>
					<label for="email" class="block text-[#9ca3af] mb-1.5 font-mono text-[11px]">
						OPERATOR_IDENTIFIER (EMAIL)
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
							placeholder="operador@privado.com"
							class="w-full pl-9 pr-3.5 py-2.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none transition-all font-mono"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-[#9ca3af] mb-1.5 font-mono text-[11px]">
						PASSPHRASE_KEY
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
							class="w-full pl-9 pr-3.5 py-2.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none transition-all font-mono"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="w-full mt-3 py-2.5 px-4 rounded-[6px] font-mono font-bold text-xs text-[#010302] bg-[#10b981] hover:bg-[#34d399] active:bg-[#059669] disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if isLoading}
						<span class="w-3.5 h-3.5 border-2 border-[#010302]/30 border-t-[#010302] rounded-full animate-spin"></span>
						<span>VALIDATING_KEYS...</span>
					{:else}
						<span>[ AUTHENTICATE_SESSION ]</span>
						<ArrowRight class="w-3.5 h-3.5" />
					{/if}
				</button>
			</form>

			<div class="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)] text-center font-mono text-[10px] text-[#64748b]">
				<p class="flex items-center justify-center gap-1.5">
					<ShieldCheck class="w-3 h-3 text-[#10b981]" />
					ISOLATED_RLS_POLICIES // NO_PUBLIC_REGISTRATION
				</p>
			</div>
		</div>

		<!-- Panel Informativo de Configuración de Producción -->
		{#if !configured}
			<div class="mt-4 p-4 rounded-[8px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] font-mono text-[11px] text-[#9ca3af] space-y-2">
				<div class="flex items-center gap-2 text-[#10b981] font-semibold">
					<Terminal class="w-4 h-4" />
					<span>// CONFIG_PENDING: SUPABASE_SETUP</span>
				</div>
				<p class="text-[#64748b] leading-relaxed">
					Ejecuta <code class="text-[#10b981]">supabase_schema.sql</code> en el panel SQL de Supabase y añade tus claves en <code class="text-[#10b981]">.env</code>.
				</p>
				<button
					type="button"
					onclick={handleDemoAccess}
					class="w-full py-1.5 bg-[#0e1813] hover:bg-[#111c16] text-[#10b981] border border-[rgba(16,185,129,0.32)] rounded-[5px] transition-colors cursor-pointer"
				>
					&gt; ENTRAR EN MODO PRUEBA LOCAL (DEMO_STORAGE)
				</button>
			</div>
		{/if}
	</div>
</div>
