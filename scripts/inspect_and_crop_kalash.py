import xml.etree.ElementTree as ET
import re

# Let's inspect the SVG content and structure of each kalash_1 through kalash_6
for i in range(1, 7):
    path = f'public/assets/kalash_{i}.svg'
    tree = ET.parse(path)
    root = tree.getroot()
    # Find all colors/classes used
    classes = set()
    for el in root.iter():
        if 'class' in el.attrib:
            classes.add(el.attrib['class'])
    
    # Calculate exact non-zero bounding box
    all_d = []
    for p in root.iter('{http://www.w3.org/2000/svg}path'):
        if 'd' in p.attrib:
            all_d.append(p.attrib['d'])
    for poly in root.iter('{http://www.w3.org/2000/svg}polygon'):
        if 'points' in poly.attrib:
            all_d.append(poly.attrib['points'])
    
    coords = re.findall(r'([0-9]+\.?[0-9]*)[,\s]+([0-9]+\.?[0-9]*)', " ".join(all_d))
    valid_xs = [float(c[0]) for c in coords if float(c[0]) > 0.1]
    valid_ys = [float(c[1]) for c in coords if float(c[1]) > 0.1]
    
    if valid_xs and valid_ys:
        min_x, max_x = min(valid_xs), max(valid_xs)
        min_y, max_y = min(valid_ys), max(valid_ys)
        w = max_x - min_x
        h = max_y - min_y
        print(f"Kalash {i}: bbox=({min_x:.1f}, {min_y:.1f}, {w:.1f}, {h:.1f}) classes={classes}")
        # Let's set the exact viewBox on the SVG
        pad = 8
        root.attrib['viewBox'] = f"{min_x - pad:.1f} {min_y - pad:.1f} {w + 2*pad:.1f} {h + 2*pad:.1f}"
        root.attrib['width'] = "100%"
        root.attrib['height'] = "100%"
        tree.write(f'public/assets/kalash_vector_{i}.svg', encoding='utf-8')
