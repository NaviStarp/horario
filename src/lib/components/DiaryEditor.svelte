<script lang="ts">
	import { onDestroy } from 'svelte';
	import { marked } from 'marked';
	import {
		BookOpen,
		Eye,
		Edit3,
		Check,
		Loader2,
		Bold,
		Italic,
		List,
		ListTodo,
		Heading,
		Quote,
		Smile
	} from 'lucide-svelte';

	let {
		diaryContent = '',
		mood = null,
		viewingDate,
		onSaveDiary
	}: {
		diaryContent: string;
		mood: string | null;
		viewingDate: string;
		onSaveDiary: (content: string, mood: string | null) => Promise<void>;
	} = $props();

	let content = $state('');
	let selectedMood = $state<string | null>(null);
	let activeTab = $state<'write' | 'preview'>('write');
	let saveStatus = $state<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
	let lastSavedAt = $state<Date | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	let debounceTimer: any = null;

	// Sincronizar reactivamente cuando cambian las props
	$effect(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		content = diaryContent;
		selectedMood = mood;
		saveStatus = 'idle';
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});

	const MOOD_OPTIONS = [
		{ emoji: '🚀', label: 'Productivo' },
		{ emoji: '🎯', label: 'Enfocado' },
		{ emoji: '😊', label: 'Bien' },
		{ emoji: '🧘', label: 'Relajado' },
		{ emoji: '🤔', label: 'Reflexivo' },
		{ emoji: '🥱', label: 'Cansado' },
		{ emoji: '😓', label: 'Estresado' }
	];

	function triggerAutosave() {
		saveStatus = 'pending';
		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(async () => {
			await executeSave();
		}, 1500);
	}

	async function executeSave() {
		if (debounceTimer) clearTimeout(debounceTimer);
		saveStatus = 'saving';
		try {
			await onSaveDiary(content, selectedMood);
			saveStatus = 'saved';
			lastSavedAt = new Date();
			setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 3000);
		} catch (err) {
			console.error('Error al guardar diario:', err);
			saveStatus = 'error';
		}
	}

	function handleContentChange(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		content = target.value;
		triggerAutosave();
	}

	function handleMoodSelect(emoji: string) {
		if (selectedMood === emoji) {
			selectedMood = null;
		} else {
			selectedMood = emoji;
		}
		triggerAutosave();
	}

	// Insertar sintaxis Markdown en la posición del cursor
	function insertMarkdown(prefix: string, suffix: string = '') {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const text = textareaEl.value;
		const selectedText = text.substring(start, end);

		const replacement = prefix + selectedText + suffix;
		content = text.substring(0, start) + replacement + text.substring(end);

		triggerAutosave();

		setTimeout(() => {
			if (textareaEl) {
				textareaEl.focus();
				const newCursorPos = start + prefix.length + selectedText.length;
				textareaEl.setSelectionRange(newCursorPos, newCursorPos);
			}
		}, 0);
	}

	// Vista previa Markdown segura con marked
	let renderedHtml = $derived.by(() => {
		if (!content.trim()) {
			return '<p class="text-zinc-400 italic">No hay notas escritas para este día. Empieza a escribir en la pestaña "Escribir".</p>';
		}
		try {
			return marked.parse(content, { async: false, breaks: true }) as string;
		} catch {
			return '<p class="text-rose-500">Error al procesar Markdown</p>';
		}
	});

	let wordCount = $derived(
		content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
	);
	let charCount = $derived(content.length);
</script>

<div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-5 transition-all">
	<!-- Encabezado -->
	<div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
		<div class="flex items-center gap-2">
			<div class="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
				<BookOpen class="w-5 h-5" />
			</div>
			<div>
				<h2 class="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Diario del Día</h2>
				<p class="text-xs text-zinc-500 dark:text-zinc-400">
					Reflexiones, aprendizajes y balance personal
				</p>
			</div>
		</div>

		<!-- Indicador discreto de Autoguardado -->
		<div class="flex items-center gap-2">
			{#if saveStatus === 'pending'}
				<span class="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
					<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
					Pendiente...
				</span>
			{:else if saveStatus === 'saving'}
				<span class="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
					<Loader2 class="w-3 h-3 animate-spin" />
					Guardando...
				</span>
			{:else if saveStatus === 'saved'}
				<span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
					<Check class="w-3 h-3 stroke-[2.5]" />
					Guardado ✓
				</span>
			{:else if saveStatus === 'error'}
				<span class="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full">
					Error al guardar
				</span>
			{/if}

			<!-- Selector de Pestañas: Escribir / Vista Previa -->
			<div class="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
				<button
					type="button"
					onclick={() => activeTab = 'write'}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors {activeTab === 'write' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-600 dark:text-zinc-400'}"
				>
					<Edit3 class="w-3 h-3" />
					Escribir
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'preview'}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors {activeTab === 'preview' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-600 dark:text-zinc-400'}"
				>
					<Eye class="w-3 h-3" />
					Vista previa
				</button>
			</div>
		</div>
	</div>

	<!-- Selector de Estado de Ánimo (Mood) -->
	<div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
		<span class="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
			<Smile class="w-3.5 h-3.5" />
			Ánimo:
		</span>
		<div class="flex items-center gap-1.5">
			{#each MOOD_OPTIONS as item}
				<button
					type="button"
					onclick={() => handleMoodSelect(item.emoji)}
					title={item.label}
					class="px-2.5 py-1 rounded-full border text-xs transition-all flex items-center gap-1 cursor-pointer
						{selectedMood === item.emoji
							? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30 shadow-xs scale-105'
							: 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'}"
				>
					<span>{item.emoji}</span>
					<span class="hidden sm:inline text-[11px]">{item.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Barra de Formato Rápido Markdown (Solo en modo Escribir) -->
	{#if activeTab === 'write'}
		<div class="flex items-center gap-1 mb-2 p-1 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
			<button
				type="button"
				onclick={() => insertMarkdown('**', '**')}
				class="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
				title="Negrita (**texto**)"
				aria-label="Negrita"
			>
				<Bold class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('*', '*')}
				class="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
				title="Cursiva (*texto*)"
				aria-label="Cursiva"
			>
				<Italic class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('### ')}
				class="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
				title="Encabezado (### Título)"
				aria-label="Encabezado"
			>
				<Heading class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('- ')}
				class="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
				title="Lista (- item)"
				aria-label="Lista desordenada"
			>
				<List class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('- [ ] ')}
				class="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
				title="Lista de tareas (- [ ] tarea)"
				aria-label="Lista de tareas"
			>
				<ListTodo class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('> ')}
				class="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
				title="Cita (> frase)"
				aria-label="Cita"
			>
				<Quote class="w-3.5 h-3.5" />
			</button>
			<div class="flex-1"></div>
			<button
				type="button"
				onclick={executeSave}
				class="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
			>
				Guardar ahora
			</button>
		</div>

		<!-- Área de Escritura -->
		<textarea
			bind:this={textareaEl}
			value={content}
			oninput={handleContentChange}
			placeholder="Escribe tus reflexiones del día aquí... ¿Qué logros tuviste hoy? ¿Qué podrías mejorar mañana? (Soporta Markdown: títulos, negritas, listas...)"
			rows="12"
			class="w-full p-4 text-sm bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed resize-y transition-all placeholder-zinc-400"
		></textarea>
	{:else}
		<!-- Vista Previa Renderizada con Markdown -->
		<div class="min-h-[288px] p-5 bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-y-auto">
			<div class="prose prose-sm dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 space-y-2">
				{@html renderedHtml}
			</div>
		</div>
	{/if}

	<!-- Barra inferior con estadísticas -->
	<div class="flex items-center justify-between mt-3 text-xs text-zinc-400 dark:text-zinc-500">
		<div class="flex items-center gap-3">
			<span>{wordCount} palabras</span>
			<span>•</span>
			<span>{charCount} caracteres</span>
		</div>
		<div>
			<span class="text-[11px]">Autoguardado a los 1.5s de inactividad</span>
		</div>
	</div>
</div>
