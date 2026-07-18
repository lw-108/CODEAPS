import urllib.request
import re

languages = ['typescript', 'php', 'go', 'ruby', 'swift', 'json']
with open('dump.txt', 'w') as f:
    for lang in languages:
        try:
            url = f'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/{lang}.svg'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                content = response.read().decode('utf-8')
                match = re.search(r'<path d="([^"]+)"', content)
                if match:
                    f.write(f"{lang}_PATH = '{match.group(1)}'\n")
        except Exception as e:
            f.write(f"Error {lang}: {e}\n")
