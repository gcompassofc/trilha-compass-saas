import { DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const getWeekId = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};

export const getWeekIdFromDateString = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return getWeekId(new Date(year, month - 1, day));
};

export const getDayOfWeekFromDateString = (dateStr: string): DayOfWeek => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return DAYS[d.getDay()];
};

export const getDateForDayOfWeek = (weekId: string, targetDay: DayOfWeek): string => {
  const [year, month, day] = weekId.split('-').map(Number);
  const monday = new Date(year, month - 1, day);
  const targetIndex = DAYS.indexOf(targetDay);
  let offset = targetIndex - 1;
  if (targetIndex === 0) offset = 6;
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + offset);
  return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
};
