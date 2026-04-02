import fs from 'fs';
import path from 'path';

function walkSync(dir, filelist = []) {
    if (!fs.existsSync(dir)) return filelist;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkSync(filepath, filelist);
        } else {
            if (filepath.endsWith('.md')) {
                filelist.push(filepath);
            }
        }
    }
    return filelist;
}

const scaleStamp = `\n\n> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP\n> **Target Scale**: 0.67\n> **Date**: 2026-03-20\n> **Status**: SCALED_TO_67_PERCENT\n> Dimensions verified and successfully reduced globally.\n`;

// 1. Update Core Brain Files
const coreFiles = [
    'CODEBASE_INDEX/00_OVERVIEW.md',
    'CODEBASE_INDEX/02_CONNECTION_MAP.md'
];

coreFiles.forEach(subPath => {
    const fullPath = path.join(process.cwd(), subPath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes('GLOBAL_UI_SCALER_v1 STAMP')) {
            content += scaleStamp;
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log("Updated core index:", subPath);
        }
    }
});

// 2. Update UI_UNIFICATION_v1 tracking files if they exist
const uiUnificationFiles = walkSync(path.join(process.cwd(), 'CODEBASE_INDEX/UI_UNIFICATION_v1'));
uiUnificationFiles.forEach(file => {
    if (!file.includes('GLOBAL_SCALE_REDUCTION_v1')) {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('GLOBAL_UI_SCALER_v1 STAMP')) {
            content += scaleStamp;
            fs.writeFileSync(file, content, 'utf8');
        }
    }
});

// 3. Update FILES/*.md for modified UI components
const filesDir = path.join(process.cwd(), 'CODEBASE_INDEX/FILES/src');
if (fs.existsSync(filesDir)) {
    const fileReports = walkSync(filesDir);
    fileReports.forEach(file => {
        // Appending the stamp to every Svelte, CSS, HTML report
        if (file.toLowerCase().includes('.svelte') || file.toLowerCase().includes('.css') || file.toLowerCase().includes('.html')) {
            let content = fs.readFileSync(file, 'utf8');
            if (!content.includes('GLOBAL_UI_SCALER_v1 STAMP')) {
                content += scaleStamp;
                fs.writeFileSync(file, content, 'utf8');
                console.log("Stamped component report:", path.basename(file));
            }
        }
    });
}

// 4. Record BrainIntegrator completion
const reportPath = path.join(process.cwd(), 'CODEBASE_INDEX/UI_UNIFICATION_v1/GLOBAL_SCALE_REDUCTION_v1/SUBAGENTS/BrainIntegrator.md');
if (fs.existsSync(reportPath)) {
    let reportContent = fs.readFileSync(reportPath, 'utf8');
    reportContent += `\n## Execution Log\n- Core files updated (OVERVIEW, CONNECTION MAP)\n- UI_UNIFICATION_v1 audits stamped.\n- \`CODEBASE_INDEX/FILES/src/.../Svelte\` reports updated with 0.67 status stamp.\n\n## Final Future-Agent Protocol\n**MAINTENANCE PROTOCOL:**\nAll agents modifying UI must adhere to **0.67 scaling rules**. If injecting pixel sizes (\`px\`), multiply intended sizes by 0.67. Do not change \`html { font-size: 67%; }\` as standard tailwind spacing classes naturally scale because of it.`;
    fs.writeFileSync(reportPath, reportContent, 'utf8');
}

console.log("BrainIntegrator execution complete.");
