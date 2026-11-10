<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ScheduleBlock } from '#lib/types/database';
	import { CATEGORIES } from '#lib/types/database';
	import {
		formatTimeDisplay,
		isCurrentTimeBlock,
		isPastBlock,
		getDayGroup,
		isToday
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
		Tag
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
		// Actualizar el reloj cada 15 segundos para el indicador en tiempo real
		tickerInterval = setInterval(() => {
			clockTicker = Date.now();
		}, 15000);
	});

	onDestroy(() => {
		if (tickerInterval) clearInterval(tickerInterval);
	});

	// Determina qué grupo corresponde a la fecha actual si está en 'auto'
	let autoGroup = $derived(getDayGroup(viewingDate));

	let effectiveFilter = $derived(
		filterGroup === 'auto' ? autoGroup : filterGroup
	);

	// Filtra y ordena los bloques
	let filteredBlocks = $derived.by(() => {
		// Accedemos a clockTicker para que se re-evalúe reactivamente si cambia el minuto
		void clockTicker;

		let list = blocks.filter((b) => {
			if (filterGroup === 'all') return true;
			if (b.day_group === 'all') return true;
			return b.day_group === effectiveFilter;
		});

		// Ordenar por start_time o sort_order
		return [...list].sort((a, b) => {
			if (a.sort_order !== b.sort_order) {
				return a.sort_order - b.sort_order;
			}
			return a.start_time.localeCompare(b.start_time);
		});
	});

	// Progreso completado
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
				sort_order: (blocks.length + 1)
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

<div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-5 transition-all">
	<!-- Encabezado de la Sección -->
	<div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
		<div class="flex items-center gap-2">
			<div class="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
				<Clock class="w-5 h-5" />
			</div>
			<div>
				<h2 class="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Horario del Día</h2>
				<p class="text-xs text-zinc-500 dark:text-zinc-400">
					{completedInView} de {totalInView} completados ({percentCompleted}%)
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => isEditing = !isEditing}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
					{isEditing
						? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
						: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
			>
				<Edit3 class="w-3.5 h-3.5" />
				{isEditing ? 'Listo' : 'Editar Horario'}
			</button>
		</div>
	</div>

	<!-- Barra de Filtros / Selector de Vista -->
	<div class="flex items-center gap-1.5 py-3 overflow-x-auto text-xs border-b border-zinc-100 dark:border-zinc-800 mb-4">
		<span class="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium mr-1 uppercase tracking-wider">Filtro:</span>
		<button
			type="button"
			onclick={() => filterGroup = 'auto'}
			class="px-2.5 py-1 rounded-md transition-colors {filterGroup === 'auto' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
		>
			Auto ({autoGroup === 'weekend' ? 'Finde' : 'Semana'})
		</button>
		<button
			type="button"
			onclick={() => filterGroup = 'weekdays'}
			class="px-2.5 py-1 rounded-md transition-colors {filterGroup === 'weekdays' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
		>
			Lun-Vie
		</button>
		<button
			type="button"
			onclick={() => filterGroup = 'weekend'}
			class="px-2.5 py-1 rounded-md transition-colors {filterGroup === 'weekend' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
		>
			Sáb-Dom
		</button>
		<button
			type="button"
			onclick={() => filterGroup = 'all'}
			class="px-2.5 py-1 rounded-md transition-colors {filterGroup === 'all' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
		>
			Todos
		</button>
	</div>

	<!-- Barra de Progreso Visual -->
	<div class="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-1.5 mb-4 overflow-hidden">
		<div
			class="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out"
			style="width: {percentCompleted}%"
		></div>
	</div>

	<!-- Modo Edición: Botón para Añadir Bloque -->
	{#if isEditing}
		<div class="mb-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
			{#if !showNewForm}
				<div class="flex flex-wrap items-center justify-between gap-2">
					<button
						type="button"
						onclick={() => showNewForm = true}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
					>
						<Plus class="w-4 h-4" />
						Añadir nuevo bloque
					</button>

					{#if blocks.length === 0}
						<button
							type="button"
							onclick={onLoadTemplate}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
						>
							<Sparkles class="w-4 h-4" />
							Cargar rutina recomendada
						</button>
					{/if}
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleCreateNew(); }} class="space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Nuevo Bloque Horario</h3>
						<button
							type="button"
							onclick={() => showNewForm = false}
							class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
							aria-label="Cerrar formulario"
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<div>
						<label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" for="new-title">Título de la actividad</label>
						<input
							id="new-title"
							type="text"
							bind:value={newTitle}
							placeholder="Ej: Estudio intensivo, Gimnasio, Desayuno..."
							required
							class="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" for="new-start">Hora Inicio</label>
							<input
								id="new-start"
								type="time"
								bind:value={newStartTime}
								required
								class="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
							/>
						</div>
						<div>
							<label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" for="new-end">Hora Fin</label>
							<input
								id="new-end"
								type="time"
								bind:value={newEndTime}
								required
								class="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" for="new-cat">Categoría</label>
							<select
								id="new-cat"
								bind:value={newCategory}
								class="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
							>
								{#each Object.entries(CATEGORIES) as [catKey, cat]}
									<option value={catKey}>{cat.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" for="new-group">Días</label>
							<select
								id="new-group"
								bind:value={newDayGroup}
								class="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
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
							class="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isSavingNew}
							class="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
						>
							{isSavingNew ? 'Guardando...' : 'Crear Bloque'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Lista de Bloques Horarios -->
	{#if filteredBlocks.length === 0}
		<div class="text-center py-10 px-4">
			<div class="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
				<Clock class="w-6 h-6" />
			</div>
			<p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">No hay bloques para esta vista</p>
			<p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mb-4">
				Pulsa "Editar Horario" para crear tus primeros bloques o carga la plantilla recomendada.
			</p>
			<button
				type="button"
				onclick={onLoadTemplate}
				class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
			>
				<Sparkles class="w-4 h-4" />
				Cargar plantilla de rutina inicial
			</button>
		</div>
	{:else}
		<div class="space-y-2.5">
			{#each filteredBlocks as block, index (block.id)}
				{@const isCompleted = completedBlockIds.includes(block.id)}
				{@const isCurrent = isCurrentTimeBlock(block.start_time, block.end_time, viewingDate)}
				{@const isPast = isPastBlock(block.end_time, viewingDate)}
				{@const categoryMeta = CATEGORIES[block.category] || CATEGORIES['rutina']}
				{@const isInlineEditing = editingBlockId === block.id}

				{#if isInlineEditing}
					<!-- Formulario de Edición en Línea -->
					<div class="p-3 bg-zinc-50 dark:bg-zinc-800/70 rounded-xl border border-indigo-400 dark:border-indigo-500 shadow-sm space-y-2.5">
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Modificar bloque</span>
							<button
								type="button"
								onclick={cancelInlineEdit}
								class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
								aria-label="Cancelar edición"
							>
								<X class="w-4 h-4" />
							</button>
						</div>

						<input
							type="text"
							bind:value={editTitle}
							class="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
						/>

						<div class="grid grid-cols-2 gap-2 text-xs">
							<div>
								<label class="text-zinc-500 mb-0.5 block" for="edit-start-{block.id}">Inicio</label>
								<input
									id="edit-start-{block.id}"
									type="time"
									bind:value={editStartTime}
									class="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
								/>
							</div>
							<div>
								<label class="text-zinc-500 mb-0.5 block" for="edit-end-{block.id}">Fin</label>
								<input
									id="edit-end-{block.id}"
									type="time"
									bind:value={editEndTime}
									class="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
								/>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-2 text-xs">
							<div>
								<label class="text-zinc-500 mb-0.5 block" for="edit-cat-{block.id}">Categoría</label>
								<select
									id="edit-cat-{block.id}"
									bind:value={editCategory}
									class="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
								>
									{#each Object.entries(CATEGORIES) as [k, cat]}
										<option value={k}>{cat.label}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="text-zinc-500 mb-0.5 block" for="edit-group-{block.id}">Grupo de Días</label>
								<select
									id="edit-group-{block.id}"
									bind:value={editDayGroup}
									class="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
								>
									<option value="weekdays">Lunes a Viernes</option>
									<option value="weekend">Fin de semana</option>
									<option value="all">Todos los días</option>
								</select>
							</div>
						</div>

						<div class="flex justify-end gap-2 pt-1">
							<button
								type="button"
								onclick={cancelInlineEdit}
								class="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-700"
							>
								Cancelar
							</button>
							<button
								type="button"
								onclick={() => saveInlineEdit(block)}
								class="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
							>
								Guardar cambios
							</button>
						</div>
					</div>
				{:else}
					<!-- Fila normal de Bloque Horario -->
					<div
						class="group relative flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-200
							{isCurrent
								? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
								: isCompleted
									? 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 opacity-75'
									: 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/80'}"
					>
						<!-- Check interactivo (Optimistic UI) -->
						<button
							type="button"
							onclick={() => onToggleComplete(block.id)}
							class="flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500
								{isCompleted
									? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
									: 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-500 dark:hover:border-indigo-400 text-transparent'}"
							aria-label={isCompleted ? `Marcar ${block.title} como pendiente` : `Marcar ${block.title} como completado`}
						>
							<Check class="w-4 h-4 stroke-[3]" />
						</button>

						<!-- Contenido Central: Horas, Título, Categoría -->
						<div
							class="flex-1 min-w-0 cursor-pointer"
							role="button"
							tabindex="0"
							onclick={() => !isEditing && onToggleComplete(block.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									if (!isEditing) onToggleComplete(block.id);
								}
							}}
						>
							<div class="flex items-center gap-2 flex-wrap mb-1">
								<span class="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
									{formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
								</span>

								{#if isCurrent}
									<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white animate-pulse">
										<span class="w-1.5 h-1.5 rounded-full bg-white"></span>
										Ahora
									</span>
								{/if}

								<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium {categoryMeta.bgClass} {categoryMeta.textClass} border {categoryMeta.borderClass}">
									<span class="w-1.5 h-1.5 rounded-full {categoryMeta.dotClass}"></span>
									{categoryMeta.label}
								</span>
							</div>

							<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate transition-all {isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}">
								{block.title}
							</p>
						</div>

						<!-- Acciones en Modo Edición -->
						{#if isEditing}
							<div class="flex items-center gap-1 flex-shrink-0">
								<button
									type="button"
									disabled={index === 0}
									onclick={() => moveBlock(index, 'up')}
									class="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20"
									aria-label="Subir orden"
								>
									<ArrowUp class="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									disabled={index === filteredBlocks.length - 1}
									onclick={() => moveBlock(index, 'down')}
									class="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20"
									aria-label="Bajar orden"
								>
									<ArrowDown class="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onclick={() => startEditBlock(block)}
									class="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
									aria-label="Editar bloque"
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
									class="p-1 text-rose-500 hover:text-rose-700"
									aria-label="Eliminar bloque"
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
