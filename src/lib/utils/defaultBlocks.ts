import type { ScheduleBlock } from '../types/database';

export const DEFAULT_SCHEDULE_BLOCKS: Omit<ScheduleBlock, 'id' | 'user_id'>[] = [
	{
		day_group: 'weekdays',
		start_time: '07:30',
		end_time: '08:15',
		title: 'Despertar, hidratación y desayuno',
		category: 'rutina',
		sort_order: 1
	},
	{
		day_group: 'weekdays',
		start_time: '08:15',
		end_time: '09:00',
		title: 'Planificación del día y repaso de metas',
		category: 'rutina',
		sort_order: 2
	},
	{
		day_group: 'weekdays',
		start_time: '09:00',
		end_time: '11:30',
		title: 'Bloque de Estudio / Enfoque profundo 1',
		category: 'estudio',
		sort_order: 3
	},
	{
		day_group: 'weekdays',
		start_time: '11:30',
		end_time: '12:00',
		title: 'Pausa activa y café',
		category: 'ocio',
		sort_order: 4
	},
	{
		day_group: 'weekdays',
		start_time: '12:00',
		end_time: '14:00',
		title: 'Bloque de Trabajo / Desarrollo de proyectos',
		category: 'trabajo',
		sort_order: 5
	},
	{
		day_group: 'weekdays',
		start_time: '14:00',
		end_time: '15:15',
		title: 'Comida y desconexión',
		category: 'rutina',
		sort_order: 6
	},
	{
		day_group: 'weekdays',
		start_time: '15:15',
		end_time: '17:30',
		title: 'Estudio / Tareas secundarias',
		category: 'estudio',
		sort_order: 7
	},
	{
		day_group: 'weekdays',
		start_time: '18:00',
		end_time: '19:30',
		title: 'Entrenamiento físico',
		category: 'entreno',
		sort_order: 8
	},
	{
		day_group: 'weekdays',
		start_time: '20:00',
		end_time: '21:30',
		title: 'Ducha, cena y tiempo libre',
		category: 'ocio',
		sort_order: 9
	},
	{
		day_group: 'weekdays',
		start_time: '22:30',
		end_time: '23:15',
		title: 'Lectura, diario personal y desconexión',
		category: 'rutina',
		sort_order: 10
	},
	// Plantilla fin de semana
	{
		day_group: 'weekend',
		start_time: '09:00',
		end_time: '10:00',
		title: 'Despertar relajado y desayuno con calma',
		category: 'rutina',
		sort_order: 1
	},
	{
		day_group: 'weekend',
		start_time: '10:30',
		end_time: '12:30',
		title: 'Deporte al aire libre / Paseo',
		category: 'entreno',
		sort_order: 2
	},
	{
		day_group: 'weekend',
		start_time: '14:00',
		end_time: '16:00',
		title: 'Comida familiar o con amigos',
		category: 'ocio',
		sort_order: 3
	},
	{
		day_group: 'weekend',
		start_time: '17:00',
		end_time: '19:00',
		title: 'Lectura o aficiones personales',
		category: 'ocio',
		sort_order: 4
	},
	{
		day_group: 'weekend',
		start_time: '21:00',
		end_time: '22:30',
		title: 'Cena y planificación de la semana',
		category: 'rutina',
		sort_order: 5
	}
];
