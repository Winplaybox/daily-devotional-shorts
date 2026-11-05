import xml.etree.ElementTree as ET
import re

tree = ET.parse('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
root = tree.getroot()
defs = root.find('{http://www.w3.org/2000/svg}defs')
groups = root.findall('{http://www.w3.org/2000/svg}g')

for idx in [7, 12, 24, 26]:
    g = groups[idx]
    # Calculate bbox
    paths = g.findall('.//{http://www.w3.org/2000/svg}path')
    d_all = " ".join([p.attrib.get('d', '') for p in paths])
    coords = re.findall(r'(\d+\.?\d*)[,\s]+(\d+\.?\d*)', d_all)
    if coords:
        xs = [float(c[0]) for c in coords]
        ys = [float(c[1]) for c in coords]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max_x - min_x
        h = max_y - min_y
        
        # Build SVG
        pad = 5
        new_svg = ET.Element('svg', {
            'xmlns': 'http://www.w3.org/2000/svg',
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
            'viewBox': f"{min_x - pad:.1f} {min_y - pad:.1f} {w + 2*pad:.1f} {h + 2*pad:.1f}",
            'width': f"{w:.1f}",
            'height': f"{h:.1f}"
        })
        if defs is not None:
            new_svg.append(defs)
        new_svg.append(g)
        
        out_path = f'public/assets/corner_vector_{idx}.svg'
        with open(out_path, 'wb') as f:
            f.write(ET.tostring(new_svg, encoding='utf-8'))
        print(f"Exported {out_path} ({w:.1f}x{h:.1f})")
