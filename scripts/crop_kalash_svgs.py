import xml.etree.ElementTree as ET

# Read the original kalash vector file
tree = ET.parse('public/vecteezy_free-kalash-vector_109001.svg')
root = tree.getroot()
ns = {'svg': 'http://www.w3.org/2000/svg'}
style = root.find('svg:style', ns)
groups = [c for c in root if c.tag.endswith('g')]

boxes = [
    ("kalash_v1.svg", "80 30 310 400", 0),
    ("kalash_v2.svg", "545 30 310 400", 1),
    ("kalash_v3.svg", "970 30 310 400", 2),
    ("kalash_v4.svg", "80 470 310 400", 3),
    ("kalash_v5.svg", "545 470 310 400", 4),
    ("kalash_v6.svg", "970 470 310 400", 5)
]

for filename, vb, g_idx in boxes:
    new_svg = ET.Element('svg', {
        'xmlns': 'http://www.w3.org/2000/svg',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        'viewBox': vb,
        'width': '100%',
        'height': '100%'
    })
    if style is not None:
        new_svg.append(style)
    new_svg.append(groups[g_idx])
    
    out_path = f'public/assets/{filename}'
    with open(out_path, 'wb') as f:
        f.write(ET.tostring(new_svg, encoding='utf-8'))
    print(f"Created {out_path} with viewBox='{vb}'")
