import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
root = tree.getroot()

# Let's count elements
paths = list(root.iter('{http://www.w3.org/2000/svg}path'))
print(f"Total paths in Victorian border SVG: {len(paths)}")

# Check for viewBox or width/height
print("Attributes:", root.attrib)

# Let's see if there are rects or groups
groups = list(root.findall('{http://www.w3.org/2000/svg}g'))
print(f"Top-level groups: {len(groups)}")
