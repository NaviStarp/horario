export type ScheduleBlock = {
	id: string;
	user_id: string;
	day_group: 'weekdays' | 'weekend' | 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | string;
	start_time: string; // 'HH:MM' or 'HH:MM:SS'
	end_time: string;   // 'HH:MM' or 'HH:MM:SS'
	title: string;
	category: 'rutina' | 'estudio' | 'trabajo' | 'entreno' | 'ocio' | string;
	sort_order: number;
};

export type DailyLog = {
	id: string;
	user_id: string;
	log_date: string; // 'YYYY-MM-DD'
	completed_blocks: string[]; // IDs of schedule_blocks
	custom_adjustments?: Record<string, any>;
	diary_content: string;
	mood?: string | null;
	updated_at?: string;
};

export type QuickNote = {
	id: string;
	user_id: string;
	content: string;
	is_pinned: boolean;
	is_archived: boolean;
	created_at: string;
};

export type CategoryMeta = {
	id: string;
	label: string;
	bgClass: string;
	textClass: string;
	borderClass: string;
	dotClass: string;
};

export const CATEGORIES: Record<string, CategoryMeta> = {
	rutina: {
		id: 'rutina',
		label: 'Rutina',
		bgClass: 'bg-[#10b981]/10',
		textClass: 'text-[#10b981]',
		borderClass: 'border-[#10b981]/30',
		dotClass: 'bg-[#10b981]'
	},
	estudio: {
		id: 'estudio',
		label: 'Estudio',
		bgClass: 'bg-[#38bdf8]/10',
		textClass: 'text-[#38bdf8]',
		borderClass: 'border-[#38bdf8]/30',
		dotClass: 'bg-[#38bdf8]'
	},
	trabajo: {
		id: 'trabajo',
		label: 'Trabajo',
		bgClass: 'bg-[#f59e0b]/10',
		textClass: 'text-[#f59e0b]',
		borderClass: 'border-[#f59e0b]/30',
		dotClass: 'bg-[#f59e0b]'
	},
	entreno: {
		id: 'entreno',
		label: 'Entrenamiento',
		bgClass: 'bg-[#ef4444]/10',
		textClass: 'text-[#ef4444]',
		borderClass: 'border-[#ef4444]/30',
		dotClass: 'bg-[#ef4444]'
	},
	ocio: {
		id: 'ocio',
		label: 'Ocio',
		bgClass: 'bg-[#a78bfa]/10',
		textClass: 'text-[#a78bfa]',
		borderClass: 'border-[#a78bfa]/30',
		dotClass: 'bg-[#a78bfa]'
	}
};

export type CalendarEventType = 'examen' | 'tarea' | 'recordatorio' | 'evento';

export type CalendarEvent = {
	id: string;
	user_id: string;
	title: string;
	event_date: string; // 'YYYY-MM-DD'
	event_time?: string | null; // 'HH:MM'
	category: CalendarEventType | string;
	description?: string;
	is_completed: boolean;
	created_at?: string;
};

export type EventCategoryMeta = {
	id: CalendarEventType;
	label: string;
	badgeClass: string;
	borderClass: string;
	textClass: string;
	bgClass: string;
	dotClass: string;
	iconName: 'GraduationCap' | 'CheckSquare' | 'Bell' | 'Calendar';
};

export const EVENT_CATEGORIES: Record<CalendarEventType, EventCategoryMeta> = {
	examen: {
		id: 'examen',
		label: 'Examen / Prueba',
		badgeClass: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30',
		borderClass: 'border-[#ef4444]/35',
		textClass: 'text-[#ef4444]',
		bgClass: 'bg-[#ef4444]/10',
		dotClass: 'bg-[#ef4444]',
		iconName: 'GraduationCap'
	},
	tarea: {
		id: 'tarea',
		label: 'Tarea / Entrega',
		badgeClass: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
		borderClass: 'border-[#38bdf8]/35',
		textClass: 'text-[#38bdf8]',
		bgClass: 'bg-[#38bdf8]/10',
		dotClass: 'bg-[#38bdf8]',
		iconName: 'CheckSquare'
	},
	recordatorio: {
		id: 'recordatorio',
		label: 'Recordatorio',
		badgeClass: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
		borderClass: 'border-[#f59e0b]/35',
		textClass: 'text-[#f59e0b]',
		bgClass: 'bg-[#f59e0b]/10',
		dotClass: 'bg-[#f59e0b]',
		iconName: 'Bell'
	},
	evento: {
		id: 'evento',
		label: 'Evento / Cita',
		badgeClass: 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30',
		borderClass: 'border-[#a78bfa]/35',
		textClass: 'text-[#a78bfa]',
		bgClass: 'bg-[#a78bfa]/10',
		dotClass: 'bg-[#a78bfa]',
		iconName: 'Calendar'
	}
};
