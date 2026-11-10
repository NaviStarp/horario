/**
 * Helpers para gestión de fechas, horas y detección en tiempo real de bloques horarios.
 */

export function getTodayString(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isToday(dateStr: string): boolean {
	return dateStr === getTodayString();
}

export function shiftDate(dateStr: string, deltaDays: number): string {
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + deltaDays);

	const newYear = date.getFullYear();
	const newMonth = String(date.getMonth() + 1).padStart(2, '0');
	const newDay = String(date.getDate()).padStart(2, '0');
	return `${newYear}-${newMonth}-${newDay}`;
}

const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPANISH_MONTHS = [
	'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
	'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function formatDisplayDate(dateStr: string): string {
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	const dayName = SPANISH_DAYS[date.getDay()];
	const monthName = SPANISH_MONTHS[date.getMonth()];
	return `${dayName}, ${day} de ${monthName}`;
}

export function formatShortDate(dateStr: string): string {
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	const dayName = SPANISH_DAYS[date.getDay()].slice(0, 3);
	return `${dayName} ${day}`;
}

export function getDayGroup(dateStr: string): 'weekdays' | 'weekend' {
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
	return (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekdays';
}

export function formatTimeDisplay(timeStr: string): string {
	if (!timeStr) return '';
	const parts = timeStr.split(':');
	if (parts.length >= 2) {
		return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
	}
	return timeStr;
}

export function timeToMinutes(timeStr: string): number {
	if (!timeStr) return 0;
	const parts = timeStr.split(':');
	const hours = parseInt(parts[0] || '0', 10);
	const minutes = parseInt(parts[1] || '0', 10);
	return hours * 60 + minutes;
}

/**
 * Comprueba si la hora actual cae dentro del bloque de horario indicado.
 * Solo aplica si la fecha visualizada es hoy.
 */
export function isCurrentTimeBlock(startTime: string, endTime: string, viewingDate: string): boolean {
	if (!isToday(viewingDate)) return false;

	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();

	const startMinutes = timeToMinutes(startTime);
	let endMinutes = timeToMinutes(endTime);

	// Si el bloque cruza la medianoche (ej: 23:00 a 01:00)
	if (endMinutes < startMinutes) {
		return currentMinutes >= startMinutes || currentMinutes < endMinutes;
	}

	return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Indica si el bloque horario ya pasó hoy.
 */
export function isPastBlock(endTime: string, viewingDate: string): boolean {
	if (!isToday(viewingDate)) {
		return viewingDate < getTodayString();
	}
	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	return timeToMinutes(endTime) <= currentMinutes;
}
