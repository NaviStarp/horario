<script lang="ts">
	import type { CalendarEvent, CalendarEventType } from '#lib/types/database';
	import { EVENT_CATEGORIES } from '#lib/types/database';
	import {
		X,
		GraduationCap,
		CheckCircle2,
		Bell,
		Calendar as CalendarIcon,
		Clock,
		FileText,
		Save,
		Loader2
	} from 'lucide-svelte';

	let {
		show = false,
		initialDate = '',
		editingEvent = null,
		onSave,
		onClose
	}: {
		show: boolean;
		initialDate: string;
		editingEvent?: CalendarEvent | null;
		onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
		onClose: () => void;
	} = $props();

	let title = $state('');
	let category = $state<CalendarEventType>('evento');
	let eventDate = $state('');
	let eventTime = $state('');
	let description = $state('');
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);

	// Sincronizar formulario al abrir o cambiar de evento a editar
	$effect(() => {
		if (show) {
			if (editingEvent) {
				title = editingEvent.title;
				category = (editingEvent.category as CalendarEventType) || 'evento';
				eventDate = editingEvent.event_date;
				eventTime = editingEvent.event_time ? editingEvent.event_time.slice(0, 5) : '';
				description = editingEvent.description || '';
			} else {
				title = '';
				category = 'examen'; // Buen valor por defecto para estudiantes/rutina
				eventDate = initialDate || new Date().toISOString().slice(0, 10);
				eventTime = '';
				description = '';
			}
			errorMessage = null;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) {
			onClose();
		}
	}

	async function handleSubmit() {
		if (!title.trim()) {
			errorMessage = 'Por favor escribe un título para el evento.';
			return;
		}
		if (!eventDate) {
			errorMessage = 'Selecciona una fecha válida.';
			return;
		}

		isSaving = true;
		errorMessage = null;
		try {
			await onSave({
				id: editingEvent ? editingEvent.id : undefined,
				title: title.trim(),
				category,
				event_date: eventDate,
				event_time: eventTime.trim() ? eventTime.trim() : null,
				description: description.trim(),
				is_completed: editingEvent ? editingEvent.is_completed : false
			});
			onClose();
		} catch (err: any) {
			console.error('Error al guardar evento:', err);
			errorMessage = err?.message || 'Error al guardar el evento.';
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- Fondo oscurecido con desenfoque -->
	<div
		class="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
		role="dialog"
		aria-modal="true"
	>
		<!-- Contenedor del Modal -->
		<div
			class="w-full max-w-lg bg-[#070d0a] border border-[rgba(255,255,255,0.12)] rounded-[10px] shadow-[0_0_35px_rgba(0,0,0,0.85)] p-5 sm:p-6 space-y-4 my-8"
		>
			<!-- Cabecera -->
			<div class="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
				<div class="flex items-center gap-2.5">
					<div
						class="w-8 h-8 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.15)]"
					>
						<CalendarIcon class="w-4 h-4 stroke-[2.2]" />
					</div>
					<div>
						<h2 class="text-sm sm:text-base font-semibold text-[#f3f4f6]">
							{editingEvent ? 'Editar Evento / Recordatorio' : 'Añadir Evento o Tarea'}
						</h2>
						<p class="text-[11px] text-[#64748b]">
							Programa exámenes, entregas, citas o recordatorios en tu calendario
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-1.5 rounded-[5px] text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e] transition-colors cursor-pointer"
					title="Cerrar (Esc)"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Mensaje de error si ocurre -->
			{#if errorMessage}
				<div
					class="p-2.5 rounded-[6px] bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#ef4444]"
				>
					{errorMessage}
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4 text-xs"
			>
				<!-- Selector de Categoría / Tipo -->
				<div>
					<label class="block text-[#9ca3af] mb-1.5 font-medium" for="event-type">
						Tipo de Evento
					</label>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{#each Object.entries(EVENT_CATEGORIES) as [catKey, meta]}
							{@const isSelected = category === catKey}
							<button
								type="button"
								onclick={() => (category = catKey as CalendarEventType)}
								class="p-2.5 rounded-[6px] border text-left flex flex-col items-start gap-1 transition-all cursor-pointer
									{isSelected
									? `${meta.bgClass} ${meta.borderClass} ring-1 ring-inset ${meta.borderClass}`
									: 'bg-[#0a120e] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-[#9ca3af]'}"
							>
								<div class="flex items-center gap-1.5">
									{#if catKey === 'examen'}
										<GraduationCap class="w-3.5 h-3.5 {meta.textClass}" />
									{:else if catKey === 'tarea'}
										<CheckCircle2 class="w-3.5 h-3.5 {meta.textClass}" />
									{:else if catKey === 'recordatorio'}
										<Bell class="w-3.5 h-3.5 {meta.textClass}" />
									{:else}
										<CalendarIcon class="w-3.5 h-3.5 {meta.textClass}" />
									{/if}
									<span class="font-semibold text-xs {isSelected ? meta.textClass : 'text-[#f3f4f6]'}">
										{catKey.charAt(0).toUpperCase() + catKey.slice(1)}
									</span>
								</div>
								<span class="text-[10px] text-[#64748b] truncate w-full">
									{meta.label}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Título -->
				<div>
					<label class="block text-[#9ca3af] mb-1 font-medium" for="event-title">
						Título de la tarea o evento *
					</label>
					<input
						id="event-title"
						type="text"
						bind:value={title}
						placeholder="Ej: Examen de Álgebra, Entrega proyecto web, Revisar CV..."
						required
						class="w-full px-3 py-2 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none transition-all text-xs"
					/>
				</div>

				<!-- Fecha y Hora -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label class="block text-[#9ca3af] mb-1 font-medium" for="event-date">
							Fecha *
						</label>
						<input
							id="event-date"
							type="date"
							bind:value={eventDate}
							required
							class="w-full px-3 py-1.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] focus:outline-none transition-all text-xs font-mono"
						/>
					</div>

					<div>
						<label class="block text-[#9ca3af] mb-1 font-medium" for="event-time">
							Hora (Opcional)
						</label>
						<div class="relative">
							<input
								id="event-time"
								type="time"
								bind:value={eventTime}
								placeholder="HH:MM"
								class="w-full px-3 py-1.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] focus:outline-none transition-all text-xs font-mono"
							/>
						</div>
					</div>
				</div>

				<!-- Descripción o Notas -->
				<div>
					<label class="block text-[#9ca3af] mb-1 font-medium" for="event-description">
						Detalles o Notas adicionales (Opcional)
					</label>
					<textarea
						id="event-description"
						bind:value={description}
						rows="3"
						placeholder="Temas que entran en el examen, enlace de entrega, recordatorio clave..."
						class="w-full p-2.5 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] leading-relaxed resize-y focus:outline-none transition-all text-xs"
					></textarea>
				</div>

				<!-- Botones de Acción -->
				<div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[rgba(255,255,255,0.08)]">
					<button
						type="button"
						onclick={onClose}
						disabled={isSaving}
						class="px-3.5 py-1.5 rounded-[6px] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e] transition-colors cursor-pointer"
					>
						Cancelar
					</button>

					<button
						type="submit"
						disabled={isSaving}
						class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] font-semibold text-xs text-[#010302] bg-[#10b981] hover:bg-[#34d399] disabled:opacity-50 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer"
					>
						{#if isSaving}
							<Loader2 class="w-3.5 h-3.5 animate-spin" />
							<span>Guardando...</span>
						{:else}
							<Save class="w-3.5 h-3.5" />
							<span>{editingEvent ? 'Guardar Cambios' : 'Añadir al Calendario'}</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
