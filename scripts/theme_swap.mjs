import fs from 'fs';
import path from 'path';

const srcDir = 'c:\\Users\\omen\\Desktop\\Cognivox\\src';

// Replacements: [old, new]
const replacements = [
  // Backgrounds
  ['bg-[#0d1117]', 'bg-white'],
  ['bg-[#0a0c0f]', 'bg-white'],
  ['bg-dark-950', 'bg-white'],
  ['bg-dark-900', 'bg-gray-50'],
  ['bg-dark-800', 'bg-gray-100'],
  ['bg-dark-700', 'bg-gray-200'],
  
  // Cyan → Blue (text)
  ['text-cyan-400', 'text-blue-500'],
  ['text-cyan-500', 'text-blue-600'],
  ['text-cyan-600', 'text-blue-700'],
  ['text-cyan-300', 'text-blue-400'],
  
  // Cyan → Blue (backgrounds)
  ['bg-cyan-500/20', 'bg-blue-50'],
  ['bg-cyan-500/10', 'bg-blue-50'],
  ['bg-cyan-500/15', 'bg-blue-50'],
  ['bg-cyan-500/30', 'bg-blue-100'],
  
  // Cyan → Blue (borders)
  ['border-cyan-500/10', 'border-gray-200'],
  ['border-cyan-500/20', 'border-blue-200'],
  ['border-cyan-500/30', 'border-blue-300'],
  ['border-cyan-500/40', 'border-blue-300'],
  ['border-cyan-500/50', 'border-blue-400'],
  
  // Slate (dark theme) → Gray (light theme)
  ['text-slate-100', 'text-gray-900'],
  ['text-slate-200', 'text-gray-800'],
  ['text-slate-300', 'text-gray-700'],
  ['text-slate-400', 'text-gray-500'],
  ['text-slate-500', 'text-gray-400'],
  ['text-slate-600', 'text-gray-400'],
  
  // Dark backgrounds → Light
  ['bg-slate-900', 'bg-white'],
  ['bg-slate-800', 'bg-gray-50'],
  ['bg-slate-700', 'bg-gray-100'],
  ['bg-slate-700/50', 'bg-gray-50'],
  ['bg-slate-700/60', 'bg-gray-100'],
  ['bg-slate-700/80', 'bg-gray-200'],
  
  // Dark semi-transparent
  ['bg-black/95', 'bg-white'],
  ['bg-black/90', 'bg-white'],
  ['bg-black/80', 'bg-white/95'],
  ['bg-black/50', 'bg-gray-900/50'],
  
  // Green semantic (keep but lighten backgrounds)
  ['bg-green-500/20', 'bg-green-50'],
  ['bg-green-500/10', 'bg-green-50'],
  ['text-green-400', 'text-green-600'],
  ['text-green-300', 'text-green-500'],
  
  // Red semantic (keep but lighten backgrounds)
  ['bg-red-500/20', 'bg-red-50'],
  ['bg-red-500/10', 'bg-red-50'],
  ['bg-red-500/30', 'bg-red-100'],
  ['text-red-400', 'text-red-500'],
  ['text-red-300', 'text-red-600'],
  ['border-red-500/20', 'border-red-200'],
  ['border-red-500/30', 'border-red-300'],
  ['border-red-500/50', 'border-red-300'],
  
  // Yellow/Warning (lighten backgrounds)  
  ['bg-yellow-500/20', 'bg-yellow-50'],
  ['bg-yellow-500/10', 'bg-yellow-50'],
  ['text-yellow-400', 'text-yellow-600'],
  ['text-yellow-300', 'text-yellow-500'],
  ['border-yellow-500/30', 'border-yellow-300'],
  ['border-yellow-500/50', 'border-yellow-300'],
  
  // Orange
  ['bg-orange-500/20', 'bg-orange-50'],
  ['text-orange-400', 'text-orange-600'],
  
  // Purple
  ['bg-purple-500/20', 'bg-purple-50'],
  ['bg-purple-500/10', 'bg-purple-50'],
  ['bg-purple-500/30', 'bg-purple-100'],
  ['text-purple-400', 'text-purple-600'],
  ['text-purple-300', 'text-purple-500'],
  
  // Hover states with cyan → blue
  ['hover:text-cyan-400', 'hover:text-blue-600'],
  ['hover:text-cyan-300', 'hover:text-blue-500'],
  ['hover:bg-cyan-500/10', 'hover:bg-blue-50'],
  ['hover:bg-cyan-500/20', 'hover:bg-blue-100'],
  ['hover:border-cyan-500/20', 'hover:border-blue-200'],
  ['hover:border-cyan-500/30', 'hover:border-blue-300'],
  ['hover:border-cyan-500/40', 'hover:border-blue-300'],
  
  // Hover states for gray → light theme
  ['hover:bg-slate-700/60', 'hover:bg-gray-100'],
  ['hover:bg-slate-700/80', 'hover:bg-gray-200'],
  ['hover:text-slate-300', 'hover:text-gray-800'],
  
  // Shadow
  ['shadow-cyan-500/10', 'shadow-blue-100'],
  ['shadow-lg shadow-cyan-500/10', 'shadow-sm'],
  
  // Specific colors used in inline styles or hex references
  ['#00c8ff', '#3B82F6'],
  ['#0d1117', '#FFFFFF'],
  ['#0a0c0f', '#FFFFFF'],
  ['#161b22', '#F3F4F6'],
  
  // SVG fill colors for graph
  ['fill="#0a0c0f"', 'fill="#FFFFFF"'],
  
  // Glow effects → subtle shadows
  ['shadow-cyan-500/20', 'shadow-blue-100'],
  
  // Ring colors
  ['ring-amber-500/20', 'ring-amber-200'],
  ['ring-1 ring-cyan', 'ring-1 ring-blue'],
  
  // Misc text  
  ['text-amber-300', 'text-amber-700'],
  ['text-amber-500/20', 'text-amber-50'],
];

function findFiles(dir, ext, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== '.svelte-kit' && item !== '.git') {
        findFiles(full, ext, results);
      }
    } else if (item.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const svelteFiles = findFiles(srcDir, '.svelte');
let totalChanges = 0;

for (const file of svelteFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  let fileChanges = 0;
  
  for (const [old, replacement] of replacements) {
    const count = content.split(old).length - 1;
    if (count > 0) {
      content = content.replaceAll(old, replacement);
      fileChanges += count;
    }
  }
  
  if (fileChanges > 0) {
    fs.writeFileSync(file, content, 'utf-8');
    const rel = path.relative(srcDir, file);
    console.log(`  ${rel}: ${fileChanges} replacements`);
    totalChanges += fileChanges;
  }
}

console.log(`\nDone. Total: ${totalChanges} replacements across ${svelteFiles.length} files.`);
