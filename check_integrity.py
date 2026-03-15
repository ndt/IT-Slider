import re
import os

def check_integrity():
    html_path = 'it-slider.html'
    ts_path = 'app.ts'
    
    if not os.path.exists(html_path) or not os.path.exists(ts_path):
        print("Files not found.")
        return

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    with open(ts_path, 'r', encoding='utf-8') as f:
        ts_content = f.read()

    # Find all IDs in HTML
    html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))
    
    # Find all getElementById calls in TS
    ts_ids = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", ts_content))
    
    missing_in_html = ts_ids - html_ids
    
    # Filter out dynamic IDs like slider0, val0, cfgStart0, cfgMax0
    filtered_missing = [id for id in missing_in_html if not any(id.startswith(p) and id[len(p):].isdigit() for p in ['slider', 'val', 'cfgStart', 'cfgMax'])]

    if not filtered_missing:
        print("Integrity check passed (static IDs).")
    else:
        print(f"Missing IDs in HTML: {filtered_missing}")
        exit(1)

if __name__ == "__main__":
    check_integrity()
