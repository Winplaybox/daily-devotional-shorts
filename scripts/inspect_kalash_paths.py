import xml.etree.ElementTree as ET
import re

for i in [2, 3, 4, 5, 6]:
    path = f'public/assets/kalash_{i}.svg'
    tree = ET.parse(path)
    root = tree.getroot()
    print(f"\n=== Elements in Kalash {i} ===")
    all_elements = []
    for el in root.iter('{http://www.w3.org/2000/svg}path'):
        d = el.attrib.get('d', '')
        nums = [float(n) for n in re.findall(r'[-+]?\d*\.?\d+', d)]
        if nums:
            xs = nums[0::2]
            ys = nums[1::2]
            all_elements.append((min(xs), min(ys), max(xs), max(ys), el.attrib.get('class', '')))
    
    # Sort by min_x
    all_elements.sort(key=lambda e: e[0])
    for e in all_elements[:5]:
        print(f"  e: X=[{e[0]:.1f}, {e[2]:.1f}], Y=[{e[1]:.1f}, {e[3]:.1f}], class={e[4]}")
    for e in all_elements[-3:]:
        print(f"  e: X=[{e[0]:.1f}, {e[2]:.1f}], Y=[{e[1]:.1f}, {e[3]:.1f}], class={e[4]}")
