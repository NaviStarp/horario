export type ScheduleBlock = {
	id: string;
	user_id: string;
	day_group: 'weekdays' | 'weekend' | 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | string;
	start_time: string; // 'HH:MM' or 'HH:MM:SS'
	end_time: string;   // 'HH:MM' or 'HH:MM:SS'
	title: string;
	category: 'estudio' | 'entreno' | 'ocio' | 'rutina' | 'trabajo' | string;
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
		bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
		textClass: 'text-amber-700 dark:text-amber-300',
		borderClass: 'border-amber-500/30',
		dotClass: 'bg-amber-500'
	},
	estudio: {
		id: 'estudio',
		label: 'Estudio',
		bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
		textClass: 'text-blue-700 dark:text-blue-300',
		borderClass: 'border-blue-500/30',
		dotClass: 'bg-blue-500'
	},
	trabajo: {
		id: 'trabajo',
		label: 'Trabajo',
		bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
		textClass: 'text-emerald-700 dark:text-emerald-300',
		borderClass: 'border-emerald-500/30',
		dotClass: 'bg-emerald-500'
	},
	entreno: {
		id: 'entreno',
		label: 'Entreno',
		bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
		textClass: 'text-rose-700 dark:text-rose-300',
		borderClass: 'border-rose-500/30',
		dotClass: 'bg-rose-500'
	},
	ocio: {
		id: 'ocio',
		label: 'Ocio',
		bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
		textClass: 'text-purple-700 dark:text-purple-300',
		borderClass: 'border-purple-500/30',
		dotClass: 'bg-purple-500'
	}
};
