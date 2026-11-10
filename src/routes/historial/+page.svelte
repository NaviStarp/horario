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
	let currentMonth = $state(new Date().getMonth());

	let monthLogs = $state<Record<string, DailyLog>>({});
	let totalScheduleBlocksCount = $state<number>(0);
	let isLoading = $state(true);

	const MONTH_NAMES = [
		'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
		'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
	];
	const DAY_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

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
			currentMonth--;
		}
		loadMonthData();
	}

	function goToCurrentMonth() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
		loadMonthData();
	}

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
				log: monthLogs[dateStr] || null
			});
		}

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

<div class="space-y-6 pb-12 font-mono">
	<!-- Encabezado de Historial Técnico -->
	<div class="cad-frame bg-[#070d0a] rounded-[10px] p-4 sm:p-5 border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981]">
				<Calendar class="w-5 h-5" />
			</div>
			<div>
				<h1 class="text-base sm:text-lg font-bold tracking-wider text-[#f3f4f6]">
					// MONTHLY_CAD_MATRIX
				</h1>
				<p class="text-[11px] text-[#64748b] mt-0.5">
					HABIT_CONSISTENCY &amp; JOURNAL_INDEX
				</p>
			</div>
		</div>

		<!-- Selector de Mes -->
		<div class="flex items-center gap-2 self-end sm:self-center text-xs">
			<button
				type="button"
				onclick={goToPreviousMonth}
				class="p-1.5 rounded-[5px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:border-[rgba(255,255,255,0.16)] transition-all cursor-pointer"
				aria-label="Mes anterior"
			>
				<ChevronLeft class="w-4 h-4 text-[#10b981]" />
			</button>

			<span class="font-bold text-xs text-[#f3f4f6] min-w-[130px] text-center tracking-wider px-2">
				{MONTH_NAMES[currentMonth]} {currentYear}
			</span>

			<button
				type="button"
				onclick={goToNextMonth}
				class="p-1.5 rounded-[5px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:border-[rgba(255,255,255,0.16)] transition-all cursor-pointer"
				aria-label="Mes siguiente"
			>
				<ChevronRight class="w-4 h-4 text-[#10b981]" />
			</button>

			<button
				type="button"
				onclick={goToCurrentMonth}
				class="ml-2 px-2.5 py-1 text-[11px] font-semibold text-[#10b981] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] hover:border-[#10b981] rounded-[5px] transition-all cursor-pointer"
			>
				CURRENT_CYCLE
			</button>
		</div>
	</div>

	<!-- Rejilla Calendario Tipo CAD -->
	<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] overflow-hidden">
		<!-- Cabecera Días -->
		<div class="grid grid-cols-7 border-b border-[rgba(255,255,255,0.08)] bg-[#040806] text-center text-[11px] font-bold text-[#64748b] py-2">
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

				<a
					href="/?date={cell.dateStr}"
					class="group min-h-[90px] sm:min-h-[105px] p-2 flex flex-col justify-between transition-all cursor-pointer
						{cell.isCurrentMonth ? 'bg-[#070d0a] hover:bg-[#0e1813]' : 'bg-[#020503] opacity-35 hover:opacity-80'}
						{cell.isToday ? 'ring-1 ring-[#10b981] ring-inset bg-[#0e1813] oled-glow' : ''}"
				>
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold {cell.isToday ? 'w-5 h-5 rounded-[4px] bg-[#10b981] text-[#010302] flex items-center justify-center font-extrabold shadow-[0_0_8px_#10b981]' : 'text-[#f3f4f6]'}">
							{cell.dayNumber}
						</span>

						{#if mood}
							<span class="text-xs" title="Mood">{mood}</span>
						{/if}
					</div>

					<!-- Indicadores Técnicos -->
					<div class="space-y-1 my-1">
						{#if completedCount > 0}
							<div class="flex items-center gap-1 text-[10px] text-[#10b981] font-mono font-medium">
								<span class="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_4px_#10b981]"></span>
								<span>{completedCount} BLOQUES</span>
							</div>
						{/if}

						{#if hasDiary}
							<div class="flex items-center gap-1 text-[10px] text-[#38bdf8] font-mono font-medium">
								<span class="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
								<span>DIARY_LOG</span>
							</div>
						{/if}
					</div>

					<div class="text-[9px] text-[#64748b] group-hover:text-[#10b981] flex items-center justify-end">
						<ArrowRight class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
