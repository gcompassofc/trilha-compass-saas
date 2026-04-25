const fs = require('fs');
const path = 'src/views/ClientManagement.tsx';

let content = fs.readFileSync(path, 'utf8');

// Replace {client.logo} inside the client loop
content = content.replace(
  /{client\.logo}\r?\n\s*<\/div>\r?\n\s*<div className="text-left">/g,
  "{client.logoUrl ? <img src={client.logoUrl} className=\"w-full h-full object-cover\" /> : client.logo}\n                  </div>\n                  <div className=\"text-left\">"
);

// Add overflow-hidden to the sidebar icon div
content = content.replace(
  /className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white\/5 transition-all group-hover:scale-110"/g,
  'className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5 transition-all group-hover:scale-110 overflow-hidden"'
);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated ClientManagement.tsx successfully.");
