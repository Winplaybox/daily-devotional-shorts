from PIL import Image
import numpy as np

img = Image.open('public/assets/reference-poster.jpg').convert('RGBA')
# Top center ornament in reference image is at x=415 to 585, y=36 to 62
flourish_raw = img.crop((420, 36, 580, 60))
arr = np.array(flourish_raw).astype(float)
rgb = arr[:, :, :3]
bg = np.array([57, 11, 20], dtype=float)
dist = np.linalg.norm(rgb - bg, axis=2)
alpha = np.clip((dist - 20) / 25.0, 0, 1)
arr[:, :, 3] = (alpha * 255)

flourish = Image.fromarray(arr.astype(np.uint8))
bbox = flourish.getbbox()
if bbox:
    flourish = flourish.crop(bbox)
flourish.save('public/assets/header_flourish.png')
print("Cleaned header_flourish.png:", flourish.size)
