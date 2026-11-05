from PIL import Image
import numpy as np

# Load left kalash (has clean left side) and right kalash (has clean right side)
img_left = Image.open('public/assets/elements/kalash_realistic.png').convert('RGBA')
img_right = Image.open('public/assets/elements/right_kalash.png').convert('RGBA')

# Target size 130x160
target_w, target_h = 130, 160
img_left = img_left.resize((target_w, target_h), Image.LANCZOS)
img_right = img_right.resize((target_w, target_h), Image.LANCZOS)

arr_left = np.array(img_left)
arr_right = np.array(img_right)

combined = np.zeros_like(arr_left)
mid_x = target_w // 2

# Take left half from left kalash, right half from right kalash
for y in range(target_h):
    for x in range(target_w):
        if x < mid_x:
            combined[y, x] = arr_left[y, x]
        else:
            combined[y, x] = arr_right[y, x]

# Soft blend in the middle 6 pixels
blend_width = 6
for y in range(target_h):
    for x in range(mid_x - blend_width, mid_x + blend_width):
        factor = (x - (mid_x - blend_width)) / (2.0 * blend_width)
        combined[y, x] = (1.0 - factor) * arr_left[y, x] + factor * arr_right[y, x]

pristine = Image.fromarray(combined)
bbox = pristine.getbbox()
if bbox:
    pristine = pristine.crop(bbox)

pristine.save('public/assets/elements/kalash_pristine.png')
print("Pristine kalash created! Size:", pristine.size)
