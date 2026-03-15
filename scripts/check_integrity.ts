async function checkIntegrity() {
    const htmlPath = 'src/it-slider.html';
    const tsPath = 'src/app.ts';
    
    try {
        if (!(await exists(htmlPath)) || !(await exists(tsPath))) {
            console.error("Files not found.");
            Deno.exit(1);
        }

        const htmlContent = await Deno.readTextFile(htmlPath);
        const tsContent = await Deno.readTextFile(tsPath);

        // Find all IDs in HTML
        const htmlIdMatches = htmlContent.matchAll(/id=["']([^"']+)["']/g);
        const htmlIds = new Set([...htmlIdMatches].map(m => m[1]));
        
        // Find all getElementById calls in TS
        const tsIdMatches = tsContent.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g);
        const tsIds = new Set([...tsIdMatches].map(m => m[1]));
        
        const missingInHtml = [...tsIds].filter(id => !htmlIds.has(id));
        
        // Filter out dynamic IDs like slider0, val0, cfgStart0, cfgMax0
        const filteredMissing = missingInHtml.filter(id => {
            const prefixes = ['slider', 'val', 'cfgStart', 'cfgMax'];
            return !prefixes.some(p => id.startsWith(p) && /^\d+$/.test(id.slice(p.length)));
        });

        if (filteredMissing.length === 0) {
            console.log("Integrity check passed (static IDs).");
        } else {
            console.error(`Missing IDs in HTML: ${filteredMissing}`);
            Deno.exit(1);
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
        Deno.exit(1);
    }
}

async function exists(filename: string): Promise<boolean> {
    try {
        await Deno.stat(filename);
        return true;
    } catch {
        return false;
    }
}

if (import.meta.main) {
    checkIntegrity();
}
