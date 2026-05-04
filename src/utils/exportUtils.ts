import { Client, WeeklyTask, TeamMember } from '../types';

export const exportClientTasksToCSV = (clients: Client[], teamMembers: TeamMember[]) => {
  const rows = [
    ['Cliente', 'Título', 'Status', 'Prioridade', 'Tipo', 'Responsáveis', 'Data'],
  ];

  clients.forEach(client => {
    client.masterTasks.forEach(task => {
      const responsiblesNames = (task.responsibles || (task.responsible ? [task.responsible] : []))
        .map(id => teamMembers.find(m => m.id === id)?.name || id)
        .join(', ');

      rows.push([
        client.name,
        task.title,
        task.completed ? 'Concluída' : 'Pendente',
        task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Normal' : 'Baixa',
        task.taskType === 'overdelivery' ? 'Overdelivery' : 'Escopo',
        responsiblesNames,
        task.dueDate || 'Sem data'
      ]);
    });
  });

  downloadCSV(rows, 'demandas_clientes.csv');
};

export const exportPlannerTasksToCSV = (weeklyTasks: WeeklyTask[], clients: Client[], teamMembers: TeamMember[], weekId: string) => {
  const rows = [
    ['Semana', 'Dia', 'Cliente', 'Título', 'Status', 'Prioridade', 'Tipo', 'Responsáveis', 'Data'],
  ];

  weeklyTasks.forEach(task => {
    const client = clients.find(c => c.id === task.clientId);
    const clientName = client ? client.name : 'Pontual';
    
    const responsiblesNames = (task.responsibles || (task.responsible ? [task.responsible] : []))
      .map(id => teamMembers.find(m => m.id === id)?.name || id)
      .join(', ');

    rows.push([
      weekId,
      task.day,
      clientName,
      task.title,
      task.completed ? 'Concluída' : 'Pendente',
      task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Normal' : 'Baixa',
      task.taskType === 'overdelivery' ? 'Overdelivery' : 'Escopo',
      responsiblesNames,
      task.dueDate || 'Sem data'
    ]);
  });

  downloadCSV(rows, `planejador_${weekId}.csv`);
};

const downloadCSV = (rows: string[][], filename: string) => {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + rows.map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(";")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
