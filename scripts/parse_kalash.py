import xml.etree.ElementTree as ET

tree = ET.parse('public/vecteezy_free-kalash-vector_109001.svg')
root = tree.getroot()
print("Kalash SVG Tag:", root.tag, "attrib:", root.attrib)

# Let's count direct children of root or top groups
children = list(root)
print("Number of children in Kalash SVG:", len(children))
for i, child in enumerate(children):
    print(f"Child {i}: tag={child.tag}, attrib={child.attrib}")
