const fs = require('fs');
let content = fs.readFileSync('src/views/WeeklyPlanner.tsx', 'utf8');

const target = `                                  {subTasksTotal > 0 && (
                                    <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                </div>`;

const replacement = `                                  {subTasksTotal > 0 && (
                                    <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                  <TaskTimer task={task} onUpdateTask={onUpdateTask} />
                                </div>`;

content = content.replace(target, replacement);

if (!content.includes("<TaskTimer task={task} onUpdateTask={onUpdateTask} />")) {
  // Try regex
  content = content.replace(
    /{\s*subTasksTotal\s*>\s*0\s*&&\s*\([\s\S]*?<\/span>\s*\)\s*}\s*<\/div>/,
    `{subTasksTotal > 0 && (
                                    <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                  <TaskTimer task={task} onUpdateTask={onUpdateTask} />
                                </div>`
  );
}

fs.writeFileSync('src/views/WeeklyPlanner.tsx', content, 'utf8');
