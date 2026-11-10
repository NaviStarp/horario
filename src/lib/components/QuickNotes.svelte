<script lang="ts">
	import type { QuickNote } from '#lib/types/database';
	import {
		Pin,
		Check,
		Trash2,
		Plus,
		Archive,
		RotateCcw,
		StickyNote,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';

	let {
		notes = [],
		onAddNote,
		onTogglePin,
		onToggleArchive,
		onDeleteNote
	}: {
		notes: QuickNote[];
		onAddNote: (content: string) => Promise<void>;
		onTogglePin: (noteId: string, currentPinned: boolean) => Promise<void>;
		onToggleArchive: (noteId: string, currentArchived: boolean) => Promise<void>;
		onDeleteNote: (noteId: string) => Promise<void>;
	} = $props();

	let newNoteContent = $state('');
	let isAdding = $state(false);
	let showArchived = $state(false);

	let activeNotes = $derived(
		notes
			.filter((n) => !n.is_archived)
			.sort((a, b) => {
				// Pinned primero
				if (a.is_pinned !== b.is_pinned) {
					return a.is_pinned ? -1 : 1;
				}
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			})
	);

	let archivedNotes = $derived(
		notes
			.filter((n) => n.is_archived)
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
	);

	async function handleSubmit() {
		const text = newNoteContent.trim();
		if (!text || isAdding) return;
		isAdding = true;
		try {
			await onAddNote(text);
			newNoteContent = '';
		} finally {
			isAdding = false;
		}
	}

	function formatNoteTime(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('es-ES', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return '';
		}
	}
</script>

<div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-5 transition-all">
	<!-- Encabezado -->
	<div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
		<div class="flex items-center gap-2">
			<div class="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
				<StickyNote class="w-5 h-5" />
			</div>
			<div>
				<h2 class="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Notas Rápidas</h2>
				<p class="text-xs text-zinc-500 dark:text-zinc-400">
					Inbox ágil para capturar ideas al vuelo
				</p>
			</div>
		</div>

		<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
			{activeNotes.length} activas
		</span>
	</div>

	<!-- Input de una línea que guarda al pulsar Enter -->
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="mb-4">
		<div class="relative flex items-center">
			<input
				type="text"
				bind:value={newNoteContent}
				placeholder="+ Añadir nota rápida... (Enter para guardar)"
				disabled={isAdding}
				class="w-full pl-3.5 pr-10 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
			/>
			<button
				type="submit"
				disabled={!newNoteContent.trim() || isAdding}
				class="absolute right-2 p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
				aria-label="Guardar nota rápida"
			>
				<Plus class="w-4 h-4" />
			</button>
		</div>
	</form>

	<!-- Lista de Notas Activas -->
	{#if activeNotes.length === 0}
		<div class="text-center py-6 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
			<p class="text-xs text-zinc-400 dark:text-zinc-500">
				No tienes notas pendientes. ¡Bandeja limpia!
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each activeNotes as note (note.id)}
				<div
					class="group flex items-start justify-between gap-2.5 p-3 rounded-xl border transition-all duration-150
						{note.is_pinned
							? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 shadow-xs'
							: 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}"
				>
					<div class="flex-1 min-w-0 pt-0.5">
						<p class="text-sm text-zinc-800 dark:text-zinc-200 break-words whitespace-pre-wrap leading-relaxed">
							{note.content}
						</p>
						<span class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">
							{formatNoteTime(note.created_at)}
						</span>
					</div>

					<div class="flex items-center gap-1 flex-shrink-0">
						<!-- Botón Fijar / Desfijar -->
						<button
							type="button"
							onclick={() => onTogglePin(note.id, note.is_pinned)}
							class="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors
								{note.is_pinned ? 'text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40' : ''}"
							title={note.is_pinned ? 'Desfijar' : 'Fijar arriba'}
							aria-label={note.is_pinned ? 'Desfijar' : 'Fijar arriba'}
						>
							<Pin class="w-3.5 h-3.5 {note.is_pinned ? 'fill-current' : ''}" />
						</button>

						<!-- Botón Marcar como hecha / Archivar -->
						<button
							type="button"
							onclick={() => onToggleArchive(note.id, false)}
							class="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
							title="Marcar como resuelta / Archivar"
							aria-label="Marcar como resuelta y archivar"
						>
							<Check class="w-3.5 h-3.5 stroke-[2.5]" />
						</button>

						<!-- Botón Borrar -->
						<button
							type="button"
							onclick={() => onDeleteNote(note.id)}
							class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-70 group-hover:opacity-100"
							title="Eliminar definitivamente"
							aria-label="Eliminar nota"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Sección de Notas Archivadas (Colapsable) -->
	{#if archivedNotes.length > 0}
		<div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
			<button
				type="button"
				onclick={() => showArchived = !showArchived}
				class="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-1 transition-colors"
			>
				<span class="inline-flex items-center gap-1.5 font-medium">
					<Archive class="w-3.5 h-3.5" />
					Archivadas ({archivedNotes.length})
				</span>
				{#if showArchived}
					<ChevronUp class="w-3.5 h-3.5" />
				{:else}
					<ChevronDown class="w-3.5 h-3.5" />
				{/if}
			</button>

			{#if showArchived}
				<div class="space-y-1.5 mt-2.5">
					{#each archivedNotes as note (note.id)}
						<div class="flex items-center justify-between gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg text-xs opacity-75 hover:opacity-100 transition-opacity">
							<span class="text-zinc-600 dark:text-zinc-400 line-through truncate flex-1">
								{note.content}
							</span>
							<div class="flex items-center gap-1">
								<button
									type="button"
									onclick={() => onToggleArchive(note.id, true)}
									class="p-1 text-zinc-400 hover:text-indigo-600"
									title="Restaurar a notas activas"
									aria-label="Restaurar nota"
								>
									<RotateCcw class="w-3 h-3" />
								</button>
								<button
									type="button"
									onclick={() => onDeleteNote(note.id)}
									class="p-1 text-zinc-400 hover:text-rose-600"
									title="Eliminar"
									aria-label="Eliminar nota definitivamente"
								>
									<Trash2 class="w-3 h-3" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
