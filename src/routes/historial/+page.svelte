<script lang="ts">
	import type { PageProps } from './$types';
	import type { DailyLog, ScheduleBlock, CalendarEvent, CalendarEventType } from '#lib/types/database';
	import { EVENT_CATEGORIES } from '#lib/types/database';
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import { getTodayString } from '#lib/utils/timeHelpers';
	import { resolve } from '$app/paths';
	import { auth } from '#lib/auth.svelte';
	import CalendarEventModal from '#lib/components/CalendarEventModal.svelte';
	import {
		ChevronLeft,
		ChevronRight,
		Calendar,
		CheckCircle2,
		Circle,
		ArrowRight,
		Plus,
		GraduationCap,
		Bell,
		Trash2,
		Edit3,
		Clock,
		Sparkles
	} from 'lucide-svelte';

	let { data }: PageProps = $props();

	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth());

	let monthLogs = $state<Record<string, DailyLog>>({});
	let monthEvents = $state<CalendarEvent[]>([]);
	let totalScheduleBlocksCount = $state<number>(0);
	let isLoading = $state(true);

	// Modal para añadir/editar evento
	let showEventModal = $state(false);
	let modalInitialDate = $state(getTodayString());
	let editingEvent = $state<CalendarEvent | null>(null);

	// Filtro de categoría en la lista de eventos del mes
	let categoryFilter = $state<string>('todos');

	const MONTH_NAMES = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];
	const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

	let isConfigured = $derived(data.isConfigured);
	let user = $derived(auth.user);

	$effect(() => {
		if (auth.loading) return;
		void user;
		loadMonthData();
	});

	async function loadMonthData() {
		isLoading = true;
		try {
			const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
			const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
			const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

			if (isConfigured && user) {
				const [logsRes, blocksRes, eventsRes] = await Promise.all([
					supabase
						.from('daily_logs')
						.select('*')
						.gte('log_date', startOfMonth)
						.lte('log_date', endOfMonth),
					supabase
						.from('schedule_blocks')
						.select('id'),
					supabase
						.from('calendar_events')
						.select('*')
						.gte('event_date', startOfMonth)
						.lte('event_date', endOfMonth)
						.order('event_date', { ascending: true })
						.order('event_time', { ascending: true })
				]);

				if (logsRes.data) {
					const map: Record<string, DailyLog> = {};
					for (const log of logsRes.data as DailyLog[]) {
						map[log.log_date] = log;
					}
					monthLogs = map;
				}
				if (blocksRes.data) {
					totalScheduleBlocksCount = blocksRes.data.length;
				}

				if (eventsRes.data) {
					monthEvents = eventsRes.data as CalendarEvent[];
				} else {
					// Si la tabla aún no se ha creado en Supabase, leer de localStorage sin fallar
					const localEvents = JSON.parse(localStorage.getItem('demo_horario_calendar_events') || '[]');
					monthEvents = localEvents.filter(
						(e: CalendarEvent) => e.event_date >= startOfMonth && e.event_date <= endOfMonth
					);
				}
			} else {
				// Modo Demo con localStorage
				const savedLogs = JSON.parse(localStorage.getItem('demo_horario_daily_logs') || '{}');
				monthLogs = savedLogs;
				const savedBlocks = JSON.parse(localStorage.getItem('demo_horario_blocks') || '[]');
				totalScheduleBlocksCount = savedBlocks.length;

				const localEvents = JSON.parse(localStorage.getItem('demo_horario_calendar_events') || '[]');
				monthEvents = localEvents.filter(
					(e: CalendarEvent) => e.event_date >= startOfMonth && e.event_date <= endOfMonth
				);
			}
		} catch (err) {
			console.error('Error al cargar historial y eventos:', err);
		} finally {
			isLoading = false;
		}
	}

	function goToPreviousMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
		loadMonthData();
	}

	function goToNextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
		loadMonthData();
	}

	function goToCurrentMonth() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
		loadMonthData();
	}

	// Agrupar eventos por fecha para visualización rápida en las celdas
	let eventsByDate = $derived.by(() => {
		const map: Record<string, CalendarEvent[]> = {};
		for (const ev of monthEvents) {
			if (!map[ev.event_date]) {
				map[ev.event_date] = [];
			}
			map[ev.event_date].push(ev);
		}
		return map;
	});

	// Conteo de exámenes del mes actual
	let totalMonthExams = $derived(monthEvents.filter((e) => e.category === 'examen').length);
	let pendingMonthTasks = $derived(monthEvents.filter((e) => e.category === 'tarea' && !e.is_completed).length);

	// Eventos filtrados para la lista inferior
	let filteredMonthEvents = $derived(
		monthEvents.filter((e) => {
			if (categoryFilter === 'todos') return true;
			return e.category === categoryFilter;
		})
	);

	let calendarDays = $derived.by(() => {
		const days: Array<{
			dateStr: string;
			dayNumber: number;
			isCurrentMonth: boolean;
			isToday: boolean;
			log: DailyLog | null;
			events: CalendarEvent[];
		}> = [];

		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

		let firstDayIndex = firstDayOfMonth.getDay() - 1;
		if (firstDayIndex === -1) firstDayIndex = 6;

		const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
		for (let i = firstDayIndex - 1; i >= 0; i--) {
			const d = prevMonthLastDay - i;
			const m = currentMonth === 0 ? 12 : currentMonth;
			const y = currentMonth === 0 ? currentYear - 1 : currentYear;
			const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({
				dateStr,
				dayNumber: d,
				isCurrentMonth: false,
				isToday: dateStr === getTodayString(),
				log: monthLogs[dateStr] || null,
				events: eventsByDate[dateStr] || []
			});
		}

		for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
			const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({
				dateStr,
				dayNumber: d,
				isCurrentMonth: true,
				isToday: dateStr === getTodayString(),
				log: monthLogs[dateStr] || null,
				events: eventsByDate[dateStr] || []
			});
		}

		const remaining = 7 - (days.length % 7);
		if (remaining < 7) {
			for (let d = 1; d <= remaining; d++) {
				const m = currentMonth === 11 ? 1 : currentMonth + 2;
				const y = currentMonth === 11 ? currentYear + 1 : currentYear;
				const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
				days.push({
					dateStr,
					dayNumber: d,
					isCurrentMonth: false,
					isToday: dateStr === getTodayString(),
					log: monthLogs[dateStr] || null,
					events: eventsByDate[dateStr] || []
				});
			}
		}

		return days;
	});

	// Apertura y gestión de eventos
	function openAddModal(dateStr?: string) {
		modalInitialDate = dateStr || getTodayString();
		editingEvent = null;
		showEventModal = true;
	}

	function openEditModal(event: CalendarEvent) {
		editingEvent = event;
		modalInitialDate = event.event_date;
		showEventModal = true;
	}

	async function handleSaveEvent(eventData: Partial<CalendarEvent>) {
		if (isConfigured && user) {
			if (eventData.id) {
				const { error } = await supabase
					.from('calendar_events')
					.update({
						title: eventData.title,
						category: eventData.category,
						event_date: eventData.event_date,
						event_time: eventData.event_time,
						description: eventData.description,
						is_completed: eventData.is_completed
					})
					.eq('id', eventData.id);

				if (!error) {
					monthEvents = monthEvents.map((e) =>
						e.id === eventData.id ? ({ ...e, ...eventData } as CalendarEvent) : e
					);
					return;
				}
			} else {
				const { data: newEv, error } = await supabase
					.from('calendar_events')
					.insert({
						user_id: user.id,
						title: eventData.title,
						category: eventData.category,
						event_date: eventData.event_date,
						event_time: eventData.event_time,
						description: eventData.description,
						is_completed: eventData.is_completed || false
					})
					.select()
					.single();

				if (!error && newEv) {
					monthEvents = [...monthEvents, newEv as CalendarEvent];
					return;
				}
			}
		}

		// Almacenamiento local para modo demo o si la tabla en Supabase no ha sido migrada aún
		const local = JSON.parse(localStorage.getItem('demo_horario_calendar_events') || '[]');
		let updatedLocal: CalendarEvent[];
		if (eventData.id) {
			updatedLocal = local.map((e: CalendarEvent) =>
				e.id === eventData.id ? { ...e, ...eventData } : e
			);
		} else {
			const newEv: CalendarEvent = {
				id: `event-${Date.now()}`,
				user_id: user?.id || 'demo-user',
				title: eventData.title || '',
				category: eventData.category || 'evento',
				event_date: eventData.event_date || getTodayString(),
				event_time: eventData.event_time || null,
				description: eventData.description || '',
				is_completed: false,
				created_at: new Date().toISOString()
			};
			updatedLocal = [...local, newEv];
		}
		localStorage.setItem('demo_horario_calendar_events', JSON.stringify(updatedLocal));
		await loadMonthData();
	}

	async function handleToggleComplete(eventId: string, currentCompleted: boolean) {
		const newStatus = !currentCompleted;
		monthEvents = monthEvents.map((e) => (e.id === eventId ? { ...e, is_completed: newStatus } : e));

		if (isConfigured && user) {
			const { error } = await supabase
				.from('calendar_events')
				.update({ is_completed: newStatus })
				.eq('id', eventId);
			if (!error) return;
		}

		const local = JSON.parse(localStorage.getItem('demo_horario_calendar_events') || '[]');
		const updated = local.map((e: CalendarEvent) =>
			e.id === eventId ? { ...e, is_completed: newStatus } : e
		);
		localStorage.setItem('demo_horario_calendar_events', JSON.stringify(updated));
	}

	async function handleDeleteEvent(eventId: string) {
		monthEvents = monthEvents.filter((e) => e.id !== eventId);

		if (isConfigured && user) {
			const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
			if (!error) return;
		}

		const local = JSON.parse(localStorage.getItem('demo_horario_calendar_events') || '[]');
		const updated = local.filter((e: CalendarEvent) => e.id !== eventId);
		localStorage.setItem('demo_horario_calendar_events', JSON.stringify(updated));
	}
</script>

<div class="space-y-6 pb-12 font-sans">
	<!-- Encabezado de Calendario & Historial -->
	<div
		class="cad-frame bg-[#070d0a] rounded-[10px] p-4 sm:p-5 border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4"
	>
		<div class="flex items-center gap-3">
			<div
				class="p-2.5 rounded-[8px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.18)]"
			>
				<Calendar class="w-5 h-5 stroke-[2.2]" />
			</div>
			<div>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-base sm:text-lg font-bold text-[#f3f4f6]">
						Calendario, Exámenes &amp; Tareas
					</h1>
					{#if totalMonthExams > 0}
						<span
							class="px-2 py-0.5 rounded-[4px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[11px] font-bold text-[#ef4444]"
						>
							{totalMonthExams} {totalMonthExams === 1 ? 'examen' : 'exámenes'} este mes
						</span>
					{/if}
					{#if pendingMonthTasks > 0}
						<span
							class="px-2 py-0.5 rounded-[4px] bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[11px] font-medium text-[#38bdf8]"
						>
							{pendingMonthTasks} {pendingMonthTasks === 1 ? 'tarea pendiente' : 'tareas pendientes'}
						</span>
					{/if}
				</div>
				<p class="text-xs text-[#64748b] mt-0.5">
					Planifica tus fechas clave, exámenes, entregas y revisa tu constancia diaria
				</p>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2 self-start md:self-center text-xs">
			<!-- Botón "+ Añadir Evento" destacado -->
			<button
				type="button"
				onclick={() => openAddModal()}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-xs text-[#010302] bg-[#10b981] hover:bg-[#34d399] rounded-[6px] shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all cursor-pointer mr-1"
			>
				<Plus class="w-3.5 h-3.5 stroke-[2.5]" />
				<span>Añadir Evento</span>
			</button>

			<!-- Controles de Mes -->
			<div class="flex items-center bg-[#0a120e] rounded-[6px] border border-[rgba(255,255,255,0.08)] p-0.5">
				<button
					type="button"
					onclick={goToPreviousMonth}
					class="p-1.5 rounded-[4px] text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#070d0a] transition-all cursor-pointer"
					title="Mes anterior"
					aria-label="Mes anterior"
				>
					<ChevronLeft class="w-4 h-4 text-[#10b981]" />
				</button>

				<span class="font-semibold text-xs text-[#f3f4f6] min-w-[120px] text-center px-2">
					{MONTH_NAMES[currentMonth]} {currentYear}
				</span>

				<button
					type="button"
					onclick={goToNextMonth}
					class="p-1.5 rounded-[4px] text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#070d0a] transition-all cursor-pointer"
					title="Mes siguiente"
					aria-label="Mes siguiente"
				>
					<ChevronRight class="w-4 h-4 text-[#10b981]" />
				</button>
			</div>

			<button
				type="button"
				onclick={goToCurrentMonth}
				class="px-2.5 py-1.5 text-xs font-medium text-[#10b981] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] hover:border-[#10b981] rounded-[6px] transition-all cursor-pointer"
			>
				Hoy
			</button>
		</div>
	</div>

	<!-- Rejilla del Calendario Mensual -->
	<div
		class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
	>
		<!-- Cabecera Días de la Semana -->
		<div
			class="grid grid-cols-7 border-b border-[rgba(255,255,255,0.08)] bg-[#040806] text-center text-xs font-semibold text-[#64748b] py-2"
		>
			{#each DAY_NAMES as day}
				<div>{day}</div>
			{/each}
		</div>

		<!-- Celdas de Días -->
		<div class="grid grid-cols-7 divide-x divide-y divide-[rgba(255,255,255,0.08)]">
			{#each calendarDays as cell (cell.dateStr)}
				{@const hasDiary = Boolean(cell.log?.diary_content && cell.log.diary_content.trim())}
				{@const completedCount = cell.log?.completed_blocks?.length || 0}
				{@const mood = cell.log?.mood}
				{@const cellEvents = cell.events}

				<div
					class="group min-h-[100px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-all relative
						{cell.isCurrentMonth ? 'bg-[#070d0a] hover:bg-[#0c1611]' : 'bg-[#020503] opacity-40 hover:opacity-85'}
						{cell.isToday ? 'ring-1 ring-[#10b981] ring-inset bg-[#0e1813] oled-glow' : ''}"
				>
					<!-- Cabecera de la celda: Número de día, ánimo y botón + rápido -->
					<div class="flex items-center justify-between mb-1">
						<a
							href="{resolve('/')}?date={cell.dateStr}"
							class="text-xs font-semibold {cell.isToday
								? 'w-5 h-5 rounded-[4px] bg-[#10b981] text-[#010302] flex items-center justify-center font-bold shadow-[0_0_8px_#10b981]'
								: 'text-[#f3f4f6] hover:text-[#10b981]'}"
							title="Ir al panel de este día"
						>
							{cell.dayNumber}
						</a>

						<div class="flex items-center gap-1">
							{#if mood}
								<span class="text-xs" title="Estado de ánimo">{mood}</span>
							{/if}

							<!-- Botón rápido + para añadir evento en esta fecha concreta -->
							<button
								type="button"
								onclick={() => openAddModal(cell.dateStr)}
								class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#64748b] hover:text-[#10b981] hover:bg-[#0a120e] transition-all cursor-pointer"
								title="Añadir evento en el {cell.dateStr}"
							>
								<Plus class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- Indicadores de Eventos del día -->
					<div class="space-y-1 flex-1 overflow-hidden my-0.5">
						{#if cellEvents.length > 0}
							{#each cellEvents.slice(0, 2) as ev (ev.id)}
								{@const meta = EVENT_CATEGORIES[ev.category as CalendarEventType] || EVENT_CATEGORIES.evento}
								<button
									type="button"
									onclick={() => openEditModal(ev)}
									class="w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border truncate transition-all cursor-pointer
										{ev.is_completed
										? 'bg-[#0a120e]/60 text-[#64748b] border-transparent line-through'
										: `${meta.bgClass} ${meta.textClass} ${meta.borderClass} hover:brightness-125`}"
									title="{meta.label}: {ev.title} {ev.event_time ? `(${ev.event_time.slice(0, 5)})` : ''}"
								>
									{#if ev.category === 'examen'}
										<GraduationCap class="w-2.5 h-2.5 flex-shrink-0" />
									{:else if ev.category === 'tarea'}
										<CheckCircle2 class="w-2.5 h-2.5 flex-shrink-0" />
									{:else if ev.category === 'recordatorio'}
										<Bell class="w-2.5 h-2.5 flex-shrink-0" />
									{:else}
										<span class="w-1.5 h-1.5 rounded-full {meta.dotClass} flex-shrink-0"></span>
									{/if}
									<span class="truncate">{ev.title}</span>
								</button>
							{/each}

							{#if cellEvents.length > 2}
								<span class="text-[9px] text-[#64748b] font-medium pl-1 block">
									+{cellEvents.length - 2} más
								</span>
							{/if}
						{/if}
					</div>

					<!-- Pie de celda: Rutinas completadas y diario -->
					<div class="pt-1 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between text-[10px]">
						<div class="flex items-center gap-1.5 truncate">
							{#if completedCount > 0}
								<span
									class="inline-flex items-center gap-0.5 text-[10px] text-[#10b981] font-medium"
									title="{completedCount} hábitos completados"
								>
									<span class="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_3px_#10b981]"></span>
									<span>{completedCount}</span>
								</span>
							{/if}

							{#if hasDiary}
								<span
									class="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"
									title="Diario personal escrito"
								></span>
							{/if}
						</div>

						<!-- Enlace para abrir el día en el dashboard -->
						<a
							href="{resolve('/')}?date={cell.dateStr}"
							class="text-[#64748b] hover:text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity"
							title="Abrir día en el dashboard"
						>
							<ArrowRight class="w-3 h-3" />
						</a>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Sección Inferior: Lista Completa de Eventos del Mes -->
	<div class="cad-frame bg-[#070d0a] rounded-[10px] p-4 sm:p-5 border border-[rgba(255,255,255,0.08)] space-y-4">
		<!-- Encabezado y Filtros -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.08)]">
			<div>
				<h2 class="text-sm sm:text-base font-semibold text-[#f3f4f6]">
					Eventos, Exámenes y Recordatorios de {MONTH_NAMES[currentMonth]} {currentYear}
				</h2>
				<p class="text-xs text-[#64748b]">
					Total de {monthEvents.length} {monthEvents.length === 1 ? 'evento programado' : 'eventos programados'} para este mes
				</p>
			</div>

			<!-- Filtros de categoría -->
			<div class="flex flex-wrap items-center gap-1.5 bg-[#0a120e] p-1 rounded-[6px] border border-[rgba(255,255,255,0.08)] text-xs">
				<button
					type="button"
					onclick={() => (categoryFilter = 'todos')}
					class="px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer
						{categoryFilter === 'todos' ? 'bg-[#10b981] text-[#010302] font-semibold' : 'text-[#9ca3af] hover:text-[#f3f4f6]'}"
				>
					Todos ({monthEvents.length})
				</button>
				<button
					type="button"
					onclick={() => (categoryFilter = 'examen')}
					class="px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer
						{categoryFilter === 'examen' ? 'bg-[#ef4444] text-[#010302] font-semibold' : 'text-[#ef4444] hover:bg-[#ef4444]/10'}"
				>
					Exámenes ({monthEvents.filter((e) => e.category === 'examen').length})
				</button>
				<button
					type="button"
					onclick={() => (categoryFilter = 'tarea')}
					class="px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer
						{categoryFilter === 'tarea' ? 'bg-[#38bdf8] text-[#010302] font-semibold' : 'text-[#38bdf8] hover:bg-[#38bdf8]/10'}"
				>
					Tareas ({monthEvents.filter((e) => e.category === 'tarea').length})
				</button>
				<button
					type="button"
					onclick={() => (categoryFilter = 'recordatorio')}
					class="px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer
						{categoryFilter === 'recordatorio' ? 'bg-[#f59e0b] text-[#010302] font-semibold' : 'text-[#f59e0b] hover:bg-[#f59e0b]/10'}"
				>
					Recordatorios ({monthEvents.filter((e) => e.category === 'recordatorio').length})
				</button>
			</div>
		</div>

		<!-- Lista de Eventos -->
		{#if filteredMonthEvents.length === 0}
			<div class="py-8 text-center border border-dashed border-[rgba(255,255,255,0.08)] rounded-[8px] space-y-2">
				<p class="text-xs text-[#64748b]">
					No hay eventos {categoryFilter !== 'todos' ? `de tipo ${categoryFilter}` : ''} para {MONTH_NAMES[currentMonth]}.
				</p>
				<button
					type="button"
					onclick={() => openAddModal()}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#10b981] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] rounded-[6px] hover:border-[#10b981] transition-all cursor-pointer"
				>
					<Plus class="w-3.5 h-3.5" />
					<span>Añadir el primer evento</span>
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				{#each filteredMonthEvents as ev (ev.id)}
					{@const meta = EVENT_CATEGORIES[ev.category as CalendarEventType] || EVENT_CATEGORIES.evento}
					<div
						class="p-3.5 rounded-[8px] bg-[#09110d] border transition-all flex items-start justify-between gap-3 group
							{ev.is_completed
							? 'border-[rgba(255,255,255,0.05)] opacity-60'
							: `${meta.borderClass} hover:border-[rgba(255,255,255,0.18)] hover:bg-[#0c1611]`}"
					>
						<div class="flex items-start gap-2.5 flex-1 min-w-0">
							<!-- Botón checkbox -->
							<button
								type="button"
								onclick={() => handleToggleComplete(ev.id, ev.is_completed)}
								class="mt-0.5 text-[#64748b] hover:text-[#10b981] transition-colors cursor-pointer flex-shrink-0"
								title={ev.is_completed ? 'Marcar como pendiente' : 'Marcar como completado'}
							>
								{#if ev.is_completed}
									<CheckCircle2 class="w-4 h-4 text-[#10b981]" />
								{:else}
									<Circle class="w-4 h-4 hover:text-[#10b981]" />
								{/if}
							</button>

							<div class="flex-1 min-w-0">
								<!-- Metadatos de Fecha y Categoría -->
								<div class="flex flex-wrap items-center gap-1.5 mb-1">
									<!-- Fecha -->
									<a
										href="{resolve('/')}?date={ev.event_date}"
										class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[10px] text-[#f3f4f6] font-mono hover:border-[#10b981] transition-colors"
										title="Ver en el dashboard"
									>
										<Calendar class="w-2.5 h-2.5 text-[#10b981]" />
										<span>{ev.event_date}</span>
									</a>

									<!-- Categoría -->
									<span
										class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold border {meta.badgeClass}"
									>
										{#if ev.category === 'examen'}
											<GraduationCap class="w-3 h-3" />
										{:else if ev.category === 'tarea'}
											<CheckCircle2 class="w-3 h-3" />
										{:else if ev.category === 'recordatorio'}
											<Bell class="w-3 h-3" />
										{:else}
											<Calendar class="w-3 h-3" />
										{/if}
										<span>{meta.label}</span>
									</span>

									<!-- Hora si existe -->
									{#if ev.event_time}
										<span
											class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[10px] text-[#9ca3af] font-mono"
										>
											<Clock class="w-2.5 h-2.5 text-[#10b981]" />
											<span>{ev.event_time.slice(0, 5)}</span>
										</span>
									{/if}
								</div>

								<!-- Título -->
								<p
									class="text-xs font-semibold leading-snug break-words
										{ev.is_completed ? 'line-through text-[#64748b]' : 'text-[#f3f4f6]'}"
								>
									{ev.title}
								</p>

								<!-- Descripción -->
								{#if ev.description}
									<p class="text-[11px] text-[#9ca3af] mt-1 leading-relaxed whitespace-pre-line">
										{ev.description}
									</p>
								{/if}
							</div>
						</div>

						<!-- Acciones -->
						<div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
							<button
								type="button"
								onclick={() => openEditModal(ev)}
								class="p-1 rounded-[4px] text-[#64748b] hover:text-[#f3f4f6] hover:bg-[#0a120e] transition-colors cursor-pointer"
								title="Editar"
							>
								<Edit3 class="w-3.5 h-3.5" />
							</button>

							<button
								type="button"
								onclick={() => handleDeleteEvent(ev.id)}
								class="p-1 rounded-[4px] text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
								title="Eliminar"
							>
								<Trash2 class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal para Añadir / Editar Evento -->
<CalendarEventModal
	show={showEventModal}
	initialDate={modalInitialDate}
	{editingEvent}
	onSave={handleSaveEvent}
	onClose={() => {
		showEventModal = false;
		editingEvent = null;
	}}
/>
