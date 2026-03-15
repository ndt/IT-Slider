import re
import os

def bundle():
    # File paths
    html_file = 'it-slider.html'
    css_file = 'style.css'
    config_js = 'config.js'
    domain_js = 'domain.js'
    app_js = 'app.js'
    output_file = 'bundle.html'

    if not os.path.exists(html_file):
        print(f"Error: {html_file} not found.")
        return

    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inline CSS
    if os.path.exists(css_file):
        with open(css_file, 'r', encoding='utf-8') as f:
            css_content = f.read()
        content = re.sub(
            r'<link rel="stylesheet" href="style.css">',
            f'<style>\n{css_content}\n</style>',
            content
        )

    # Prepare JS content
    # Note: The app.js is a module that imports from domain.js and config.js.
    # Inlining them directly while preserving 'import' statements won't work 
    # in a single file without a bundler.
    # We will strip the import/export statements and combine them.

    def process_js(filename):
        if not os.path.exists(filename):
            print(f"Warning: {filename} not found.")
            return ""
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        processed_lines = []
        for line in lines:
            # Skip ESM import/export statements for inlining
            if line.startswith('import '):
                continue
            if line.startswith('export '):
                # If it's "export default variable;", just skip the whole line
                if re.match(r'^export\s+default\s+\w+;?\s*$', line):
                    continue
                # For "export class", "export enum", etc., just remove "export "
                line = re.sub(r'^export\s+', '', line)
            processed_lines.append(line)
        return "".join(processed_lines)

    config_content = process_js(config_js)
    domain_content = process_js(domain_js)
    app_content = process_js(app_js)

    # Combine scripts and replace the module script tag
    combined_js = f"// Bundled Configuration\n{config_content}\n" \
                  f"// Bundled Domain Logic\n{domain_content}\n" \
                  f"// Bundled App Logic\n{app_content}"
    
    # Replace the <script type="module" src="app.js"></script>
    content = re.sub(
        r'<script type="module" src="app.js"></script>',
        f'<script>\n{combined_js}\n</script>',
        content
    )

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Successfully bundled into {output_file}")

if __name__ == "__main__":
    bundle()
