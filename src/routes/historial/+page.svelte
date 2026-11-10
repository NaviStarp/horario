<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import type { DailyLog, ScheduleBlock } from '#lib/types/database';
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import { getTodayString } from '#lib/utils/timeHelpers';
	import {
		ChevronLeft,
		ChevronRight,
		Calendar,
		BookOpen,
		CheckCircle2,
		ArrowRight
	} from 'lucide-svelte';

	let { data }: PageProps = $props();

	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth()); // 0-indexed (0 = Enero)

	let monthLogs = $state<Record<string, DailyLog>>({});
	let totalScheduleBlocksCount = $state<number>(0);
	let isLoading = $state(true);

	const MONTH_NAMES = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];
	const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

	let isConfigured = $derived(data.isConfigured);
	let user = $derived(data.user);

	onMount(async () => {
		await loadMonthData();
	});

	async function loadMonthData() {
		isLoading = true;
		try {
			const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
			const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
			const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

			if (isConfigured && user) {
				const [logsRes, blocksRes] = await Promise.all([
					supabase
						.from('daily_logs')
						.select('*')
						.gte('log_date', startOfMonth)
						.lte('log_date', endOfMonth),
					supabase
						.from('schedule_blocks')
						.select('id')
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
			} else {
				// LocalStorage
				const savedLogs = JSON.parse(localStorage.getItem('demo_horario_daily_logs') || '{}');
				monthLogs = savedLogs;
				const savedBlocks = JSON.parse(localStorage.getItem('demo_horario_blocks') || '[]');
				totalScheduleBlocksCount = savedBlocks.length;
			}
		} catch (err) {
			console.error('Error al cargar historial:', err);
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

	// Construir cuadrícula de días del mes
	let calendarDays = $derived.by(() => {
		const days: Array<{
			dateStr: string;
			dayNumber: number;
			isCurrentMonth: boolean;
			isToday: boolean;
			log: DailyLog | null;
		}> = [];

		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

		// getDay() devuelve 0 para domingo. Convertir a lunes = 0 ... domingo = 6
		let firstDayIndex = firstDayOfMonth.getDay() - 1;
		if (firstDayIndex === -1) firstDayIndex = 6;

		// Días del mes anterior para rellenar
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
				log: monthLogs[dateStr] || null
			});
		}

		// Días del mes actual
		for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
			const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({
				dateStr,
				dayNumber: d,
				isCurrentMonth: true,
				isToday: dateStr === getTodayString(),
				log: monthLogs[dateStr] || null
			});
		}

		// Rellenar hasta completar semanas
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
					log: monthLogs[dateStr] || null
				});
			}
		}

		return days;
	});
</script>

<div class="space-y-6 pb-12">
	<!-- Encabezado de Historial -->
	<div class="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
				<Calendar class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
					Historial de Hábitos y Diario
				</h1>
				<p class="text-xs text-zinc-500 dark:text-zinc-400">
					Visualiza tu consistencia mensual y accede a cualquier jornada pasada
				</p>
			</div>
		</div>

		<!-- Selector de Mes -->
		<div class="flex items-center gap-2 self-end sm:self-center">
			<button
				type="button"
				onclick={goToPreviousMonth}
				class="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
				aria-label="Mes anterior"
			>
				<ChevronLeft class="w-4 h-4" />
			</button>

			<span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 min-w-[130px] text-center">
				{MONTH_NAMES[currentMonth]} {currentYear}
			</span>

			<button
				type="button"
				onclick={goToNextMonth}
				class="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
				aria-label="Mes siguiente"
			>
				<ChevronRight class="w-4 h-4" />
			</button>

			<button
				type="button"
				onclick={goToCurrentMonth}
				class="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition-colors"
			>
				Este Mes
			</button>
		</div>
	</div>

	<!-- Calendario Mensual -->
	<div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
		<!-- Cabecera de Días de la Semana -->
		<div class="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 py-2.5">
			{#each DAY_NAMES as day}
				<div>{day}</div>
			{/each}
		</div>

		<!-- Rejilla de Celdas -->
		<div class="grid grid-cols-7 divide-x divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
			{#each calendarDays as cell (cell.dateStr)}
				{@const hasDiary = Boolean(cell.log?.diary_content && cell.log.diary_content.trim())}
				{@const completedCount = cell.log?.completed_blocks?.length || 0}
				{@const mood = cell.log?.mood}

				<a
					href="/?date={cell.dateStr}"
					class="group min-h-[95px] sm:min-h-[110px] p-2 sm:p-2.5 flex flex-col justify-between transition-all hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20
						{cell.isCurrentMonth ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/40 dark:bg-zinc-900/30 opacity-40'}
						{cell.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/10' : ''}"
				>
					<div class="flex items-center justify-between">
						<span class="text-xs sm:text-sm font-semibold {cell.isToday ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold' : 'text-zinc-700 dark:text-zinc-300'}">
							{cell.dayNumber}
						</span>

						{#if mood}
							<span class="text-sm" title="Ánimo">{mood}</span>
						{/if}
					</div>

					<!-- Indicadores del Día -->
					<div class="space-y-1 my-1">
						{#if completedCount > 0}
							<div class="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
								<CheckCircle2 class="w-3 h-3 flex-shrink-0" />
								<span>{completedCount} tareas</span>
							</div>
						{/if}

						{#if hasDiary}
							<div class="flex items-center gap-1 text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium">
								<BookOpen class="w-3 h-3 flex-shrink-0" />
								<span class="truncate">Diario escrito</span>
							</div>
						{/if}
					</div>

					<div class="text-[10px] text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-end">
						<ArrowRight class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
