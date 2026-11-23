<script lang="ts">
	import type { CalendarEvent, CalendarEventType } from '#lib/types/database';
	import { EVENT_CATEGORIES } from '#lib/types/database';
	import {
		Calendar as CalendarIcon,
		Plus,
		CheckCircle2,
		Circle,
		Trash2,
		Clock,
		GraduationCap,
		Bell,
		Edit3
	} from 'lucide-svelte';

	let {
		events = [],
		viewingDate,
		onOpenAddModal,
		onToggleComplete,
		onEditEvent,
		onDeleteEvent
	}: {
		events: CalendarEvent[];
		viewingDate: string;
		onOpenAddModal: () => void;
		onToggleComplete: (eventId: string, currentCompleted: boolean) => Promise<void>;
		onEditEvent: (event: CalendarEvent) => void;
		onDeleteEvent: (eventId: string) => Promise<void>;
	} = $props();

	// Filtrar y ordenar eventos del día seleccionado:
	// No completados primero, luego por hora, luego completados
	let dayEvents = $derived(
		events
			.filter((e) => e.event_date === viewingDate)
			.sort((a, b) => {
				if (a.is_completed !== b.is_completed) {
					return a.is_completed ? 1 : -1;
				}
				if (a.event_time && b.event_time) {
					return a.event_time.localeCompare(b.event_time);
				}
				if (a.event_time && !b.event_time) return -1;
				if (!a.event_time && b.event_time) return 1;
				return 0;
			})
	);

	let examsCount = $derived(dayEvents.filter((e) => e.category === 'examen' && !e.is_completed).length);
</script>

<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5 transition-all">
	<!-- Encabezado de la Tarjeta -->
	<div class="flex items-center justify-between pb-3.5 border-b border-[rgba(255,255,255,0.08)] mb-3.5">
		<div class="flex items-center gap-2.5">
			<div
				class="p-2 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.15)]"
			>
				<CalendarIcon class="w-4 h-4 stroke-[2.2]" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h2 class="font-semibold text-sm sm:text-base text-[#f3f4f6]">
						Eventos y Recordatorios
					</h2>
					{#if examsCount > 0}
						<span
							class="px-2 py-0.5 rounded-[4px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[10px] font-bold text-[#ef4444] animate-pulse"
						>
							{examsCount} {examsCount === 1 ? 'examen hoy' : 'exámenes hoy'}
						</span>
					{/if}
				</div>
				<p class="text-xs text-[#64748b]">
					Exámenes, entregas y tareas programadas para esta fecha
				</p>
			</div>
		</div>

		<button
			type="button"
			onclick={onOpenAddModal}
			class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#010302] bg-[#10b981] hover:bg-[#34d399] rounded-[6px] shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
		>
			<Plus class="w-3.5 h-3.5 stroke-[2.5]" />
			<span>Añadir</span>
		</button>
	</div>

	<!-- Lista de Eventos del Día -->
	{#if dayEvents.length === 0}
		<div
			class="py-6 px-4 text-center rounded-[8px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[#040806]/50"
		>
			<p class="text-xs text-[#64748b] mb-2.5">
				No hay exámenes, tareas ni recordatorios para esta fecha.
			</p>
			<button
				type="button"
				onclick={onOpenAddModal}
				class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#10b981] hover:text-[#34d399] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] rounded-[5px] transition-colors cursor-pointer"
			>
				<Plus class="w-3 h-3" />
				<span>Programar un evento o examen</span>
			</button>
		</div>
	{:else}
		<div class="space-y-2">
			{#each dayEvents as event (event.id)}
				{@const meta = EVENT_CATEGORIES[event.category as CalendarEventType] || EVENT_CATEGORIES.evento}
				<div
					class="group p-3 rounded-[8px] bg-[#09110d] border transition-all flex items-start justify-between gap-3
						{event.is_completed
						? 'border-[rgba(255,255,255,0.05)] opacity-55'
						: `${meta.borderClass} hover:border-[rgba(255,255,255,0.18)] hover:bg-[#0c1611]`}"
				>
					<div class="flex items-start gap-2.5 flex-1 min-w-0">
						<!-- Botón para completar / desmarcar -->
						<button
							type="button"
							onclick={() => onToggleComplete(event.id, event.is_completed)}
							class="mt-0.5 text-[#64748b] hover:text-[#10b981] transition-colors cursor-pointer flex-shrink-0"
							title={event.is_completed ? 'Marcar como pendiente' : 'Marcar como completado'}
						>
							{#if event.is_completed}
								<CheckCircle2 class="w-4 h-4 text-[#10b981]" />
							{:else}
								<Circle class="w-4 h-4 hover:text-[#10b981]" />
							{/if}
						</button>

						<div class="flex-1 min-w-0">
							<div class="flex flex-wrap items-center gap-1.5 mb-1">
								<!-- Etiqueta de Categoría -->
								<span
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold border {meta.badgeClass}"
								>
									{#if event.category === 'examen'}
										<GraduationCap class="w-3 h-3" />
									{:else if event.category === 'tarea'}
										<CheckCircle2 class="w-3 h-3" />
									{:else if event.category === 'recordatorio'}
										<Bell class="w-3 h-3" />
									{:else}
										<CalendarIcon class="w-3 h-3" />
									{/if}
									<span>{meta.label}</span>
								</span>

								<!-- Hora si existe -->
								{#if event.event_time}
									<span
										class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[10px] text-[#9ca3af] font-mono"
									>
										<Clock class="w-2.5 h-2.5 text-[#10b981]" />
										<span>{event.event_time.slice(0, 5)}</span>
									</span>
								{/if}
							</div>

							<!-- Título -->
							<p
								class="text-xs font-medium leading-snug break-words
									{event.is_completed ? 'line-through text-[#64748b]' : 'text-[#f3f4f6]'}"
							>
								{event.title}
							</p>

							<!-- Descripción si existe -->
							{#if event.description}
								<p class="text-[11px] text-[#9ca3af] mt-1 leading-relaxed whitespace-pre-line">
									{event.description}
								</p>
							{/if}
						</div>
					</div>

					<!-- Acciones -->
					<div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
						<button
							type="button"
							onclick={() => onEditEvent(event)}
							class="p-1 rounded-[4px] text-[#64748b] hover:text-[#f3f4f6] hover:bg-[#0a120e] transition-colors cursor-pointer"
							title="Editar evento"
						>
							<Edit3 class="w-3.5 h-3.5" />
						</button>

						<button
							type="button"
							onclick={() => onDeleteEvent(event.id)}
							class="p-1 rounded-[4px] text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
							title="Eliminar evento"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
