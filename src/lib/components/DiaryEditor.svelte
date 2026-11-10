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
		{ emoji: '😴', label: 'Cansado' },
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

	let renderedHtml = $derived.by(() => {
		if (!content.trim()) {
			return '<p class="text-[#64748b] text-xs italic">No hay notas escritas para este día. Empieza a escribir en la pestaña "Escribir".</p>';
		}
		try {
			return marked.parse(content, { async: false, breaks: true }) as string;
		} catch {
			return '<p class="text-[#ef4444] text-xs">Error al procesar Markdown</p>';
		}
	});

	let wordCount = $derived(
		content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
	);
	let charCount = $derived(content.length);
</script>

<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5 transition-all">
	<!-- Encabezado -->
	<div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[rgba(255,255,255,0.08)] mb-4">
		<div class="flex items-center gap-2.5">
			<div class="p-2 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981]">
				<BookOpen class="w-4 h-4 stroke-[2.2]" />
			</div>
			<div>
				<h2 class="font-semibold text-sm sm:text-base text-[#f3f4f6]">
					Diario del Día
				</h2>
				<p class="text-xs text-[#64748b]">
					Reflexiones y balance de tu jornada
				</p>
			</div>
		</div>

		<!-- Estado de Autoguardado y Pestañas -->
		<div class="flex items-center gap-2">
			{#if saveStatus === 'pending'}
				<span class="inline-flex items-center gap-1.5 text-xs text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2.5 py-0.5 rounded-[4px]">
					<span class="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse"></span>
					Guardando...
				</span>
			{:else if saveStatus === 'saving'}
				<span class="inline-flex items-center gap-1.5 text-xs text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30 px-2.5 py-0.5 rounded-[4px]">
					<Loader2 class="w-3 h-3 animate-spin" />
					Guardando...
				</span>
			{:else if saveStatus === 'saved'}
				<span class="inline-flex items-center gap-1 text-xs font-medium text-[#10b981] bg-[#10b981]/10 border border-[rgba(16,185,129,0.32)] px-2.5 py-0.5 rounded-[4px]">
					<Check class="w-3 h-3 stroke-[3]" />
					Guardado ✓
				</span>
			{:else if saveStatus === 'error'}
				<span class="inline-flex items-center gap-1 text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 px-2.5 py-0.5 rounded-[4px]">
					Error al guardar
				</span>
			{/if}

			<!-- Selector Escribir / Vista Previa -->
			<div class="flex items-center bg-[#0a120e] p-0.5 rounded-[6px] border border-[rgba(255,255,255,0.08)] text-xs">
				<button
					type="button"
					onclick={() => activeTab = 'write'}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] font-medium transition-all cursor-pointer {activeTab === 'write' ? 'bg-[#0e1813] text-[#10b981] border border-[rgba(16,185,129,0.32)] font-semibold' : 'text-[#9ca3af] hover:text-[#f3f4f6]'}"
				>
					<Edit3 class="w-3 h-3" />
					Escribir
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'preview'}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] font-medium transition-all cursor-pointer {activeTab === 'preview' ? 'bg-[#0e1813] text-[#10b981] border border-[rgba(16,185,129,0.32)] font-semibold' : 'text-[#9ca3af] hover:text-[#f3f4f6]'}"
				>
					<Eye class="w-3 h-3" />
					Vista previa
				</button>
			</div>
		</div>
	</div>

	<!-- Selector de Estado de Ánimo -->
	<div class="flex items-center gap-2 mb-3.5 overflow-x-auto pb-1 text-xs">
		<span class="text-[#64748b] text-xs font-medium flex-shrink-0 flex items-center gap-1">
			<Smile class="w-3.5 h-3.5" />
			Ánimo:
		</span>
		<div class="flex items-center gap-1.5">
			{#each MOOD_OPTIONS as item}
				<button
					type="button"
					onclick={() => handleMoodSelect(item.emoji)}
					title={item.label}
					class="px-2.5 py-1 rounded-[5px] border text-xs transition-all flex items-center gap-1 cursor-pointer
						{selectedMood === item.emoji
							? 'bg-[#0e1813] border-[#10b981] text-[#10b981] font-semibold shadow-[0_0_8px_rgba(16,185,129,0.25)]'
							: 'border-[rgba(255,255,255,0.08)] bg-[#0a120e] text-[#9ca3af] hover:border-[rgba(255,255,255,0.16)] hover:text-[#f3f4f6]'}"
				>
					<span>{item.emoji}</span>
					<span class="text-[11px]">{item.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Modo Edición -->
	{#if activeTab === 'write'}
		<!-- Toolbar de formato rápido -->
		<div class="flex items-center gap-1 mb-2 p-1 bg-[#0a120e] border border-[rgba(255,255,255,0.08)] rounded-[6px] text-[#9ca3af]">
			<button
				type="button"
				onclick={() => insertMarkdown('**', '**')}
				class="p-1.5 rounded-[4px] hover:bg-[#0e1813] hover:text-[#10b981] cursor-pointer"
				title="Negrita (**texto**)"
			>
				<Bold class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('*', '*')}
				class="p-1.5 rounded-[4px] hover:bg-[#0e1813] hover:text-[#10b981] cursor-pointer"
				title="Cursiva (*texto*)"
			>
				<Italic class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('### ')}
				class="p-1.5 rounded-[4px] hover:bg-[#0e1813] hover:text-[#10b981] cursor-pointer"
				title="Encabezado (### Título)"
			>
				<Heading class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('- ')}
				class="p-1.5 rounded-[4px] hover:bg-[#0e1813] hover:text-[#10b981] cursor-pointer"
				title="Lista (- item)"
			>
				<List class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('- [ ] ')}
				class="p-1.5 rounded-[4px] hover:bg-[#0e1813] hover:text-[#10b981] cursor-pointer"
				title="Lista de tareas (- [ ] tarea)"
			>
				<ListTodo class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => insertMarkdown('> ')}
				class="p-1.5 rounded-[4px] hover:bg-[#0e1813] hover:text-[#10b981] cursor-pointer"
				title="Cita (> frase)"
			>
				<Quote class="w-3.5 h-3.5" />
			</button>
			<div class="flex-1"></div>
			<button
				type="button"
				onclick={executeSave}
				class="px-2.5 py-1 text-xs font-medium text-[#10b981] hover:bg-[#10b981]/15 rounded-[4px] transition-colors cursor-pointer"
			>
				Guardar ahora
			</button>
		</div>

		<!-- Área de Escritura -->
		<textarea
			bind:this={textareaEl}
			value={content}
			oninput={handleContentChange}
			placeholder="Escribe tus reflexiones, logros o aprendizajes del día aquí... (Soporta Markdown: negrita, títulos, listas...)"
			rows="12"
			class="w-full p-3.5 text-xs bg-[#070d0a] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] leading-relaxed resize-y focus:outline-none transition-all font-sans"
		></textarea>
	{:else}
		<!-- Vista Previa Renderizada -->
		<div class="min-h-[288px] p-4 bg-[#050a07] border border-[rgba(255,255,255,0.08)] rounded-[6px] overflow-y-auto">
			<div class="prose prose-invert prose-sm max-w-none text-xs text-[#f3f4f6] space-y-2 leading-relaxed">
				{@html renderedHtml}
			</div>
		</div>
	{/if}

	<!-- Barra Inferior -->
	<div class="flex items-center justify-between mt-3 text-xs text-[#64748b]">
		<div class="flex items-center gap-3">
			<span>{wordCount} palabras</span>
			<span>•</span>
			<span>{charCount} caracteres</span>
		</div>
		<div class="text-[#10b981]/80 text-[11px]">
			Autoguardado a los 1.5s
		</div>
	</div>
</div>
