import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
root = tree.getroot()

# The SVG has defs with clipPaths and gradients, and top-level groups
defs = root.find('{http://www.w3.org/2000/svg}defs')
groups = root.findall('{http://www.w3.org/2000/svg}g')

print(f"Total groups: {len(groups)}")

# Let's inspect groups around (0 to 1000, 0 to 1000)
for i, g in enumerate(groups[:35]):
    # find bbox
    paths = g.findall('.//{http://www.w3.org/2000/svg}path')
    d_all = " ".join([p.attrib.get('d', '') for p in paths])
    import re
    coords = re.findall(r'(\d+\.?\d*)[,\s]+(\d+\.?\d*)', d_all)
    if coords:
        xs = [float(c[0]) for c in coords]
        ys = [float(c[1]) for c in coords]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max_x - min_x
        h = max_y - min_y
        # Look for corner flourish which is roughly square (e.g. 200x200 to 500x500)
        if 80 < w < 700 and 80 < h < 700 and 0.5 < w/h < 2.0:
            print(f"Candidate Corner Group {i}: w={w:.1f}, h={h:.1f}, bbox=({min_x:.1f}, {min_y:.1f})")
