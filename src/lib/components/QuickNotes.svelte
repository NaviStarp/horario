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

<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5 transition-all">
	<!-- Encabezado -->
	<div class="flex items-center justify-between pb-3.5 border-b border-[rgba(255,255,255,0.08)] mb-4">
		<div class="flex items-center gap-2.5">
			<div class="p-2 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981]">
				<StickyNote class="w-4 h-4 stroke-[2.2]" />
			</div>
			<div>
				<h2 class="font-semibold text-sm sm:text-base text-[#f3f4f6]">
					Notas Rápidas
				</h2>
				<p class="text-xs text-[#64748b]">
					Bandeja para capturar ideas al vuelo
				</p>
			</div>
		</div>

		<span class="text-xs px-2.5 py-0.5 rounded-[4px] bg-[#0a120e] border border-[rgba(255,255,255,0.08)] text-[#9ca3af]">
			{activeNotes.length} activas
		</span>
	</div>

	<!-- Input de Captura Rápida -->
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="mb-4">
		<div class="relative flex items-center">
			<input
				type="text"
				bind:value={newNoteContent}
				placeholder="+ Añadir nota rápida... (Enter para guardar)"
				disabled={isAdding}
				class="w-full pl-3.5 pr-10 py-2 text-xs bg-[#0a120e] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none transition-all"
			/>
			<button
				type="submit"
				disabled={!newNoteContent.trim() || isAdding}
				class="absolute right-2 p-1 text-[#64748b] hover:text-[#10b981] disabled:opacity-30 cursor-pointer"
				title="Guardar nota"
				aria-label="Guardar nota"
			>
				<Plus class="w-4 h-4" />
			</button>
		</div>
	</form>

	<!-- Lista de Notas Activas -->
	{#if activeNotes.length === 0}
		<div class="text-center py-6 px-4 border border-dashed border-[rgba(255,255,255,0.08)] rounded-[6px]">
			<p class="text-xs text-[#64748b]">
				No tienes notas pendientes. ¡Bandeja limpia!
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each activeNotes as note (note.id)}
				<div
					class="group flex items-start justify-between gap-2.5 p-3 rounded-[6px] border transition-all duration-150
						{note.is_pinned
							? 'bg-[#0e1813] border-[rgba(16,185,129,0.32)] shadow-[0_0_8px_rgba(16,185,129,0.08)]'
							: 'bg-[#09110d] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'}"
				>
					<div class="flex-1 min-w-0 pt-0.5">
						<p class="text-xs text-[#f3f4f6] break-words whitespace-pre-wrap leading-relaxed">
							{note.content}
						</p>
						<span class="text-[10px] text-[#64748b] mt-1 block">
							{formatNoteTime(note.created_at)}
						</span>
					</div>

					<div class="flex items-center gap-1 flex-shrink-0">
						<!-- Pin -->
						<button
							type="button"
							onclick={() => onTogglePin(note.id, note.is_pinned)}
							class="p-1 rounded-[4px] text-[#64748b] hover:text-[#10b981] hover:bg-[#0a120e] cursor-pointer transition-colors
								{note.is_pinned ? 'text-[#10b981] bg-[#10b981]/10' : ''}"
							title={note.is_pinned ? 'Desfijar' : 'Fijar arriba'}
						>
							<Pin class="w-3.5 h-3.5 {note.is_pinned ? 'fill-current' : ''}" />
						</button>

						<!-- Complete / Archive -->
						<button
							type="button"
							onclick={() => onToggleArchive(note.id, false)}
							class="p-1 rounded-[4px] text-[#64748b] hover:text-[#34d399] hover:bg-[#34d399]/10 cursor-pointer transition-colors"
							title="Marcar como resuelta y archivar"
						>
							<Check class="w-3.5 h-3.5 stroke-[2.5]" />
						</button>

						<!-- Delete -->
						<button
							type="button"
							onclick={() => onDeleteNote(note.id)}
							class="p-1 rounded-[4px] text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 cursor-pointer transition-colors opacity-60 group-hover:opacity-100"
							title="Eliminar"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Archivo de Notas Colapsable -->
	{#if archivedNotes.length > 0}
		<div class="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)]">
			<button
				type="button"
				onclick={() => showArchived = !showArchived}
				class="w-full flex items-center justify-between text-xs text-[#64748b] hover:text-[#9ca3af] py-1 transition-colors cursor-pointer"
			>
				<span class="inline-flex items-center gap-1.5 font-medium">
					<Archive class="w-3.5 h-3.5 text-[#10b981]" />
					Notas archivadas ({archivedNotes.length})
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
						<div class="flex items-center justify-between gap-2 p-2 bg-[#050a07] rounded-[5px] border border-[rgba(255,255,255,0.04)] text-xs opacity-70 hover:opacity-100 transition-opacity">
							<span class="text-[#9ca3af] line-through truncate flex-1">
								{note.content}
							</span>
							<div class="flex items-center gap-1">
								<button
									type="button"
									onclick={() => onToggleArchive(note.id, true)}
									class="p-1 text-[#64748b] hover:text-[#10b981] cursor-pointer"
									title="Restaurar a notas activas"
								>
									<RotateCcw class="w-3 h-3" />
								</button>
								<button
									type="button"
									onclick={() => onDeleteNote(note.id)}
									class="p-1 text-[#64748b] hover:text-[#ef4444] cursor-pointer"
									title="Eliminar definitivamente"
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
