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
	code: string;
	bgClass: string;
	textClass: string;
	borderClass: string;
	dotClass: string;
};

export const CATEGORIES: Record<string, CategoryMeta> = {
	rutina: {
		id: 'rutina',
		label: 'Rutina',
		code: 'SYS.ROUTINE',
		bgClass: 'bg-[#10b981]/10',
		textClass: 'text-[#10b981]',
		borderClass: 'border-[#10b981]/30',
		dotClass: 'bg-[#10b981]'
	},
	estudio: {
		id: 'estudio',
		label: 'Estudio',
		code: 'CORE.STUDY',
		bgClass: 'bg-[#38bdf8]/10',
		textClass: 'text-[#38bdf8]',
		borderClass: 'border-[#38bdf8]/30',
		dotClass: 'bg-[#38bdf8]'
	},
	trabajo: {
		id: 'trabajo',
		label: 'Trabajo',
		code: 'OPS.WORK',
		bgClass: 'bg-[#f59e0b]/10',
		textClass: 'text-[#f59e0b]',
		borderClass: 'border-[#f59e0b]/30',
		dotClass: 'bg-[#f59e0b]'
	},
	entreno: {
		id: 'entreno',
		label: 'Entreno',
		code: 'BIO.PHYS',
		bgClass: 'bg-[#ef4444]/10',
		textClass: 'text-[#ef4444]',
		borderClass: 'border-[#ef4444]/30',
		dotClass: 'bg-[#ef4444]'
	},
	ocio: {
		id: 'ocio',
		label: 'Ocio',
		code: 'SYS.IDLE',
		bgClass: 'bg-[#a78bfa]/10',
		textClass: 'text-[#a78bfa]',
		borderClass: 'border-[#a78bfa]/30',
		dotClass: 'bg-[#a78bfa]'
	}
};
