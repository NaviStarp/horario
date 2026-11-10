<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import type { ScheduleBlock, DailyLog, QuickNote } from '#lib/types/database';
	import { DEFAULT_SCHEDULE_BLOCKS } from '#lib/utils/defaultBlocks';
	import { supabase, isSupabaseConfigured } from '#lib/supabaseClient';
	import {
		getTodayString,
		formatDisplayDate,
		shiftDate,
		isToday
	} from '#lib/utils/timeHelpers';

	import ScheduleList from '#lib/components/ScheduleList.svelte';
	import QuickNotes from '#lib/components/QuickNotes.svelte';
	import DiaryEditor from '#lib/components/DiaryEditor.svelte';

	import {
		ChevronLeft,
		ChevronRight,
		Calendar as CalendarIcon,
		RotateCcw
	} from 'lucide-svelte';

	let { data }: PageProps = $props();

	// Fecha seleccionada
	let viewingDate = $state(getTodayString());

	// Estado principal
	let blocks = $state<ScheduleBlock[]>([]);
	let completedBlockIds = $state<string[]>([]);
	let diaryContent = $state<string>('');
	let diaryMood = $state<string | null>(null);
	let notes = $state<QuickNote[]>([]);
	let isLoading = $state(true);

	let isConfigured = $derived(data.isConfigured);
	let user = $derived(data.user);

	const LOCAL_BLOCKS_KEY = 'demo_horario_blocks';
	const LOCAL_LOGS_KEY = 'demo_horario_daily_logs';
	const LOCAL_NOTES_KEY = 'demo_horario_quick_notes';

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const paramDate = urlParams.get('date');
		if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
			viewingDate = paramDate;
		}

		await loadInitialData();
	});

	$effect(() => {
		if (viewingDate) {
			loadDayLog(viewingDate);
		}
	});

	async function loadInitialData() {
		isLoading = true;
		try {
			if (isConfigured && user) {
				const [blocksRes, notesRes] = await Promise.all([
					supabase
						.from('schedule_blocks')
						.select('*')
						.order('sort_order', { ascending: true })
						.order('start_time', { ascending: true }),
					supabase
						.from('quick_notes')
						.select('*')
						.order('created_at', { ascending: false })
				]);

				if (blocksRes.data) {
					blocks = blocksRes.data as ScheduleBlock[];
				}
				if (notesRes.data) {
					notes = notesRes.data as QuickNote[];
				}
			} else {
				const savedBlocks = localStorage.getItem(LOCAL_BLOCKS_KEY);
				if (savedBlocks) {
					blocks = JSON.parse(savedBlocks);
				} else {
					const initial = DEFAULT_SCHEDULE_BLOCKS.map((b, i) => ({
						...b,
						id: `demo-block-${i + 1}`,
						user_id: 'demo-user'
					}));
					blocks = initial as ScheduleBlock[];
					localStorage.setItem(LOCAL_BLOCKS_KEY, JSON.stringify(blocks));
				}

				const savedNotes = localStorage.getItem(LOCAL_NOTES_KEY);
				if (savedNotes) {
					notes = JSON.parse(savedNotes);
				} else {
					notes = [
						{
							id: 'demo-note-1',
							user_id: 'demo-user',
							content: 'Comprar café tostado ☕',
							is_pinned: true,
							is_archived: false,
							created_at: new Date().toISOString()
						},
						{
							id: 'demo-note-2',
							user_id: 'demo-user',
							content: 'Revisar documentación de SvelteKit y Svelte 5 runes',
							is_pinned: false,
							is_archived: false,
							created_at: new Date().toISOString()
						}
					];
					localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
				}
			}

			await loadDayLog(viewingDate);
		} catch (err) {
			console.error('Error al cargar datos:', err);
		} finally {
			isLoading = false;
		}
	}

	async function loadDayLog(date: string) {
		try {
			if (isConfigured && user) {
				const { data: log, error } = await supabase
					.from('daily_logs')
					.select('*')
					.eq('log_date', date)
					.maybeSingle();

				if (log) {
					completedBlockIds = Array.isArray(log.completed_blocks) ? log.completed_blocks : [];
					diaryContent = log.diary_content || '';
					diaryMood = log.mood || null;
				} else {
					completedBlockIds = [];
					diaryContent = '';
					diaryMood = null;
				}
			} else {
				const logsMap = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '{}');
				const log = logsMap[date];
				if (log) {
					completedBlockIds = log.completed_blocks || [];
					diaryContent = log.diary_content || '';
					diaryMood = log.mood || null;
				} else {
					completedBlockIds = [];
					diaryContent = '';
					diaryMood = null;
				}
			}
		} catch (err) {
			console.error('Error al cargar registro diario:', err);
		}
	}

	// ==========================================================
	// ACCIONES DEL HORARIO (SCHEDULE BLOCKS)
	// ==========================================================
	async function handleToggleComplete(blockId: string) {
		const isCurrentlyCompleted = completedBlockIds.includes(blockId);
		let updated: string[];
		if (isCurrentlyCompleted) {
			updated = completedBlockIds.filter((id) => id !== blockId);
		} else {
			updated = [...completedBlockIds, blockId];
		}
		completedBlockIds = updated;

		try {
			if (isConfigured && user) {
				await supabase.from('daily_logs').upsert(
					{
						user_id: user.id,
						log_date: viewingDate,
						completed_blocks: updated,
						diary_content: diaryContent,
						mood: diaryMood,
						updated_at: new Date().toISOString()
					},
					{ onConflict: 'user_id,log_date' }
				);
			} else {
				const logsMap = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '{}');
				logsMap[viewingDate] = {
					...(logsMap[viewingDate] || {}),
					completed_blocks: updated,
					diary_content: diaryContent,
					mood: diaryMood,
					updated_at: new Date().toISOString()
				};
				localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logsMap));
			}
		} catch (err) {
			console.error('Error al guardar bloque completado:', err);
		}
	}

	async function handleSaveBlock(blockData: Partial<ScheduleBlock>) {
		if (isConfigured && user) {
			if (blockData.id) {
				const { error } = await supabase
					.from('schedule_blocks')
					.update(blockData)
					.eq('id', blockData.id);
				if (!error) {
					blocks = blocks.map((b) => (b.id === blockData.id ? { ...b, ...blockData } : b));
				}
			} else {
				const { data: newBlock, error } = await supabase
					.from('schedule_blocks')
					.insert({
						...blockData,
						user_id: user.id
					})
					.select()
					.single();
				if (!error && newBlock) {
					blocks = [...blocks, newBlock as ScheduleBlock];
				}
			}
		} else {
			if (blockData.id) {
				blocks = blocks.map((b) => (b.id === blockData.id ? { ...b, ...blockData } : b));
			} else {
				const newBlock: ScheduleBlock = {
					id: `demo-block-${Date.now()}`,
					user_id: 'demo-user',
					title: blockData.title || '',
					start_time: blockData.start_time || '09:00',
					end_time: blockData.end_time || '10:00',
					category: blockData.category || 'rutina',
					day_group: blockData.day_group || 'weekdays',
					sort_order: blockData.sort_order || blocks.length + 1
				};
				blocks = [...blocks, newBlock];
			}
			localStorage.setItem(LOCAL_BLOCKS_KEY, JSON.stringify(blocks));
		}
	}

	async function handleDeleteBlock(blockId: string) {
		if (isConfigured && user) {
			await supabase.from('schedule_blocks').delete().eq('id', blockId);
		}
		blocks = blocks.filter((b) => b.id !== blockId);
		if (!isConfigured) {
			localStorage.setItem(LOCAL_BLOCKS_KEY, JSON.stringify(blocks));
		}
	}

	async function handleLoadTemplate() {
		if (isConfigured && user) {
			const toInsert = DEFAULT_SCHEDULE_BLOCKS.map((b) => ({
				...b,
				user_id: user.id
			}));
			const { data: inserted, error } = await supabase
				.from('schedule_blocks')
				.insert(toInsert)
				.select();
			if (!error && inserted) {
				blocks = inserted as ScheduleBlock[];
			}
		} else {
			const template = DEFAULT_SCHEDULE_BLOCKS.map((b, i) => ({
				...b,
				id: `demo-block-${Date.now()}-${i}`,
				user_id: 'demo-user'
			}));
			blocks = template as ScheduleBlock[];
			localStorage.setItem(LOCAL_BLOCKS_KEY, JSON.stringify(blocks));
		}
	}

	// ==========================================================
	// ACCIONES DE NOTAS RÁPIDAS (QUICK NOTES)
	// ==========================================================
	async function handleAddNote(content: string) {
		if (isConfigured && user) {
			const { data: newNote, error } = await supabase
				.from('quick_notes')
				.insert({
					user_id: user.id,
					content,
					is_pinned: false,
					is_archived: false
				})
				.select()
				.single();
			if (!error && newNote) {
				notes = [newNote as QuickNote, ...notes];
			}
		} else {
			const newNote: QuickNote = {
				id: `demo-note-${Date.now()}`,
				user_id: 'demo-user',
				content,
				is_pinned: false,
				is_archived: false,
				created_at: new Date().toISOString()
			};
			notes = [newNote, ...notes];
			localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
		}
	}

	async function handleTogglePin(noteId: string, currentPinned: boolean) {
		const newPinned = !currentPinned;
		notes = notes.map((n) => (n.id === noteId ? { ...n, is_pinned: newPinned } : n));

		if (isConfigured && user) {
			await supabase.from('quick_notes').update({ is_pinned: newPinned }).eq('id', noteId);
		} else {
			localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
		}
	}

	async function handleToggleArchive(noteId: string, currentArchived: boolean) {
		const newArchived = !currentArchived;
		notes = notes.map((n) => (n.id === noteId ? { ...n, is_archived: newArchived } : n));

		if (isConfigured && user) {
			await supabase.from('quick_notes').update({ is_archived: newArchived }).eq('id', noteId);
		} else {
			localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
		}
	}

	async function handleDeleteNote(noteId: string) {
		notes = notes.filter((n) => n.id !== noteId);

		if (isConfigured && user) {
			await supabase.from('quick_notes').delete().eq('id', noteId);
		} else {
			localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
		}
	}

	// ==========================================================
	// ACCIONES DEL DIARIO (DIARY EDITOR)
	// ==========================================================
	async function handleSaveDiary(content: string, mood: string | null) {
		diaryContent = content;
		diaryMood = mood;

		if (isConfigured && user) {
			await supabase.from('daily_logs').upsert(
				{
					user_id: user.id,
					log_date: viewingDate,
					completed_blocks: completedBlockIds,
					diary_content: content,
					mood: mood,
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'user_id,log_date' }
			);
		} else {
			const logsMap = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '{}');
			logsMap[viewingDate] = {
				...(logsMap[viewingDate] || {}),
				completed_blocks: completedBlockIds,
				diary_content: content,
				mood: mood,
				updated_at: new Date().toISOString()
			};
			localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logsMap));
		}
	}

	function goToPreviousDay() {
		viewingDate = shiftDate(viewingDate, -1);
	}

	function goToNextDay() {
		viewingDate = shiftDate(viewingDate, 1);
	}

	function goToToday() {
		viewingDate = getTodayString();
	}
</script>

<div class="space-y-6 pb-12">
	<!-- ======================================================= -->
	<!-- CABECERA: SELECTOR DE FECHA Y NAVEGADOR -->
	<!-- ======================================================= -->
	<section class="cad-frame bg-[#070d0a] rounded-[10px] p-4 sm:p-5 border border-[rgba(255,255,255,0.08)] transition-all">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<!-- Fecha y Estado -->
			<div class="flex items-center gap-3">
				<div class="relative">
					<input
						type="date"
						bind:value={viewingDate}
						class="sr-only"
						id="native-date-picker"
					/>
					<label
						for="native-date-picker"
						class="p-2.5 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] hover:border-[#10b981] hover:shadow-[0_0_8px_rgba(16,185,129,0.2)] cursor-pointer flex items-center justify-center transition-all"
						title="Seleccionar otra fecha"
					>
						<CalendarIcon class="w-4 h-4" />
					</label>
				</div>

				<div>
					<div class="flex items-center gap-2 flex-wrap">
						<h1 class="text-lg sm:text-xl font-bold text-[#f3f4f6] capitalize">
							{formatDisplayDate(viewingDate)}
						</h1>
						{#if isToday(viewingDate)}
							<span class="px-2 py-0.5 rounded-[4px] text-xs font-semibold bg-[#10b981]/15 text-[#10b981] border border-[rgba(16,185,129,0.32)] shadow-[0_0_6px_rgba(16,185,129,0.2)]">
								Hoy
							</span>
						{/if}
						{#if diaryMood}
							<span class="text-sm" title="Estado de ánimo registrado">{diaryMood}</span>
						{/if}
					</div>
					<p class="text-xs text-[#64748b] mt-0.5">
						Planifica tu rutina, anota ideas y reflexiona al final del día
					</p>
				</div>
			</div>

			<!-- Botones de Navegación de Fecha -->
			<div class="flex items-center gap-1.5 self-end sm:self-center text-xs">
				<button
					type="button"
					onclick={goToPreviousDay}
					class="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:border-[rgba(255,255,255,0.16)] transition-all cursor-pointer font-medium"
					title="Día anterior"
				>
					<ChevronLeft class="w-3.5 h-3.5 text-[#10b981]" />
					<span>Ayer</span>
				</button>

				{#if !isToday(viewingDate)}
					<button
						type="button"
						onclick={goToToday}
						class="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] font-semibold bg-[#10b981] text-[#010302] hover:bg-[#34d399] transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
					>
						<RotateCcw class="w-3 h-3 stroke-[3]" />
						Hoy
					</button>
				{/if}

				<button
					type="button"
					onclick={goToNextDay}
					class="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:border-[rgba(255,255,255,0.16)] transition-all cursor-pointer font-medium"
					title="Día siguiente"
				>
					<span>Mañana</span>
					<ChevronRight class="w-3.5 h-3.5 text-[#10b981]" />
				</button>
			</div>
		</div>
	</section>

	<!-- ======================================================= -->
	<!-- DASHBOARD EN 2 COLUMNAS (ESCRITORIO) / 1 COLUMNA (MÓVIL)-->
	<!-- ======================================================= -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
		<!-- COLUMNA IZQUIERDA: BLOQUE 1 - HORARIO DEL DÍA -->
		<div class="lg:col-span-7 space-y-6">
			<ScheduleList
				{blocks}
				{completedBlockIds}
				{viewingDate}
				onToggleComplete={handleToggleComplete}
				onSaveBlock={handleSaveBlock}
				onDeleteBlock={handleDeleteBlock}
				onLoadTemplate={handleLoadTemplate}
			/>
		</div>

		<!-- COLUMNA DERECHA: BLOQUE 2 - NOTAS RÁPIDAS + BLOQUE 3 - DIARIO -->
		<div class="lg:col-span-5 space-y-6">
			<QuickNotes
				{notes}
				onAddNote={handleAddNote}
				onTogglePin={handleTogglePin}
				onToggleArchive={handleToggleArchive}
				onDeleteNote={handleDeleteNote}
			/>

			<DiaryEditor
				{diaryContent}
				mood={diaryMood}
				{viewingDate}
				onSaveDiary={handleSaveDiary}
			/>
		</div>
	</div>
</div>
