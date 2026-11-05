from PIL import Image

img = Image.open('public/assets/reference-poster.jpg')
w, h = img.size

# Let's test cropping the top left garland & bells: x=0 to 220, y=0 to 500
crop_left = img.crop((0, 0, 220, 500))
crop_left.save('public/assets/elements/test_top_left.png')

# Top right garland & bells: x=w-220 to w, y=0 to 500
crop_right = img.crop((w - 220, 0, w, 500))
crop_right.save('public/assets/elements/test_top_right.png')

# Bottom center Diya: x=w//2 - 150 to w//2 + 150, y=h - 150 to h
crop_diya = img.crop((w // 2 - 150, h - 140, w // 2 + 150, h - 10))
crop_diya.save('public/assets/elements/test_bottom_diya.png')

print("Cropped top left, top right, and diya!")
