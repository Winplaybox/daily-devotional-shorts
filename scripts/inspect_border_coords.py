import re
import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
root = tree.getroot()

# Let's inspect the groups and their clip paths or paths
for i, g in enumerate(root.findall('{http://www.w3.org/2000/svg}g')[:20]):
    paths = g.findall('.//{http://www.w3.org/2000/svg}path')
    d_list = [p.attrib.get('d', '') for p in paths]
    full_d = " ".join(d_list)
    coords = re.findall(r'(\d+\.?\d*)[,\s]+(\d+\.?\d*)', full_d)
    if coords:
        xs = [float(c[0]) for c in coords]
        ys = [float(c[1]) for c in coords]
        print(f"Group {i}: X=[{min(xs):.1f}, {max(xs):.1f}] Y=[{min(ys):.1f}, {max(ys):.1f}]")
