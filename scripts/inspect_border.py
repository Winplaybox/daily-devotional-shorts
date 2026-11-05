import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
root = tree.getroot()
print("Border Root Tag:", root.tag, "attrib:", root.attrib)

# Let's see what elements/groups it has
groups = [c for c in root if c.tag.endswith('g')]
print(f"Total groups in border SVG: {len(groups)}")
for i, g in enumerate(groups[:10]):
    print(f"Group {i}: attrib={g.attrib}")
