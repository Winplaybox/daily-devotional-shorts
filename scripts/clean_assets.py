from PIL import Image
import numpy as np

# 1. Clean Kalash:
kalash = Image.open('public/assets/elements/kalash_realistic.png').convert('RGBA')
arr = np.array(kalash)
# Clear the bottom right smudge (x > 90 and y > 105)
for y in range(100, arr.shape[0]):
    for x in range(85, arr.shape[1]):
        # if color is brownish/dark red (not the gold pot or red swastika)
        r, g, b, a = arr[y, x]
        if r > 100 and g < 60 and b < 50 and a > 0:
            # this is the dark red/brown smudge
            arr[y, x, 3] = 0
        elif r < 90 and g < 40:
            arr[y, x, 3] = 0

cleaned_kalash = Image.fromarray(arr)
# Crop to non-transparent bounding box
bbox = cleaned_kalash.getbbox()
if bbox:
    cleaned_kalash = cleaned_kalash.crop(bbox)
cleaned_kalash.save('public/assets/elements/kalash_clean.png')
print("Cleaned kalash saved:", cleaned_kalash.size)

# 2. Extract a single realistic brass bell with transparency:
# In garlands_bells_left.png:
# Bell 1 is at roughly x=70-135, y=260-340
# Bell 2 is at roughly x=20-85, y=390-475
g_img = Image.open('public/assets/elements/garlands_bells_left.png')
bell_crop = g_img.crop((70, 260, 135, 345))
bell_bbox = bell_crop.getbbox()
if bell_bbox:
    bell_crop = bell_crop.crop(bell_bbox)
bell_crop.save('public/assets/elements/brass_bell.png')
print("Extracted brass_bell.png:", bell_crop.size)

# 3. Extract Corner Flourish:
cf_img = Image.open('public/assets/elements/corner_flourish.png').convert('RGBA')
cf_arr = np.array(cf_img)
# Clean any non-gold artifacts
cf_bbox = cf_img.getbbox()
if cf_bbox:
    cf_img = cf_img.crop(cf_bbox)
cf_img.save('public/assets/elements/corner_flourish_clean.png')
print("Cleaned corner_flourish:", cf_img.size)

# 4. Extract pure Marigold Garland string:
# In garlands_bells_left, the leftmost garland runs from y=60 to y=390, x=3 to 35
marigold_string = g_img.crop((3, 60, 36, 390))
m_bbox = marigold_string.getbbox()
if m_bbox:
    marigold_string = marigold_string.crop(m_bbox)
marigold_string.save('public/assets/elements/marigold_string.png')
print("Extracted marigold_string.png:", marigold_string.size)
