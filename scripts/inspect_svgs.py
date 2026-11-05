import re
import xml.etree.ElementTree as ET

def inspect_svg(path):
    print("=== Inspecting", path, "===")
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        head = [f.readline() for _ in range(30)]
    print("".join(head[:15]))

inspect_svg('public/vecteezy_free-kalash-vector_109001.svg')
inspect_svg('public/vecteezy_victorian-border-element-in-gold-color_6115324.svg')
