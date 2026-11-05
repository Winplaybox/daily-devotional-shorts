import base64
import re
import os

svg_path = os.path.join('public', 'दैनिक पंचांग — 17 अक्टूबर 2026.svg')
with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', content)
if m:
    data = base64.b64decode(m.group(1))
    os.makedirs(os.path.join('public', 'assets'), exist_ok=True)
    out_path = os.path.join('public', 'assets', 'reference-poster.jpg')
    with open(out_path, 'wb') as out:
        out.write(data)
    print('Extracted successfully to', out_path, 'size:', len(data))
else:
    print('Base64 not found')
