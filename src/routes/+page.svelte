<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import type { ScheduleBlock, DailyLog, QuickNote, CalendarEvent } from '#lib/types/database';
	import { DEFAULT_SCHEDULE_BLOCKS } from '#lib/utils/defaultBlocks';
	import { supabase } from '#lib/supabaseClient';
	import {
		getTodayString,
		formatDisplayDate,
		shiftDate,
		isToday,
		getDayGroup
	} from '#lib/utils/timeHelpers';

	import ScheduleList from '#lib/components/ScheduleList.svelte';
	import QuickNotes from '#lib/components/QuickNotes.svelte';
	import DiaryEditor from '#lib/components/DiaryEditor.svelte';
	import DayEventsCard from '#lib/components/DayEventsCard.svelte';
	import CalendarEventModal from '#lib/components/CalendarEventModal.svelte';
	import { auth } from '#lib/auth.svelte';
	import { page } from '$app/state';

	import {
		ChevronLeft,
		ChevronRight,
		Calendar as CalendarIcon,
		CalendarDays,
		RotateCcw,
		Loader2,
		Clock,
		StickyNote,
		BookOpen,
		LayoutGrid
	} from 'lucide-svelte';

	let { data }: PageProps = $props();

	type ViewTab = 'todo' | 'horario' | 'eventos' | 'notas' | 'diario';
	let activeView = $state<ViewTab>('todo');

	let viewingDate = $state(getTodayString());
	let blocks = $state<ScheduleBlock[]>([]);
	let completedBlockIds = $state<string[]>([]);
	let diaryContent = $state<string>('');
	let diaryMood = $state<string | null>(null);
	let notes = $state<QuickNote[]>([]);
	let events = $state<CalendarEvent[]>([]);
	let showEventModal = $state(false);
	let editingEvent = $state<CalendarEvent | null>(null);
	let isLoading = $state(true);

	let isConfigured = $derived(data.isConfigured);
	let user = $derived(auth.user);

	// Métricas calculadas para la barra de resumen rápido y badges
	let autoDayGroup = $derived(getDayGroup(viewingDate));
	let todayBlocks = $derived(
		blocks.filter((b) => b.day_group === 'all' || b.day_group === autoDayGroup)
	);
	let todayCompletedCount = $derived(
		todayBlocks.filter((b) => completedBlockIds.includes(b.id)).length
	);
	let todayBlocksCount = $derived(todayBlocks.length);
	let todayBlocksPercent = $derived(
		todayBlocksCount > 0 ? Math.round((todayCompletedCount / todayBlocksCount) * 100) : 0
	);

	let todayEvents = $derived(events.filter((e) => e.event_date === viewingDate));
	let pendingExamsCount = $derived(
		todayEvents.filter((e) => e.category === 'examen' && !e.is_completed).length
	);
	let activeNotesCount = $derived(notes.filter((n) => !n.is_archived).length);
	let hasDiary = $derived(diaryContent.trim().length > 0 || Boolean(diaryMood));

	const LOCAL_BLOCKS_KEY = 'demo_horario_blocks';
	const LOCAL_LOGS_KEY = 'demo_horario_daily_logs';
	const LOCAL_NOTES_KEY = 'demo_horario_quick_notes';
	const LOCAL_EVENTS_KEY = 'demo_horario_calendar_events';

	$effect(() => {
		const paramDate = page.url.searchParams.get('date');
		if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) && paramDate !== viewingDate) {
			viewingDate = paramDate;
		}
	});

	$effect(() => {
		if (auth.loading) return;
		void user;
		loadAllData(viewingDate);
	});

	// Carga paralela de bloques, notas y registro diario del día seleccionado
	async function loadAllData(targetDate: string) {
		isLoading = true;
		try {
			if (isConfigured && user) {
				const [blocksRes, notesRes, logRes, eventsRes] = await Promise.all([
					supabase
						.from('schedule_blocks')
						.select('*')
						.order('sort_order', { ascending: true })
						.order('start_time', { ascending: true }),
					supabase
						.from('quick_notes')
						.select('*')
						.order('created_at', { ascending: false }),
					supabase
						.from('daily_logs')
						.select('*')
						.eq('log_date', targetDate)
						.maybeSingle(),
					supabase
						.from('calendar_events')
						.select('*')
						.order('event_date', { ascending: true })
						.order('event_time', { ascending: true })
				]);

				if (blocksRes.data) blocks = blocksRes.data as ScheduleBlock[];
				if (notesRes.data) notes = notesRes.data as QuickNote[];

				if (eventsRes.data) {
					events = eventsRes.data as CalendarEvent[];
				} else {
					// Fallback a localStorage si la tabla no está creada aún en Supabase
					const savedEvents = localStorage.getItem(LOCAL_EVENTS_KEY);
					events = savedEvents ? JSON.parse(savedEvents) : [];
				}

				if (logRes.data) {
					completedBlockIds = Array.isArray(logRes.data.completed_blocks) ? logRes.data.completed_blocks : [];
					diaryContent = logRes.data.diary_content || '';
					diaryMood = logRes.data.mood || null;
				} else {
					completedBlockIds = [];
					diaryContent = '';
					diaryMood = null;
				}
			} else {
				// Almacenamiento local para modo demo
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

				const savedEvents = localStorage.getItem(LOCAL_EVENTS_KEY);
				if (savedEvents) {
					events = JSON.parse(savedEvents);
				} else {
					events = [
						{
							id: 'demo-event-1',
							user_id: 'demo-user',
							title: 'Examen de Sistemas Distribuidos',
							category: 'examen',
							event_date: targetDate,
							event_time: '10:00',
							description: 'Temas 1 al 4: microservicios, consistencia y tolerancia a fallos.',
							is_completed: false,
							created_at: new Date().toISOString()
						},
						{
							id: 'demo-event-2',
							user_id: 'demo-user',
							title: 'Entrega de práctica evaluable',
							category: 'tarea',
							event_date: targetDate,
							event_time: '23:59',
							description: 'Subir memoria y enlace al repositorio de GitHub.',
							is_completed: false,
							created_at: new Date().toISOString()
						}
					];
					localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
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
							content: 'Revisar documentación de SvelteKit',
							is_pinned: false,
							is_archived: false,
							created_at: new Date().toISOString()
						}
					];
					localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
				}

				const logsMap = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '{}');
				const log = logsMap[targetDate];
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
			console.error('Error al cargar datos:', err);
		} finally {
			isLoading = false;
		}
	}

	async function switchDate(newDate: string) {
		viewingDate = newDate;
		// Solo cargamos el log del nuevo día si los bloques y notas ya están en memoria
		if (blocks.length > 0) {
			await loadDayOnly(newDate);
		} else {
			await loadAllData(newDate);
		}
	}

	async function loadDayOnly(targetDate: string) {
		try {
			if (isConfigured && user) {
				const { data: log } = await supabase
					.from('daily_logs')
					.select('*')
					.eq('log_date', targetDate)
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
				const log = logsMap[targetDate];
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
			console.error('Error al cargar el día:', err);
		}
	}

	// Gestión de bloques del horario
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
		} else {
			localStorage.setItem(LOCAL_BLOCKS_KEY, JSON.stringify(blocks.filter((b) => b.id !== blockId)));
		}
		blocks = blocks.filter((b) => b.id !== blockId);
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

	// Gestión de notas rápidas
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

	// Gestión del diario
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

	// Gestión de eventos, exámenes y recordatorios
	function handleOpenAddEventModal() {
		editingEvent = null;
		showEventModal = true;
	}

	function handleEditEvent(ev: CalendarEvent) {
		editingEvent = ev;
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
					events = events.map((e) =>
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
					events = [...events, newEv as CalendarEvent];
					return;
				}
			}
		}

		// Fallback a localStorage para modo demo o si la tabla en Supabase no ha sido migrada aún
		const local = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
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
				event_date: eventData.event_date || viewingDate,
				event_time: eventData.event_time || null,
				description: eventData.description || '',
				is_completed: false,
				created_at: new Date().toISOString()
			};
			updatedLocal = [...local, newEv];
		}
		events = updatedLocal;
		localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updatedLocal));
	}

	async function handleToggleCompleteEvent(eventId: string, currentCompleted: boolean) {
		const newStatus = !currentCompleted;
		events = events.map((e) => (e.id === eventId ? { ...e, is_completed: newStatus } : e));

		if (isConfigured && user) {
			const { error } = await supabase
				.from('calendar_events')
				.update({ is_completed: newStatus })
				.eq('id', eventId);
			if (!error) return;
		}

		const local = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
		const updated = local.map((e: CalendarEvent) =>
			e.id === eventId ? { ...e, is_completed: newStatus } : e
		);
		localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updated));
	}

	async function handleDeleteEvent(eventId: string) {
		events = events.filter((e) => e.id !== eventId);

		if (isConfigured && user) {
			const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
			if (!error) return;
		}

		const local = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
		const updated = local.filter((e: CalendarEvent) => e.id !== eventId);
		localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updated));
	}
</script>

<div class="space-y-6 pb-12">
	<!-- Selector de Fecha & Resumen Rápido -->
	<section class="cad-frame bg-[#070d0a] rounded-[10px] p-4 sm:p-5 border border-[rgba(255,255,255,0.08)] transition-all space-y-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<!-- Fecha y selector nativo -->
			<div class="flex items-center gap-3">
				<div class="relative">
					<input
						type="date"
						value={viewingDate}
						onchange={(e) => switchDate((e.target as HTMLInputElement).value)}
						class="sr-only"
						id="native-date-picker"
					/>
					<label
						for="native-date-picker"
						class="w-10 h-10 rounded-[8px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981] hover:border-[#10b981] hover:shadow-[0_0_8px_rgba(16,185,129,0.2)] cursor-pointer flex items-center justify-center transition-all"
						title="Seleccionar otra fecha en el calendario"
					>
						<CalendarIcon class="w-4 h-4 stroke-[2.2]" />
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
							<span class="text-sm px-1.5 py-0.5 rounded-[4px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)]" title="Estado de ánimo registrado">{diaryMood}</span>
						{/if}
					</div>
					<p class="text-xs text-[#64748b] mt-0.5">
						Planifica tu rutina diaria, anota ideas y reflexiona al final del día
					</p>
				</div>
			</div>

			<!-- Botones de navegación de días (Grandes y táctiles para móvil) -->
			<div class="flex items-center gap-2 self-stretch sm:self-center justify-between sm:justify-end text-xs">
				<button
					type="button"
					onclick={() => switchDate(shiftDate(viewingDate, -1))}
					class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:border-[rgba(255,255,255,0.16)] active:scale-95 transition-all cursor-pointer font-medium min-h-[38px]"
					title="Día anterior"
				>
					<ChevronLeft class="w-4 h-4 text-[#10b981]" />
					<span>Ayer</span>
				</button>

				{#if !isToday(viewingDate)}
					<button
						type="button"
						onclick={() => switchDate(getTodayString())}
						class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[6px] font-semibold bg-[#10b981] text-[#010302] hover:bg-[#34d399] active:scale-95 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer min-h-[38px]"
					>
						<RotateCcw class="w-3.5 h-3.5 stroke-[3]" />
						<span>Hoy</span>
					</button>
				{/if}

				<button
					type="button"
					onclick={() => switchDate(shiftDate(viewingDate, 1))}
					class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f3f4f6] hover:border-[rgba(255,255,255,0.16)] active:scale-95 transition-all cursor-pointer font-medium min-h-[38px]"
					title="Día siguiente"
				>
					<span>Mañana</span>
					<ChevronRight class="w-4 h-4 text-[#10b981]" />
				</button>
			</div>
		</div>

		<!-- Mini resumen del día (Chips interactivos con datos clave) -->
		<div class="pt-3 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
			<button
				type="button"
				onclick={() => (activeView = 'horario')}
				class="p-2 rounded-[6px] bg-[#0a120e]/60 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(16,185,129,0.3)] flex items-center justify-between text-left transition-all cursor-pointer {activeView === 'horario' ? 'border-[rgba(16,185,129,0.5)] bg-[#0e1813]' : ''}"
			>
				<span class="text-[#64748b]">Rutina:</span>
				<span class="font-mono font-medium {todayBlocksPercent === 100 && todayBlocksCount > 0 ? 'text-[#10b981]' : 'text-[#f3f4f6]'}">
					{todayCompletedCount}/{todayBlocksCount} ({todayBlocksPercent}%)
				</span>
			</button>

			<button
				type="button"
				onclick={() => (activeView = 'eventos')}
				class="p-2 rounded-[6px] bg-[#0a120e]/60 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(16,185,129,0.3)] flex items-center justify-between text-left transition-all cursor-pointer {activeView === 'eventos' ? 'border-[rgba(16,185,129,0.5)] bg-[#0e1813]' : ''}"
			>
				<span class="text-[#64748b]">Eventos:</span>
				<span class="font-mono font-medium {pendingExamsCount > 0 ? 'text-[#ef4444] font-bold' : 'text-[#f3f4f6]'}">
					{todayEvents.length} hoy {#if pendingExamsCount > 0}⚠️{/if}
				</span>
			</button>

			<button
				type="button"
				onclick={() => (activeView = 'notas')}
				class="p-2 rounded-[6px] bg-[#0a120e]/60 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(16,185,129,0.3)] flex items-center justify-between text-left transition-all cursor-pointer {activeView === 'notas' ? 'border-[rgba(16,185,129,0.5)] bg-[#0e1813]' : ''}"
			>
				<span class="text-[#64748b]">Notas:</span>
				<span class="font-mono font-medium text-[#f3f4f6]">{activeNotesCount} activas</span>
			</button>

			<button
				type="button"
				onclick={() => (activeView = 'diario')}
				class="p-2 rounded-[6px] bg-[#0a120e]/60 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(16,185,129,0.3)] flex items-center justify-between text-left transition-all cursor-pointer {activeView === 'diario' ? 'border-[rgba(16,185,129,0.5)] bg-[#0e1813]' : ''}"
			>
				<span class="text-[#64748b]">Diario:</span>
				<span class="font-medium {hasDiary ? 'text-[#10b981]' : 'text-[#64748b]'}">
					{hasDiary ? 'Escrito ✓' : 'Pendiente'}
				</span>
			</button>
		</div>
	</section>

	<!-- Barra Segmentada de Vistas (Selector rápido para móvil y escritorio) -->
	<nav aria-label="Filtro de secciones del panel" class="flex items-center gap-1.5 p-1 bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] overflow-x-auto">
		<button
			type="button"
			onclick={() => (activeView = 'todo')}
			class="inline-flex items-center gap-2 px-3.5 py-2 rounded-[7px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer min-h-[38px]
				{activeView === 'todo'
					? 'bg-[#0e1813] border border-[rgba(16,185,129,0.4)] text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
					: 'text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e]'}"
		>
			<LayoutGrid class="w-4 h-4 text-[#10b981]" />
			<span>Vista Completa</span>
		</button>

		<button
			type="button"
			onclick={() => (activeView = 'horario')}
			class="inline-flex items-center gap-2 px-3.5 py-2 rounded-[7px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer min-h-[38px]
				{activeView === 'horario'
					? 'bg-[#0e1813] border border-[rgba(16,185,129,0.4)] text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
					: 'text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e]'}"
		>
			<Clock class="w-4 h-4 text-[#10b981]" />
			<span>Horario</span>
			{#if todayBlocksCount > 0}
				<span class="px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono {todayCompletedCount === todayBlocksCount ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#0a120e] text-[#9ca3af]'} border border-[rgba(255,255,255,0.08)]">
					{todayCompletedCount}/{todayBlocksCount}
				</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (activeView = 'eventos')}
			class="inline-flex items-center gap-2 px-3.5 py-2 rounded-[7px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer min-h-[38px]
				{activeView === 'eventos'
					? 'bg-[#0e1813] border border-[rgba(16,185,129,0.4)] text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
					: 'text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e]'}"
		>
			<CalendarDays class="w-4 h-4 text-[#34d399]" />
			<span>Eventos</span>
			{#if todayEvents.length > 0}
				<span class="px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono {pendingExamsCount > 0 ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 font-bold animate-pulse' : 'bg-[#0a120e] text-[#9ca3af] border border-[rgba(255,255,255,0.08)]'}">
					{todayEvents.length}
				</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (activeView = 'notas')}
			class="inline-flex items-center gap-2 px-3.5 py-2 rounded-[7px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer min-h-[38px]
				{activeView === 'notas'
					? 'bg-[#0e1813] border border-[rgba(16,185,129,0.4)] text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
					: 'text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e]'}"
		>
			<StickyNote class="w-4 h-4 text-[#38bdf8]" />
			<span>Notas</span>
			{#if activeNotesCount > 0}
				<span class="px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono bg-[#0a120e] text-[#9ca3af] border border-[rgba(255,255,255,0.08)]">
					{activeNotesCount}
				</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (activeView = 'diario')}
			class="inline-flex items-center gap-2 px-3.5 py-2 rounded-[7px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer min-h-[38px]
				{activeView === 'diario'
					? 'bg-[#0e1813] border border-[rgba(16,185,129,0.4)] text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
					: 'text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#0a120e]'}"
		>
			<BookOpen class="w-4 h-4 text-[#a78bfa]" />
			<span>Diario</span>
			{#if diaryMood}
				<span class="text-xs">{diaryMood}</span>
			{:else if hasDiary}
				<span class="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
			{/if}
		</button>
	</nav>

	<!-- Vista Principal o Animación de Carga -->
	{#if isLoading}
		<!-- Animación de carga y skeleton pulido adaptable a 3 columnas -->
		<div class="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 items-start animate-pulse">
			<div class="lg:col-span-6 xl:col-span-4 bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
				<div class="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.2)] flex items-center justify-center">
							<Loader2 class="w-4 h-4 text-[#10b981] animate-spin" />
						</div>
						<div>
							<div class="h-4 w-28 bg-[#0e1813] rounded"></div>
							<div class="h-3 w-16 bg-[#0a120e] rounded mt-1.5"></div>
						</div>
					</div>
					<div class="h-6 w-20 bg-[#0a120e] rounded"></div>
				</div>

				<div class="h-2 w-full bg-[#0a120e] rounded-full overflow-hidden">
					<div class="h-full w-1/3 bg-[#10b981]/40 rounded-full animate-pulse"></div>
				</div>

				<div class="space-y-2.5 pt-2">
					{#each [1, 2, 3, 4] as _}
						<div class="p-3.5 rounded-[8px] bg-[#09110d] border border-[rgba(255,255,255,0.05)] flex items-center gap-3">
							<div class="w-5 h-5 rounded bg-[#0a120e] border border-[rgba(255,255,255,0.08)]"></div>
							<div class="flex-1 space-y-2">
								<div class="h-3 w-24 bg-[#0e1813] rounded"></div>
								<div class="h-4 w-40 bg-[#0a120e] rounded"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="lg:col-span-6 xl:col-span-4 space-y-6">
				<div class="bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
					<div class="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
						<div class="h-4 w-32 bg-[#0e1813] rounded"></div>
						<div class="h-6 w-16 bg-[#0a120e] rounded"></div>
					</div>
					<div class="h-16 w-full bg-[#09110d] rounded-[6px]"></div>
				</div>

				<div class="bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
					<div class="h-4 w-28 bg-[#0e1813] rounded"></div>
					<div class="h-9 w-full bg-[#0a120e] rounded-[6px]"></div>
					<div class="h-14 w-full bg-[#09110d] rounded-[6px]"></div>
				</div>
			</div>

			<div class="lg:col-span-12 xl:col-span-4 space-y-6">
				<div class="bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
					<div class="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
						<div class="h-4 w-32 bg-[#0e1813] rounded"></div>
						<div class="h-6 w-20 bg-[#0a120e] rounded"></div>
					</div>
					<div class="flex gap-2">
						{#each [1, 2, 3, 4, 5] as _}
							<div class="w-8 h-8 rounded-full bg-[#0a120e]"></div>
						{/each}
					</div>
					<div class="h-44 w-full bg-[#0a120e] rounded-[6px]"></div>
				</div>
			</div>
		</div>
	{:else if activeView === 'todo'}
		<!-- VISTA COMPLETA: 3 Columnas equilibradas en pantallas amplias (Desktop), 2 en medianas, 1 en móvil -->
		<div class="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 items-start">
			<!-- Columna 1: Horario / Rutina Diaria -->
			<div class="lg:col-span-6 xl:col-span-4 space-y-6">
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

			<!-- Columna 2: Eventos del Día & Notas Rápidas -->
			<div class="lg:col-span-6 xl:col-span-4 space-y-6">
				<DayEventsCard
					{events}
					{viewingDate}
					onOpenAddModal={handleOpenAddEventModal}
					onToggleComplete={handleToggleCompleteEvent}
					onEditEvent={handleEditEvent}
					onDeleteEvent={handleDeleteEvent}
				/>

				<QuickNotes
					{notes}
					onAddNote={handleAddNote}
					onTogglePin={handleTogglePin}
					onToggleArchive={handleToggleArchive}
					onDeleteNote={handleDeleteNote}
				/>
			</div>

			<!-- Columna 3: Diario del Día -->
			<div class="lg:col-span-12 xl:col-span-4 space-y-6">
				<DiaryEditor
					{diaryContent}
					mood={diaryMood}
					{viewingDate}
					onSaveDiary={handleSaveDiary}
				/>
			</div>
		</div>
	{:else if activeView === 'horario'}
		<!-- VISTA ENFOCADA: Horario -->
		<div class="max-w-4xl mx-auto space-y-4">
			<div class="flex items-center justify-between px-1">
				<span class="text-xs text-[#9ca3af]">Sección activa: Horario y Rutina</span>
				<button
					type="button"
					onclick={() => (activeView = 'todo')}
					class="text-xs text-[#10b981] hover:underline cursor-pointer"
				>
					← Volver a vista completa
				</button>
			</div>
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
	{:else if activeView === 'eventos'}
		<!-- VISTA ENFOCADA: Eventos y Recordatorios -->
		<div class="max-w-4xl mx-auto space-y-4">
			<div class="flex items-center justify-between px-1">
				<span class="text-xs text-[#9ca3af]">Sección activa: Eventos, Exámenes y Tareas</span>
				<button
					type="button"
					onclick={() => (activeView = 'todo')}
					class="text-xs text-[#10b981] hover:underline cursor-pointer"
				>
					← Volver a vista completa
				</button>
			</div>
			<DayEventsCard
				{events}
				{viewingDate}
				onOpenAddModal={handleOpenAddEventModal}
				onToggleComplete={handleToggleCompleteEvent}
				onEditEvent={handleEditEvent}
				onDeleteEvent={handleDeleteEvent}
			/>
		</div>
	{:else if activeView === 'notas'}
		<!-- VISTA ENFOCADA: Notas Rápidas -->
		<div class="max-w-4xl mx-auto space-y-4">
			<div class="flex items-center justify-between px-1">
				<span class="text-xs text-[#9ca3af]">Sección activa: Bandeja de Notas Rápidas</span>
				<button
					type="button"
					onclick={() => (activeView = 'todo')}
					class="text-xs text-[#10b981] hover:underline cursor-pointer"
				>
					← Volver a vista completa
				</button>
			</div>
			<QuickNotes
				{notes}
				onAddNote={handleAddNote}
				onTogglePin={handleTogglePin}
				onToggleArchive={handleToggleArchive}
				onDeleteNote={handleDeleteNote}
			/>
		</div>
	{:else if activeView === 'diario'}
		<!-- VISTA ENFOCADA: Diario Personal -->
		<div class="max-w-4xl mx-auto space-y-4">
			<div class="flex items-center justify-between px-1">
				<span class="text-xs text-[#9ca3af]">Sección activa: Diario y Reflexión</span>
				<button
					type="button"
					onclick={() => (activeView = 'todo')}
					class="text-xs text-[#10b981] hover:underline cursor-pointer"
				>
					← Volver a vista completa
				</button>
			</div>
			<DiaryEditor
				{diaryContent}
				mood={diaryMood}
				{viewingDate}
				onSaveDiary={handleSaveDiary}
			/>
		</div>
	{/if}
</div>

<!-- Modal para añadir o editar evento desde el panel diario -->
<CalendarEventModal
	show={showEventModal}
	initialDate={viewingDate}
	{editingEvent}
	onSave={handleSaveEvent}
	onClose={() => {
		showEventModal = false;
		editingEvent = null;
	}}
/>
