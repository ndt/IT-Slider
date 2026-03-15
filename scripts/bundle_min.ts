import { minify } from "npm:terser";
import CleanCSS from "npm:clean-css";
import { minify as minifyHtml } from "npm:html-minifier-terser";

async function bundleMin() {
    const htmlFile = 'src/it-slider.html';
    const cssFile = 'src/style.css';
    const configJs = 'dist/config.js';
    const domainJs = 'dist/domain.js';
    const appJs = 'dist/app.js';
    const outputFile = 'dist/bundle.min.html';

    const externalResources = {
        css: [
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
            "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
        ],
        js: [
            "https://cdn.jsdelivr.net/npm/chart.js",
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        ]
    };

    try {
        let htmlContent = await Deno.readTextFile(htmlFile);

        // 1. Process Internal CSS
        let internalCss = "";
        if (await exists(cssFile)) {
            internalCss = await Deno.readTextFile(cssFile);
        }

        // 2. Fetch and Combine External CSS
        let combinedCss = "";
        for (const url of externalResources.css) {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url);
            let cssText = await res.text();

            // Inline fonts for bootstrap-icons
            if (url.includes("bootstrap-icons")) {
                const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
                const matches = cssText.matchAll(/url\((["']?)(.*?)\1\)/g);
                for (const match of matches) {
                    const originalUrl = match[2];
                    if (originalUrl.startsWith("data:")) continue;

                    // Clean the URL (remove query params like ?v=...)
                    const cleanUrl = originalUrl.split("?")[0];
                    const fontUrl = new URL(cleanUrl, baseUrl).toString();

                    console.log(`Fetching and inlining font: ${fontUrl}...`);
                    try {
                        const fontRes = await fetch(fontUrl);
                        const fontBuffer = await fontRes.arrayBuffer();
                        const bytes = new Uint8Array(fontBuffer);
                        let binary = "";
                        const chunkSize = 8192;
                        for (let i = 0; i < bytes.length; i += chunkSize) {
                            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
                        }
                        const base64 = btoa(binary);
                        const mimeType = fontUrl.endsWith(".woff2") ? "font/woff2" :
                                         fontUrl.endsWith(".woff") ? "font/woff" :
                                         "application/octet-stream";
                        
                        cssText = cssText.replace(originalUrl, `data:${mimeType};base64,${base64}`);
                    } catch (e) {
                        console.error(`Failed to inline font ${fontUrl}: ${e.message}`);
                    }
                }
            }
            combinedCss += cssText + "\n";
        }
        combinedCss += internalCss;

        // 3. Minify CSS
        const minifiedCss = new CleanCSS({}).minify(combinedCss).styles;

        // 4. Process Local JS
        async function processLocalJs(filename: string) {
            if (!(await exists(filename))) return "";
            const text = await Deno.readTextFile(filename);
            const lines = text.split('\n');
            const processedLines = lines.map(line => {
                if (line.trimStart().startsWith('import ')) return null;
                if (line.trimStart().startsWith('export ')) {
                    if (line.match(/^\s*export\s+default\s+\w+;?\s*$/)) return null;
                    return line.replace(/^\s*export\s+/, '');
                }
                return line;
            }).filter(line => line !== null);
            return processedLines.join('\n');
        }

        const configContent = await processLocalJs(configJs);
        const domainContent = await processLocalJs(domainJs);
        const appContent = await processLocalJs(appJs);

        // 5. Fetch and Combine External JS
        let combinedJs = "";
        for (const url of externalResources.js) {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url);
            combinedJs += await res.text() + "\n";
        }
        combinedJs += `// Bundled Configuration\n${configContent}\n` +
                      `// Bundled Domain Logic\n${domainContent}\n` +
                      `// Bundled App Logic\n${appContent}`;

        // 6. Minify JS
        console.log("Minifying JS...");
        const terserResult = await minify(combinedJs, {
            compress: true,
            mangle: true
        });
        const minifiedJs = terserResult.code || combinedJs;

        // 7. Assemble HTML
        // Remove existing link/script tags for those we inlined
        htmlContent = htmlContent.replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.0\/dist\/css\/bootstrap\.min\.css">/, "");
        htmlContent = htmlContent.replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap-icons@1\.13\.1\/font\/bootstrap-icons\.min\.css">/, "");
        htmlContent = htmlContent.replace(/<link rel="stylesheet" href="style\.css">/, "");
        htmlContent = htmlContent.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js"><\/script>/, "");
        htmlContent = htmlContent.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.0\/dist\/js\/bootstrap\.bundle\.min\.js"><\/script>/, "");
        htmlContent = htmlContent.replace(/<script type="module" src="\.\.\/dist\/app\.js"><\/script>/, "");

        // Insert inlined minified CSS and JS
        htmlContent = htmlContent.replace("</head>", `<style>${minifiedCss}</style></head>`);
        htmlContent = htmlContent.replace("</body>", `<script>${minifiedJs}</script></body>`);

        // 8. Minify HTML
        console.log("Minifying HTML...");
        const minifiedHtml = await minifyHtml(htmlContent, {
            removeAttributeQuotes: true,
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true
        });

        await Deno.writeTextFile(outputFile, minifiedHtml);
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
    bundleMin();
}
