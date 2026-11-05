from PIL import Image
import numpy as np

img = Image.open('public/assets/reference-poster.jpg').convert('RGBA')
w, h = img.size

# Bottom-left corner: x=12 to 140, y=h-140 to h-12
bl_raw = img.crop((10, h - 140, 140, h - 10))
bl_raw.save('public/assets/elements/bl_corner_raw.png')

# Let's matte it:
arr = np.array(bl_raw).astype(float)
rgb = arr[:, :, :3]
bg = np.array([57, 11, 20], dtype=float)
dist = np.linalg.norm(rgb - bg, axis=2)
alpha = np.clip((dist - 22) / 25.0, 0, 1)
arr[:, :, 3] = (alpha * 255)
bl_img = Image.fromarray(arr.astype(np.uint8))

bbox = bl_img.getbbox()
if bbox:
    bl_img = bl_img.crop(bbox)
bl_img = bl_img.resize((int(bl_img.width * 1.5), int(bl_img.height * 1.5)), Image.LANCZOS)
bl_img.save('public/assets/corner_victorian_clean.png')
print("Bottom-left corner flourish saved:", bl_img.size)

# Also clean the dotted stroke on kalash_img
kalash = Image.open('public/assets/mangal_kalash.png').convert('RGBA')
k_arr = np.array(kalash)
# The image is 225x250. Let's zero out pixels where x > 150 and y > 180 (the stray line)
for y in range(160, k_arr.shape[0]):
    for x in range(145, k_arr.shape[1]):
        # if not part of the main pot base
        # pot base is x <= 140
        k_arr[y, x, 3] = 0
clean_kalash = Image.fromarray(k_arr)
k_bbox = clean_kalash.getbbox()
if k_bbox:
    clean_kalash = clean_kalash.crop(k_bbox)
clean_kalash.save('public/assets/mangal_kalash.png')
print("Pristine mangal_kalash saved:", clean_kalash.size)
