const fs = require('fs');
const path = 'src/views/ClientManagement.tsx';

let content = fs.readFileSync(path, 'utf8');

const target = `                  <div \n                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5 transition-all group-hover:scale-110"\n                    style={{ backgroundColor: \`\${client.color}20\`, color: client.color, boxShadow: selectedClientId === client.id ? \`0 0 15px \${client.color}40\` : 'none' }}\n                  >\n                    {client.logo}\n                  </div>`;

const replacement = `                  <div \n                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5 transition-all group-hover:scale-110 overflow-hidden"\n                    style={{ backgroundColor: \`\${client.color}20\`, color: client.color, boxShadow: selectedClientId === client.id ? \`0 0 15px \${client.color}40\` : 'none' }}\n                  >\n                    {client.logoUrl ? <img src={client.logoUrl} className="w-full h-full object-cover" /> : client.logo}\n                  </div>`;

if(content.includes("{client.logo}")) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Success");
} else {
  console.log("String not found");
}
