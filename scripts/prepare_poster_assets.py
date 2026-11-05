from PIL import Image
import numpy as np
import os

img = Image.open('public/assets/reference-poster.jpg').convert('RGBA')
w, h = img.size

os.makedirs('public/assets', exist_ok=True)

def matte_asset(crop_img, bg_color=(57, 11, 20), color_tol=28, feather=25.0):
    arr = np.array(crop_img).astype(float)
    rgb = arr[:, :, :3]
    bg = np.array(bg_color, dtype=float)
    dist = np.linalg.norm(rgb - bg, axis=2)
    alpha = np.clip((dist - color_tol) / feather, 0, 1)
    arr[:, :, 3] = (alpha * 255)
    return Image.fromarray(arr.astype(np.uint8))

# 1. Clean Pristine Kalash
# In reference image, Kalash on the left is at x=46, y=615, w=132, h=160
# Let's crop it and manually mask the bottom right where the deity hand touches
k_raw = img.crop((46, 615, 178, 775))
k_arr = np.array(matte_asset(k_raw, bg_color=(57, 11, 20), color_tol=26))

# Zero out the bottom right smudge (x > 84, y > 102)
for y in range(100, k_arr.shape[0]):
    for x in range(80, k_arr.shape[1]):
        r, g, b, a = k_arr[y, x]
        # if it's the brownish arm smudge, make transparent
        if (r > 90 and g < 60 and b < 50) or (r < 90 and g < 40):
            k_arr[y, x, 3] = 0

kalash_img = Image.fromarray(k_arr)
k_bbox = kalash_img.getbbox()
if k_bbox:
    kalash_img = kalash_img.crop(k_bbox)

# Upscale kalash smoothly for 1080x1920 poster
kalash_img = kalash_img.resize((int(kalash_img.width * 1.8), int(kalash_img.height * 1.8)), Image.LANCZOS)
kalash_img.save('public/assets/mangal_kalash.png')
print("Saved public/assets/mangal_kalash.png:", kalash_img.size)

# 2. Corner Flourish
corner_raw = img.crop((12, 12, 136, 136))
corner_img = matte_asset(corner_raw, bg_color=(57, 11, 20), color_tol=22)
c_bbox = corner_img.getbbox()
if c_bbox:
    corner_img = corner_img.crop(c_bbox)
corner_img = corner_img.resize((int(corner_img.width * 1.5), int(corner_img.height * 1.5)), Image.LANCZOS)
corner_img.save('public/assets/corner_flourish.png')
print("Saved public/assets/corner_flourish.png:", corner_img.size)

# 3. Top Header Flourish (above 'दैनिक पंचांग')
flourish_raw = img.crop((442, 22, 558, 55))
flourish_img = matte_asset(flourish_raw, bg_color=(57, 11, 20), color_tol=22)
f_bbox = flourish_img.getbbox()
if f_bbox:
    flourish_img = flourish_img.crop(f_bbox)
flourish_img = flourish_img.resize((int(flourish_img.width * 1.8), int(flourish_img.height * 1.8)), Image.LANCZOS)
flourish_img.save('public/assets/header_flourish.png')
print("Saved public/assets/header_flourish.png:", flourish_img.size)

# 4. Realistic Brass Temple Bell (isolated with clean chain loop)
bell_raw = img.crop((102, 280, 166, 358))
bell_img = matte_asset(bell_raw, bg_color=(57, 11, 20), color_tol=25)
b_bbox = bell_img.getbbox()
if b_bbox:
    bell_img = bell_img.crop(b_bbox)
bell_img = bell_img.resize((int(bell_img.width * 1.8), int(bell_img.height * 1.8)), Image.LANCZOS)
bell_img.save('public/assets/temple_bell.png')
print("Saved public/assets/temple_bell.png:", bell_img.size)

# 5. Realistic Marigold Garland String
garland_raw = img.crop((32, 60, 68, 420))
garland_img = matte_asset(garland_raw, bg_color=(57, 11, 20), color_tol=25)
g_bbox = garland_img.getbbox()
if g_bbox:
    garland_img = garland_img.crop(g_bbox)
garland_img = garland_img.resize((int(garland_img.width * 1.6), int(garland_img.height * 1.6)), Image.LANCZOS)
garland_img.save('public/assets/marigold_garland.png')
print("Saved public/assets/marigold_garland.png:", garland_img.size)
