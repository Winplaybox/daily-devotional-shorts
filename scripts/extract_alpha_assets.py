import numpy as np
from PIL import Image

def extract_alpha_asset(crop_img, bg_color=(59, 11, 20), color_tol=35):
    """
    Extracts an object on a dark maroon background to transparent PNG.
    Uses soft alpha feathering.
    """
    arr = np.array(crop_img.convert('RGBA'))
    rgb = arr[:, :, :3].astype(float)
    
    bg = np.array(bg_color, dtype=float)
    # Calculate color distance to background
    dist = np.linalg.norm(rgb - bg, axis=2)
    
    # Foreground mask with smooth feather
    alpha = np.clip((dist - color_tol) / 30.0, 0, 1)
    
    # Also if brightness is very dark maroon
    # Keep gold/green/orange/red colors
    arr[:, :, 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(arr)

# 1. Extract Kalash
img = Image.open('public/assets/reference-poster.jpg')
# In test_kalash_600: crop was (40, 600, 180, 780)
# Let's crop tighter around Kalash: x=48, y=615, w=128, h=160
kalash_raw = img.crop((46, 615, 178, 775))
kalash_raw.save('public/assets/elements/kalash_raw.png')

# Matte kalash
kalash_alpha = extract_alpha_asset(kalash_raw, bg_color=(57, 11, 20), color_tol=28)
kalash_alpha.save('public/assets/elements/kalash_realistic.png')
print("Extracted kalash_realistic.png:", kalash_alpha.size)

# 2. Extract Garland & Bells Left
# In test_top_left: (0, 0, 220, 500)
# Garlands & Bells are from x=30 to 195, y=20 to 495
garland_raw = img.crop((30, 20, 200, 495))
garland_alpha = extract_alpha_asset(garland_raw, bg_color=(57, 11, 20), color_tol=25)
garland_alpha.save('public/assets/elements/garlands_bells_left.png')
print("Extracted garlands_bells_left.png:", garland_alpha.size)

# 3. Extract Garland & Bells Right
# x = 848 - 200 = 648 to 848 - 30 = 818
garland_right_raw = img.crop((img.width - 200, 20, img.width - 30, 495))
garland_right_alpha = extract_alpha_asset(garland_right_raw, bg_color=(57, 11, 20), color_tol=25)
garland_right_alpha.save('public/assets/elements/garlands_bells_right.png')
print("Extracted garlands_bells_right.png:", garland_right_alpha.size)

# 4. Extract Top-Left Corner flourish
corner_raw = img.crop((12, 12, 135, 135))
corner_alpha = extract_alpha_asset(corner_raw, bg_color=(57, 11, 20), color_tol=22)
corner_alpha.save('public/assets/elements/corner_flourish.png')
print("Extracted corner_flourish.png:", corner_alpha.size)

# 5. Extract Center Diya
diya_raw = img.crop((img.width // 2 - 65, img.height - 90, img.width // 2 + 65, img.height - 20))
diya_alpha = extract_alpha_asset(diya_raw, bg_color=(57, 11, 20), color_tol=20)
diya_alpha.save('public/assets/elements/diya_realistic.png')
print("Extracted diya_realistic.png:", diya_alpha.size)
