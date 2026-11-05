from PIL import Image
import os

img = Image.open('public/assets/reference-poster.jpg')
w, h = img.size
print(f"Reference poster dimensions: {w}x{h}")

os.makedirs('public/assets/elements', exist_ok=True)

# 1. Kalash (Left Kalash from reference: x=55, y=500, w=115, h=155)
kalash_crop = img.crop((55, 500, 175, 655))
kalash_crop.save('public/assets/elements/kalash_crop.png')

# 2. Top-Left Corner flourish
corner_tl = img.crop((15, 15, 160, 160))
corner_tl.save('public/assets/elements/corner_tl.png')

# 3. Top Header flourish
flourish_top = img.crop((440, 20, 560, 55))
flourish_top.save('public/assets/elements/flourish_top.png')

# 4. Left Marigold & Bells
garland_bells_left = img.crop((35, 10, 195, 420))
garland_bells_left.save('public/assets/elements/garland_bells_left.png')

# 5. Right Marigold & Bells
garland_bells_right = img.crop((800, 10, 960, 420))
garland_bells_right.save('public/assets/elements/garland_bells_right.png')

print("Elements cropped successfully!")
