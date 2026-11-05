import re
import xml.etree.ElementTree as ET

def get_coords(text):
    nums = [float(n) for n in re.findall(r'[-+]?\d*\.?\d+', text)]
    return nums

for i in range(1, 7):
    path = f'public/assets/kalash_{i}.svg'
    tree = ET.parse(path)
    root = tree.getroot()
    all_d = []
    for p in root.iter('{http://www.w3.org/2000/svg}path'):
        if 'd' in p.attrib:
            all_d.append(p.attrib['d'])
    for poly in root.iter('{http://www.w3.org/2000/svg}polygon'):
        if 'points' in poly.attrib:
            all_d.append(poly.attrib['points'])
    
    full_text = " ".join(all_d)
    # Extract x, y pairs roughly
    coords = re.findall(r'(\d+\.?\d*)[,\s]+(\d+\.?\d*)', full_text)
    if coords:
        xs = [float(c[0]) for c in coords]
        ys = [float(c[1]) for c in coords]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max_x - min_x
        h = max_y - min_y
        print(f"Kalash {i}: bbox=({min_x:.1f}, {min_y:.1f}, {w:.1f}, {h:.1f})")
        # Update viewBox with small padding
        pad = 10
        root.attrib['viewBox'] = f"{min_x - pad:.1f} {min_y - pad:.1f} {w + 2*pad:.1f} {h + 2*pad:.1f}"
        tree.write(path, encoding='utf-8')
