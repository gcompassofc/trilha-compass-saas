const fs = require('fs');

let content = fs.readFileSync('src/views/WeeklyPlanner.tsx', 'utf8');

// Add Play and Pause to imports
content = content.replace(
  /import { Plus, CheckCircle2, Circle, Trash2, Search, X, ChevronDown, ChevronRight, ChevronLeft, User2, Calendar, CheckSquare, Square } from 'lucide-react';/,
  "import { Plus, CheckCircle2, Circle, Trash2, Search, X, ChevronDown, ChevronRight, ChevronLeft, User2, Calendar, CheckSquare, Square, Play, Pause } from 'lucide-react';"
);

// Define TaskTimer component right before WeeklyPlanner
const taskTimerCode = `
const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
};

const TaskTimer = ({ task, onUpdateTask }: { task: WeeklyTask, onUpdateTask: (t: WeeklyTask) => void }) => {
  const [now, setNow] = useState(Date.now());

  // Avoid using effect if not running
  if (task.timerStartedAt) {
    // We can use a trick since we can't conditionally call hooks easily: we just pass a function to setTimeout directly or standard useEffect.
  }

  // To comply with hooks rules, always call useEffect
  const isRunning = !!task.timerStartedAt;
  
  // We need to use standard React hooks properly.
  // We'll define it inside the string correctly.
};
`;

const properTaskTimer = `
const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
  return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
};

const TaskTimer = ({ task, onUpdateTask }: { task: WeeklyTask, onUpdateTask: (t: WeeklyTask) => void }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setTick] = useState(0);

  const isRunning = !!task.timerStartedAt;
  const baseTime = task.timeSpent || 0;
  const elapsed = isRunning && task.timerStartedAt ? Math.floor((Date.now() - task.timerStartedAt) / 1000) : 0;
  const totalSeconds = baseTime + elapsed;

  // We only run the interval if the timer is active
  // We don't even need 'now' state, we just force a re-render every second
  if (typeof window !== 'undefined') {
    // Need to use useEffect, but we are inside string builder, so let's write it cleanly
  }
};
`;

const realTaskTimer = `
const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
  return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
};

const TaskTimer = ({ task, onUpdateTask }: { task: WeeklyTask, onUpdateTask: (t: WeeklyTask) => void }) => {
  const [now, setNow] = useState(Date.now());

  import('react').then(React => {
    // this is getting messy, let's just use the outer react import
  });
};
`;

// Let's use standard hooks, React is already imported. Oh wait, useEffect is not imported!
content = content.replace(
  /import { useState } from 'react';/,
  "import { useState, useEffect } from 'react';"
);

const componentCode = `
const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
  return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
};

const TaskTimer = ({ task, onUpdateTask }: { task: WeeklyTask, onUpdateTask: (t: WeeklyTask) => void }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let interval: any;
    if (task.timerStartedAt && !task.completed) {
      interval = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => clearInterval(interval);
  }, [task.timerStartedAt, task.completed]);

  const isRunning = !!task.timerStartedAt && !task.completed;
  const baseTime = task.timeSpent || 0;
  const elapsed = isRunning && task.timerStartedAt ? Math.floor((now - task.timerStartedAt) / 1000) : 0;
  const totalSeconds = baseTime + elapsed;

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.completed) return; // cannot start timer for completed task
    
    if (isRunning) {
      // Stop
      onUpdateTask({ ...task, timerStartedAt: null, timeSpent: totalSeconds });
    } else {
      // Start
      onUpdateTask({ ...task, timerStartedAt: Date.now() });
    }
  };

  return (
    <button 
      onClick={toggleTimer}
      className={\`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono transition-all \${isRunning ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'}\`}
    >
      {isRunning ? <Pause className="w-2.5 h-2.5" fill="currentColor" /> : <Play className="w-2.5 h-2.5" fill="currentColor" />}
      <span>{formatTime(totalSeconds)}</span>
    </button>
  );
};

export default function WeeklyPlanner({ 
`;

content = content.replace(/export default function WeeklyPlanner\(\{\s*/, componentCode);

// Inject into UI
const targetUI = `                                  {subTasksTotal > 0 && (
                                    <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                </div>`;

const replaceUI = `                                  {subTasksTotal > 0 && (
                                    <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                  <TaskTimer task={task} onUpdateTask={onUpdateTask} />
                                </div>`;

content = content.replace(targetUI, replaceUI);

// Also need to stop timer if user toggles task as completed manually
const toggleTaskTarget = `  const toggleTask = (task: WeeklyTask) => {
    onUpdateTask({ ...task, completed: !task.completed });
  };`;

const toggleTaskReplace = `  const toggleTask = (task: WeeklyTask) => {
    const isNowCompleted = !task.completed;
    let updatedTask = { ...task, completed: isNowCompleted };
    
    // Stop timer if completing task while timer is running
    if (isNowCompleted && task.timerStartedAt) {
      const elapsed = Math.floor((Date.now() - task.timerStartedAt) / 1000);
      updatedTask.timeSpent = (task.timeSpent || 0) + elapsed;
      updatedTask.timerStartedAt = null;
    }
    
    onUpdateTask(updatedTask);
  };`;

content = content.replace(toggleTaskTarget, toggleTaskReplace);

fs.writeFileSync('src/views/WeeklyPlanner.tsx', content, 'utf8');
