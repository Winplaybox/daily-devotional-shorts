import xml.etree.ElementTree as ET
import re
import os

tree = ET.parse('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
root = tree.getroot()
defs = root.find('{http://www.w3.org/2000/svg}defs')

# Map all def elements by id
defs_by_id = {}
for child in defs:
    cid = child.attrib.get('id')
    if cid:
        defs_by_id[cid] = child

print(f"Total defs in master: {len(defs_by_id)}")

# Let's inspect all top-level groups in root
# In SVG, paths in clip-paths have the real coordinates!
# Let's find coordinates of each top-level group by checking its clip-paths!
g_list = root.findall('{http://www.w3.org/2000/svg}g')

group_info = []
for idx, g in enumerate(g_list):
    g_str = ET.tostring(g, encoding='unicode')
    clip_ids = re.findall(r'url\(#([^)]+)\)', g_str)
    # Collect all coords from paths inside g and paths inside referenced clipPaths
    all_d = []
    for p in g.findall('.//{http://www.w3.org/2000/svg}path'):
        all_d.append(p.attrib.get('d', ''))
    for cid in clip_ids:
        if cid in defs_by_id and defs_by_id[cid].tag.endswith('clipPath'):
            for p in defs_by_id[cid].findall('.//{http://www.w3.org/2000/svg}path'):
                all_d.append(p.attrib.get('d', ''))
    
    coords = re.findall(r'([0-9]+\.?[0-9]*)[,\s]+([0-9]+\.?[0-9]*)', ' '.join(all_d))
    if coords:
        xs = [float(c[0]) for c in coords if float(c[0]) <= 2500]
        ys = [float(c[1]) for c in coords if float(c[1]) <= 1600]
        if xs and ys:
            minx, maxx = min(xs), max(xs)
            miny, maxy = min(ys), max(ys)
            group_info.append({
                'index': idx,
                'elem': g,
                'minx': minx, 'maxx': maxx,
                'miny': miny, 'maxy': maxy,
                'cx': (minx + maxx) / 2,
                'cy': (miny + maxy) / 2,
                'w': maxx - minx, 'h': maxy - miny
            })

print(f"Total placed groups: {len(group_info)}")

def export_element(name, bbox_filter):
    # bbox_filter is a function taking group_info item -> bool
    matching = [gi for gi in group_info if bbox_filter(gi)]
    if not matching:
        print(f"No match for {name}")
        return
    
    min_x = min(gi['minx'] for gi in matching)
    max_x = max(gi['maxx'] for gi in matching)
    min_y = min(gi['miny'] for gi in matching)
    max_y = max(gi['maxy'] for gi in matching)
    
    pad = 4
    vb_x = max(0, min_x - pad)
    vb_y = max(0, min_y - pad)
    vb_w = (max_x - min_x) + pad * 2
    vb_h = (max_y - min_y) + pad * 2
    
    # Create new SVG
    new_root = ET.Element('{http://www.w3.org/2000/svg}svg', {
        'viewBox': f"{vb_x:.1f} {vb_y:.1f} {vb_w:.1f} {vb_h:.1f}",
        'width': '100%',
        'height': '100%'
    })
    new_defs = ET.SubElement(new_root, '{http://www.w3.org/2000/svg}defs')
    
    # Collect all needed def IDs
    needed_ids = set()
    for gi in matching:
        g_str = ET.tostring(gi['elem'], encoding='unicode')
        for mid in re.findall(r'url\(#([^)]+)\)', g_str):
            needed_ids.add(mid)
        for mid in re.findall(r'href=["\']#([^"\']+)["\']', g_str):
            needed_ids.add(mid)
            
    # Expand dependencies in defs (e.g. clipPath referencing another or gradient)
    added = True
    while added:
        added = False
        for did in list(needed_ids):
            if did in defs_by_id:
                sub_str = ET.tostring(defs_by_id[did], encoding='unicode')
                for sub_id in re.findall(r'url\(#([^)]+)\)', sub_str):
                    if sub_id not in needed_ids and sub_id in defs_by_id:
                        needed_ids.add(sub_id)
                        added = True
                for sub_id in re.findall(r'href=["\']#([^"\']+)["\']', sub_str):
                    if sub_id not in needed_ids and sub_id in defs_by_id:
                        needed_ids.add(sub_id)
                        added = True
    
    for did in sorted(needed_ids):
        if did in defs_by_id:
            new_defs.append(defs_by_id[did])
            
    for gi in matching:
        new_root.append(gi['elem'])
        
    out_path = f"public/assets/{name}.svg"
    # Format nicely with namespace
    out_str = ET.tostring(new_root, encoding='utf-8').decode('utf-8')
    # Clean ns0: prefix if present
    out_str = out_str.replace('ns0:', '').replace(':ns0', '')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out_str)
    print(f"Exported {name}.svg: {vb_w:.1f}x{vb_h:.1f}, defs={len(needed_ids)}, groups={len(matching)}, size={len(out_str)/1024:.1f} KB")

# Define filters for elements:
# Corners are in column 3 (x > 1650)
export_element('victorian_corner_1', lambda g: g['minx'] > 1650 and g['maxx'] < 2050 and g['miny'] > 200 and g['maxy'] < 550)
export_element('victorian_corner_2', lambda g: g['minx'] > 2050 and g['miny'] > 200 and g['maxy'] < 550)
export_element('victorian_corner_3', lambda g: g['minx'] > 1650 and g['maxx'] < 2050 and g['miny'] > 600 and g['maxy'] < 980)
export_element('victorian_corner_4', lambda g: g['minx'] > 2050 and g['miny'] > 600 and g['maxy'] < 980)
export_element('victorian_corner_5', lambda g: g['minx'] > 1650 and g['maxx'] < 2050 and g['miny'] > 1000 and g['maxy'] < 1400)
export_element('victorian_corner_6', lambda g: g['minx'] > 2050 and g['miny'] > 1000 and g['maxy'] < 1400)

# Border bars are in column 2 (850 < x < 1680)
export_element('victorian_bar_1', lambda g: 850 < g['cx'] < 1680 and 200 < g['cy'] < 450)
export_element('victorian_bar_2', lambda g: 850 < g['cx'] < 1680 and 500 < g['cy'] < 750)
export_element('victorian_bar_3', lambda g: 850 < g['cx'] < 1680 and 850 < g['cy'] < 1100)
export_element('victorian_bar_4', lambda g: 850 < g['cx'] < 1680 and 1200 < g['cy'] < 1450)

# Center headers are in column 1 (x < 850)
export_element('victorian_header_1', lambda g: g['cx'] < 850 and 200 < g['cy'] < 450)
export_element('victorian_header_2', lambda g: g['cx'] < 850 and 450 < g['cy'] < 780)
export_element('victorian_header_3', lambda g: g['cx'] < 850 and 800 < g['cy'] < 1100)
export_element('victorian_header_4', lambda g: g['cx'] < 850 and 1150 < g['cy'] < 1450)
