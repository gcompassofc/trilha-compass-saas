import { useState, useEffect, useMemo } from 'react';
import { WeeklyTask } from '../types';

const readArray = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

export function usePlannerFilters(weeklyTasks: WeeklyTask[]) {
  const [selectedUserFilter, setSelectedUserFilter] = useState<string[]>(() =>
    readArray('planner_user_filter')
  );
  const [selectedClientFilter, setSelectedClientFilter] = useState<string[]>(() =>
    readArray('planner_client_filter')
  );

  useEffect(() => {
    localStorage.setItem('planner_user_filter', JSON.stringify(selectedUserFilter));
  }, [selectedUserFilter]);

  useEffect(() => {
    localStorage.setItem('planner_client_filter', JSON.stringify(selectedClientFilter));
  }, [selectedClientFilter]);

  const filteredTasks = useMemo(() => {
    return weeklyTasks.filter(task => {
      if (selectedClientFilter.length > 0) {
        const matchesClient = task.clientId
          ? selectedClientFilter.includes(task.clientId)
          : selectedClientFilter.includes('standalone');
        if (!matchesClient) return false;
      }

      if (selectedUserFilter.length === 0) return true;
      const taskResponsibles = [
        ...(task.responsibles || []),
        ...(task.responsible && !(task.responsibles || []).includes(task.responsible) ? [task.responsible] : [])
      ];
      if (taskResponsibles.length === 0) return true;
      return taskResponsibles.some(r => selectedUserFilter.includes(r));
    });
  }, [weeklyTasks, selectedUserFilter, selectedClientFilter]);

  return {
    selectedUserFilter,
    setSelectedUserFilter,
    selectedClientFilter,
    setSelectedClientFilter,
    filteredTasks,
  };
}
