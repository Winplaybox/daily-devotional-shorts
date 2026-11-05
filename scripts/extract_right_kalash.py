from PIL import Image
import numpy as np

img = Image.open('public/assets/reference-poster.jpg')
w, h = img.size

# Right Kalash:
right_kalash_raw = img.crop((w - 180, 615, w - 48, 775))
right_kalash_raw.save('public/assets/elements/right_kalash_raw.png')

# Matte right kalash
arr = np.array(right_kalash_raw.convert('RGBA'))
rgb = arr[:, :, :3].astype(float)
bg = np.array([57, 11, 20], dtype=float)
dist = np.linalg.norm(rgb - bg, axis=2)
alpha = np.clip((dist - 28) / 30.0, 0, 1)
arr[:, :, 3] = (alpha * 255).astype(np.uint8)

right_kalash = Image.fromarray(arr)
bbox = right_kalash.getbbox()
if bbox:
    right_kalash = right_kalash.crop(bbox)
right_kalash.save('public/assets/elements/right_kalash.png')
print("Right kalash saved:", right_kalash.size)
