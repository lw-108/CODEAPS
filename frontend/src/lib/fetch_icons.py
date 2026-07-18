import urllib.request
import re
import os

icons_map = {
    'typescript': 'ts',
    'typescript': 'tsx',
    'php': 'php',
    'go': 'go',
    'ruby': 'rb',
    'swift': 'swift',
    'json': 'json',
    'javascript': 'js',
    'react': 'jsx',
    'python': 'py',
    'rust': 'rs',
    'openjdk': 'java',
}

base_url = 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/{}.svg'

def fetch_path(name):
    url = base_url.format(name)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            match = re.search(r'<path d="([^"]+)"', content)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Failed to fetch {name}: {e}")
    return None

filepath = 'languageMap.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

for name, ext in icons_map.items():
    print(f"Fetching {name} for .{ext}...")
    path_d = fetch_path(name)
    if path_d:
        regex = r'(%s: \{[^}]*icon:\s*)<SVG[^>]*>' % ext
        replacement = r'\g<1><SVG path="%s" />' % path_d
        code = re.sub(regex, replacement, code, count=1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("languageMap.tsx successfully updated with actual logos!")
