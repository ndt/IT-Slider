async function bundle() {
    const htmlFile = 'src/it-slider.html';
    const cssFile = 'src/style.css';
    const configJs = 'dist/config.js';
    const domainJs = 'dist/domain.js';
    const appJs = 'dist/app.js';
    const outputFile = 'dist/bundle.html';

    try {
        let content = await Deno.readTextFile(htmlFile);

        // Inline CSS
        if (await exists(cssFile)) {
            const cssContent = await Deno.readTextFile(cssFile);
            content = content.replace(
                /<link rel="stylesheet" href="style.css">/,
                `<style>\n${cssContent}\n</style>`
            );
        }

        // Prepare JS content
        async function processJs(filename: string) {
            if (!(await exists(filename))) {
                console.warn(`Warning: ${filename} not found.`);
                return "";
            }
            const text = await Deno.readTextFile(filename);
            const lines = text.split('\n');
            
            const processedLines = lines.map(line => {
                // Skip ESM import statements for inlining
                if (line.trimStart().startsWith('import ')) {
                    return null;
                }
                if (line.trimStart().startsWith('export ')) {
                    // If it's "export default variable;", just skip the whole line
                    if (line.match(/^\s*export\s+default\s+\w+;?\s*$/)) {
                        return null;
                    }
                    // For "export class", "export enum", etc., just remove "export "
                    return line.replace(/^\s*export\s+/, '');
                }
                return line;
            }).filter(line => line !== null);

            return processedLines.join('\n');
        }

        const configContent = await processJs(configJs);
        const domainContent = await processJs(domainJs);
        const appContent = await processJs(appJs);

        // Combine scripts and replace the module script tag
        const combinedJs = `// Bundled Configuration\n${configContent}\n` +
                          `// Bundled Domain Logic\n${domainContent}\n` +
                          `// Bundled App Logic\n${appContent}`;
        
        // Replace the <script type="module" src="../dist/app.js"></script>
        content = content.replace(
            /<script type="module" src="\.\.\/dist\/app.js"><\/script>/,
            `<script>\n${combinedJs}\n</script>`
        );

        await Deno.writeTextFile(outputFile, content);
        console.log(`Successfully bundled into ${outputFile}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
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
    bundle();
}
