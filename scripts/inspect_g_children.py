import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_free-kalash-vector_109001.svg')
root = tree.getroot()
groups = [c for c in root if c.tag.endswith('g')]

for i, g in enumerate(groups):
    print(f"\n--- Group {i+1} ---")
    for child in g:
        print(f"  Tag: {child.tag}, attrib: {child.attrib}")
