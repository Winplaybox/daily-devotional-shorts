import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_free-kalash-vector_109001.svg')
root = tree.getroot()
ns = {'svg': 'http://www.w3.org/2000/svg'}
style = root.find('svg:style', ns)
style_str = ET.tostring(style, encoding='unicode') if style is not None else ""

groups = [c for c in root if c.tag.endswith('g')]
print(f"Found {len(groups)} kalash groups.")

for i, g in enumerate(groups):
    # create individual SVG
    new_svg = ET.Element('svg', {
        'xmlns': 'http://www.w3.org/2000/svg',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        'viewBox': '0 0 1400 980'
    })
    if style is not None:
        new_svg.append(style)
    new_svg.append(g)
    
    out_file = f'public/assets/kalash_{i+1}.svg'
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(ET.tostring(new_svg, encoding='unicode'))
    print(f"Wrote {out_file}")
