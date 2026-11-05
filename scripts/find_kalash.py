from PIL import Image

img = Image.open('public/assets/reference-poster.jpg')
w, h = img.size

# Let's crop vertical slices on the left and right to locate Kalash exactly
# On the left side around x=30 to 180, let's test y from 600 to 800
for y_start in [550, 600, 650, 700, 750]:
    crop = img.crop((40, y_start, 180, y_start + 180))
    crop.save(f'public/assets/elements/test_kalash_{y_start}.png')

print("Saved test kalash slices")
