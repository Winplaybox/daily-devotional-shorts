import re
import xml.etree.ElementTree as ET

# Read the original kalash vector file
with open('public/vecteezy_free-kalash-vector_109001.svg', 'r', encoding='utf-8') as f:
    svg_content = f.read()

# Let's see what style classes are used
style_match = re.search(r'<style[^>]*>(.*?)</style>', svg_content, re.DOTALL)
style_content = style_match.group(1) if style_match else ""

# Find all top-level groups under svg
# In the original file:
# Child 1 to 6 are groups
tree = ET.parse('public/vecteezy_free-kalash-vector_109001.svg')
root = tree.getroot()

# The 6 groups are:
groups = [c for c in root if c.tag.endswith('g')]
print(f"Total groups: {len(groups)}")

# Let's inspect the bounding coordinates of each group specifically:
for i, g in enumerate(groups):
    paths = g.findall('.//{http://www.w3.org/2000/svg}path')
    all_d = " ".join([p.attrib.get('d', '') for p in paths])
    coords = re.findall(r'(\d+\.?\d*)[,\s]+(\d+\.?\d*)', all_d)
    if coords:
        xs = [float(c[0]) for c in coords]
        ys = [float(c[1]) for c in coords]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        print(f"Kalash Design {i+1}: X=[{min_x:.1f}, {max_x:.1f}] Y=[{min_y:.1f}, {max_y:.1f}], width={max_x-min_x:.1f}, height={max_y-min_y:.1f}")
