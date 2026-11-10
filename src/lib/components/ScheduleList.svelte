<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ScheduleBlock } from '#lib/types/database';
	import { CATEGORIES } from '#lib/types/database';
	import {
		formatTimeDisplay,
		isCurrentTimeBlock,
		isPastBlock,
		getDayGroup
	} from '#lib/utils/timeHelpers';
	import {
		Check,
		Edit3,
		Plus,
		Trash2,
		Clock,
		ArrowUp,
		ArrowDown,
		X,
		Sparkles,
		Layers
	} from 'lucide-svelte';

	let {
		blocks = [],
		completedBlockIds = [],
		viewingDate,
		onToggleComplete,
		onSaveBlock,
		onDeleteBlock,
		onLoadTemplate
	}: {
		blocks: ScheduleBlock[];
		completedBlockIds: string[];
		viewingDate: string;
		onToggleComplete: (blockId: string) => void;
		onSaveBlock: (block: Partial<ScheduleBlock>) => Promise<void>;
		onDeleteBlock: (blockId: string) => Promise<void>;
		onLoadTemplate: () => Promise<void>;
	} = $props();

	let isEditing = $state(false);
	let filterGroup = $state<'auto' | 'weekdays' | 'weekend' | 'all'>('auto');
	let clockTicker = $state(Date.now());
	let tickerInterval: any;

	// Formulario para nuevo bloque
	let showNewForm = $state(false);
	let newTitle = $state('');
	let newStartTime = $state('09:00');
	let newEndTime = $state('10:00');
	let newCategory = $state('rutina');
	let newDayGroup = $state<'weekdays' | 'weekend' | 'all'>('weekdays');
	let isSavingNew = $state(false);

	// Bloque en edición inline
	let editingBlockId = $state<string | null>(null);
	let editTitle = $state('');
	let editStartTime = $state('');
	let editEndTime = $state('');
	let editCategory = $state('');
	let editDayGroup = $state('');

	onMount(() => {
		tickerInterval = setInterval(() => {
			clockTicker = Date.now();
		}, 10000);
	});

	onDestroy(() => {
		if (tickerInterval) clearInterval(tickerInterval);
	});

	let autoGroup = $derived(getDayGroup(viewingDate));
	let effectiveFilter = $derived(
		filterGroup === 'auto' ? autoGroup : filterGroup
	);

	let filteredBlocks = $derived.by(() => {
		void clockTicker;
		let list = blocks.filter((b) => {
			if (filterGroup === 'all') return true;
			if (b.day_group === 'all') return true;
			return b.day_group === effectiveFilter;
		});

		return [...list].sort((a, b) => {
			if (a.sort_order !== b.sort_order) {
				return a.sort_order - b.sort_order;
			}
			return a.start_time.localeCompare(b.start_time);
		});
	});

	let totalInView = $derived(filteredBlocks.length);
	let completedInView = $derived(
		filteredBlocks.filter((b) => completedBlockIds.includes(b.id)).length
	);
	let percentCompleted = $derived(
		totalInView > 0 ? Math.round((completedInView / totalInView) * 100) : 0
	);

	function startEditBlock(b: ScheduleBlock) {
		editingBlockId = b.id;
		editTitle = b.title;
		editStartTime = b.start_time.slice(0, 5);
		editEndTime = b.end_time.slice(0, 5);
		editCategory = b.category;
		editDayGroup = b.day_group;
	}

	function cancelInlineEdit() {
		editingBlockId = null;
	}

	async function saveInlineEdit(original: ScheduleBlock) {
		if (!editTitle.trim()) return;
		await onSaveBlock({
			id: original.id,
			title: editTitle.trim(),
			start_time: editStartTime,
			end_time: editEndTime,
			category: editCategory,
			day_group: editDayGroup,
			sort_order: original.sort_order
		});
		editingBlockId = null;
	}

	async function handleCreateNew() {
		if (!newTitle.trim()) return;
		isSavingNew = true;
		try {
			await onSaveBlock({
				title: newTitle.trim(),
				start_time: newStartTime,
				end_time: newEndTime,
				category: newCategory,
				day_group: newDayGroup,
				sort_order: blocks.length + 1
			});
			newTitle = '';
			showNewForm = false;
		} finally {
			isSavingNew = false;
		}
	}

	async function moveBlock(index: number, direction: 'up' | 'down') {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= filteredBlocks.length) return;

		const current = filteredBlocks[index];
		const swap = filteredBlocks[targetIndex];

		const oldCurrentOrder = current.sort_order;
		const oldSwapOrder = swap.sort_order;

		await onSaveBlock({ id: current.id, sort_order: oldSwapOrder });
		await onSaveBlock({ id: swap.id, sort_order: oldCurrentOrder });
	}
</script>

<div class="cad-frame bg-[#070d0a] rounded-[10px] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5 transition-all">
	<!-- Encabezado Técnico -->
	<div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[rgba(255,255,255,0.08)]">
		<div class="flex items-center gap-2.5">
			<div class="p-1.5 rounded-[6px] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] text-[#10b981]">
				<Clock class="w-4 h-4" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h2 class="font-mono font-semibold text-sm tracking-wide text-[#f3f4f6]">
						// SCHEDULE_MATRIX
					</h2>
					<span class="text-[10px] font-mono px-1.5 py-0.2 rounded-[3px] bg-[#0a120e] text-[#10b981] border border-[rgba(16,185,129,0.32)]">
						LIVE
					</span>
				</div>
				<p class="font-mono text-[11px] text-[#64748b] mt-0.5">
					TELEMETRY: {completedInView}/{totalInView} TASKS ({percentCompleted}%)
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => isEditing = !isEditing}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs rounded-[6px] transition-all cursor-pointer
					{isEditing
						? 'bg-[#10b981] text-[#010302] font-semibold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
						: 'bg-[#0a120e] text-[#9ca3af] hover:text-[#f3f4f6] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'}"
			>
				<Edit3 class="w-3.5 h-3.5" />
				{isEditing ? '[ DONE_EDIT ]' : '[ EDIT_BLOCKS ]'}
			</button>
		</div>
	</div>

	<!-- Selector de Filtro en Pista Segmentada (surfacePill #0a120e) -->
	<div class="flex items-center gap-1.5 py-3 overflow-x-auto text-xs font-mono border-b border-[rgba(255,255,255,0.08)] mb-4">
		<span class="text-[#64748b] text-[10px] font-mono tracking-wider mr-1">FILTER:</span>
		<button
			type="button"
			onclick={() => filterGroup = 'auto'}
			class="px-2.5 py-1 rounded-[5px] transition-all cursor-pointer {filterGroup === 'auto' ? 'bg-[#0e1813] border border-[rgba(16,185,129,0.32)] text-[#10b981] font-semibold' : 'text-[#9ca3af] hover:bg-[#0a120e] hover:text-[#f3f4f6]'}"
		>
			AUTO ({autoGroup === 'weekend' ? 'FINDE' : 'SEMANA'})
		</button>
		<button
			type="button"
			onclick={() => filterGroup = 'weekdays'}
			class="px-2.5 py-1 rounded-[5px] transition-all cursor-pointer {filterGroup === 'weekdays' ? 'bg-[#0e1813] border border-[rgba(16,185,129,0.32)] text-[#10b981] font-semibold' : 'text-[#9ca3af] hover:bg-[#0a120e] hover:text-[#f3f4f6]'}"
		>
			LUN-VIE
		</button>
		<button
			type="button"
			onclick={() => filterGroup = 'weekend'}
			class="px-2.5 py-1 rounded-[5px] transition-all cursor-pointer {filterGroup === 'weekend' ? 'bg-[#0e1813] border border-[rgba(16,185,129,0.32)] text-[#10b981] font-semibold' : 'text-[#9ca3af] hover:bg-[#0a120e] hover:text-[#f3f4f6]'}"
		>
			SÁB-DOM
		</button>
		<button
			type="button"
			onclick={() => filterGroup = 'all'}
			class="px-2.5 py-1 rounded-[5px] transition-all cursor-pointer {filterGroup === 'all' ? 'bg-[#0e1813] border border-[rgba(16,185,129,0.32)] text-[#10b981] font-semibold' : 'text-[#9ca3af] hover:bg-[#0a120e] hover:text-[#f3f4f6]'}"
		>
			TODOS
		</button>
	</div>

	<!-- Barra de Progreso OLED Esmeralda -->
	<div class="w-full bg-[#0a120e] border border-[rgba(255,255,255,0.08)] rounded-[4px] h-2 mb-4 p-0.5 overflow-hidden">
		<div
			class="bg-gradient-to-r from-[#10b981] to-[#34d399] h-full rounded-[2px] transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
			style="width: {percentCompleted}%"
		></div>
	</div>

	<!-- Modo Edición: Formulario Añadir Bloque -->
	{#if isEditing}
		<div class="mb-4 p-3.5 bg-[#0a120e] rounded-[8px] border border-dashed border-[rgba(16,185,129,0.32)]">
			{#if !showNewForm}
				<div class="flex flex-wrap items-center justify-between gap-2">
					<button
						type="button"
						onclick={() => showNewForm = true}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold text-[#10b981] bg-[#0e1813] border border-[rgba(16,185,129,0.32)] rounded-[6px] hover:border-[#10b981] transition-all cursor-pointer"
					>
						<Plus class="w-3.5 h-3.5" />
						+ NUEVO BLOQUE HORARIO
					</button>

					{#if blocks.length === 0}
						<button
							type="button"
							onclick={onLoadTemplate}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-medium text-[#34d399] bg-[#0e1813] border border-[rgba(16,185,129,0.32)] rounded-[6px] hover:bg-[#10b981]/20 transition-all cursor-pointer"
						>
							<Sparkles class="w-3.5 h-3.5" />
							CARGAR PLANTILLA BASE
						</button>
					{/if}
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleCreateNew(); }} class="space-y-3 font-mono text-xs">
					<div class="flex items-center justify-between pb-1 border-b border-[rgba(255,255,255,0.08)]">
						<span class="text-[#10b981] font-semibold tracking-wide">// NUEVO BLOQUE</span>
						<button
							type="button"
							onclick={() => showNewForm = false}
							class="text-[#64748b] hover:text-[#f3f4f6]"
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<div>
						<label class="block text-[#9ca3af] mb-1" for="new-title">ACTIVIDAD / TÍTULO</label>
						<input
							id="new-title"
							type="text"
							bind:value={newTitle}
							placeholder="Ej: Estudio intensivo, Deep Work..."
							required
							class="w-full px-3 py-2 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] placeholder-[#64748b] focus:outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-[#9ca3af] mb-1" for="new-start">INICIO</label>
							<input
								id="new-start"
								type="time"
								bind:value={newStartTime}
								required
								class="w-full px-3 py-1.5 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] focus:outline-none"
							/>
						</div>
						<div>
							<label class="block text-[#9ca3af] mb-1" for="new-end">FIN</label>
							<input
								id="new-end"
								type="time"
								bind:value={newEndTime}
								required
								class="w-full px-3 py-1.5 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] focus:outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-[#9ca3af] mb-1" for="new-cat">CATEGORÍA</label>
							<select
								id="new-cat"
								bind:value={newCategory}
								class="w-full px-3 py-1.5 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] focus:outline-none"
							>
								{#each Object.entries(CATEGORIES) as [catKey, cat]}
									<option value={catKey}>{cat.code} ({cat.label})</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-[#9ca3af] mb-1" for="new-group">GRUPO DÍAS</label>
							<select
								id="new-group"
								bind:value={newDayGroup}
								class="w-full px-3 py-1.5 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] focus:border-[#10b981] rounded-[6px] text-[#f3f4f6] focus:outline-none"
							>
								<option value="weekdays">Lunes a Viernes</option>
								<option value="weekend">Sábado y Domingo</option>
								<option value="all">Todos los días</option>
							</select>
						</div>
					</div>

					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={() => showNewForm = false}
							class="px-3 py-1.5 text-[#9ca3af] hover:text-[#f3f4f6]"
						>
							CANCEL
						</button>
						<button
							type="submit"
							disabled={isSavingNew}
							class="px-4 py-1.5 text-[#010302] font-semibold bg-[#10b981] hover:bg-[#34d399] rounded-[6px] shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
						>
							{isSavingNew ? 'SAVING...' : 'COMMIT BLOCK'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Lista de Bloques en Escala Carbón Ultra Profunda -->
	{#if filteredBlocks.length === 0}
		<div class="text-center py-10 px-4 border border-dashed border-[rgba(255,255,255,0.08)] rounded-[8px]">
			<p class="font-mono text-xs text-[#9ca3af] mb-1">// NO_ACTIVE_BLOCKS_FOUND</p>
			<p class="font-mono text-[11px] text-[#64748b] mb-4">
				Pulsa [ EDIT_BLOCKS ] para configurar o cargar la rutina recomendada.
			</p>
			<button
				type="button"
				onclick={onLoadTemplate}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold text-[#10b981] bg-[#0a120e] border border-[rgba(16,185,129,0.32)] rounded-[6px] hover:border-[#10b981] cursor-pointer"
			>
				<Sparkles class="w-3.5 h-3.5" />
				CARGAR RUTINA RECOMENDADA
			</button>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredBlocks as block, index (block.id)}
				{@const isCompleted = completedBlockIds.includes(block.id)}
				{@const isCurrent = isCurrentTimeBlock(block.start_time, block.end_time, viewingDate)}
				{@const isPast = isPastBlock(block.end_time, viewingDate)}
				{@const categoryMeta = CATEGORIES[block.category] || CATEGORIES['rutina']}
				{@const isInlineEditing = editingBlockId === block.id}

				{#if isInlineEditing}
					<!-- Formulario de Modificación -->
					<div class="p-3 bg-[#0e1813] rounded-[8px] border border-[rgba(16,185,129,0.5)] space-y-2.5 font-mono text-xs">
						<div class="flex items-center justify-between text-[#10b981]">
							<span class="font-semibold">// EDIT: {block.title}</span>
							<button type="button" onclick={cancelInlineEdit} class="text-[#64748b] hover:text-[#f3f4f6]">
								<X class="w-4 h-4" />
							</button>
						</div>

						<input
							type="text"
							bind:value={editTitle}
							class="w-full px-2.5 py-1.5 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] rounded-[5px] text-[#f3f4f6]"
						/>

						<div class="grid grid-cols-2 gap-2">
							<div>
								<span class="text-[#64748b] block mb-0.5">INICIO</span>
								<input
									type="time"
									bind:value={editStartTime}
									class="w-full px-2 py-1 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] rounded-[5px] text-[#f3f4f6]"
								/>
							</div>
							<div>
								<span class="text-[#64748b] block mb-0.5">FIN</span>
								<input
									type="time"
									bind:value={editEndTime}
									class="w-full px-2 py-1 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] rounded-[5px] text-[#f3f4f6]"
								/>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-2">
							<div>
								<span class="text-[#64748b] block mb-0.5">CATEGORÍA</span>
								<select
									bind:value={editCategory}
									class="w-full px-2 py-1 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] rounded-[5px] text-[#f3f4f6]"
								>
									{#each Object.entries(CATEGORIES) as [k, cat]}
										<option value={k}>{cat.code}</option>
									{/each}
								</select>
							</div>
							<div>
								<span class="text-[#64748b] block mb-0.5">DÍAS</span>
								<select
									bind:value={editDayGroup}
									class="w-full px-2 py-1 bg-[#070d0a] border border-[rgba(255,255,255,0.08)] rounded-[5px] text-[#f3f4f6]"
								>
									<option value="weekdays">Lunes a Viernes</option>
									<option value="weekend">Fin de semana</option>
									<option value="all">Todos los días</option>
								</select>
							</div>
						</div>

						<div class="flex justify-end gap-2 pt-1">
							<button type="button" onclick={cancelInlineEdit} class="text-[#9ca3af] hover:text-[#f3f4f6]">
								CANCEL
							</button>
							<button
								type="button"
								onclick={() => saveInlineEdit(block)}
								class="px-3 py-1 font-semibold text-[#010302] bg-[#10b981] rounded-[5px]"
							>
								SAVE
							</button>
						</div>
					</div>
				{:else}
					<!-- Fila de Bloque con Estilo Técnico Pulido (Obsidiana + Esmeralda Glow) -->
					<div
						class="group relative flex items-center justify-between gap-3 p-3 rounded-[8px] transition-all duration-150
							{isCurrent
								? 'bg-[#0e1813] border border-[rgba(16,185,129,0.65)] oled-glow ring-1 ring-[rgba(16,185,129,0.4)]'
								: isCompleted
									? 'bg-[#050a07] border border-[rgba(255,255,255,0.04)] opacity-60'
									: 'bg-[#09110d] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] hover:bg-[#0c1611]'}"
					>
						<!-- Checkbox Cuadrado de Precisión (SwayFX radius 4px) -->
						<button
							type="button"
							onclick={() => onToggleComplete(block.id)}
							class="flex-shrink-0 w-5 h-5 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer
								{isCompleted
									? 'bg-[#10b981] border-[#10b981] text-[#010302] shadow-[0_0_8px_rgba(16,185,129,0.4)]'
									: 'border-[rgba(16,185,129,0.32)] bg-[#0a120e] text-transparent hover:border-[#10b981]'}"
							aria-label="Toggle complete"
						>
							<Check class="w-3.5 h-3.5 stroke-[3]" />
						</button>

						<!-- Contenido Central: Monospace Time & CAD Labels -->
						<div
							class="flex-1 min-w-0 cursor-pointer"
							role="button"
							tabindex="0"
							onclick={() => !isEditing && onToggleComplete(block.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									if (!isEditing) onToggleComplete(block.id);
								}
							}}
						>
							<div class="flex items-center gap-2 flex-wrap mb-0.5">
								<span class="font-mono text-xs font-semibold text-[#10b981] tracking-tight">
									{formatTimeDisplay(block.start_time)} &gt; {formatTimeDisplay(block.end_time)}
								</span>

								{#if isCurrent}
									<span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[3px] font-mono text-[10px] font-bold bg-[#10b981] text-[#010302] shadow-[0_0_8px_#10b981] animate-pulse">
										<span class="w-1.5 h-1.5 rounded-full bg-[#010302]"></span>
										AHORA // ACTIVE
									</span>
								{/if}

								<span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[3px] font-mono text-[10px] font-medium {categoryMeta.bgClass} {categoryMeta.textClass} border {categoryMeta.borderClass}">
									<span class="w-1 h-1 rounded-full {categoryMeta.dotClass}"></span>
									{categoryMeta.code}
								</span>
							</div>

							<p class="text-sm font-medium text-[#f3f4f6] truncate transition-all {isCompleted ? 'line-through text-[#64748b]' : ''}">
								{block.title}
							</p>
						</div>

						<!-- Acciones en Modo Edición -->
						{#if isEditing}
							<div class="flex items-center gap-1 flex-shrink-0 font-mono">
								<button
									type="button"
									disabled={index === 0}
									onclick={() => moveBlock(index, 'up')}
									class="p-1 text-[#64748b] hover:text-[#f3f4f6] disabled:opacity-20 cursor-pointer"
								>
									<ArrowUp class="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									disabled={index === filteredBlocks.length - 1}
									onclick={() => moveBlock(index, 'down')}
									class="p-1 text-[#64748b] hover:text-[#f3f4f6] disabled:opacity-20 cursor-pointer"
								>
									<ArrowDown class="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onclick={() => startEditBlock(block)}
									class="p-1 text-[#10b981] hover:text-[#34d399] cursor-pointer"
								>
									<Edit3 class="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onclick={() => {
										if (confirm(`¿Eliminar bloque "${block.title}"?`)) {
											onDeleteBlock(block.id);
										}
									}}
									class="p-1 text-[#ef4444] hover:text-[#f87171] cursor-pointer"
								>
									<Trash2 class="w-3.5 h-3.5" />
								</button>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
