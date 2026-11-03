"""
Main Real-Time Panchang & Festival Engine Orchestrator
Executes real-time astronomical computations, detects daily festivals across religions,
assigns high-res devotional themes, and produces ready-to-render Remotion props + SEO metadata.
"""

import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json
import argparse
from datetime import datetime, date, timedelta, timezone

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from engine.panchang_calculator import get_complete_panchang
from engine.festival_detector import detect_todays_festivals

# Curated High-Definition Spiritual Visuals (9:16 vertical crop ready)
# Royalty-free curated temple, deity, and sacred aura images
THEME_WALLPAPERS = {
    "krishna": [
        "https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?auto=format&fit=crop&w=1080&q=80", # Krishna flute / Vrindavan
        "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80", # Sacred Diya
    ],
    "shiva": [
        "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=1080&q=80", # Mahadev / Himalayan Temple
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&q=80", # Sacred flame
    ],
    "devi": [
        "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1080&q=80", # Golden temple aura
        "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80", # Diya deepavali
    ],
    "ganesh": [
        "https://images.unsplash.com/photo-1567591414240-e175924d5b24?auto=format&fit=crop&w=1080&q=80", # Ganesha idol / flowers
    ],
    "temple": [
        "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80", # Sacred Indian diya
        "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1080&q=80", # Golden temple
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&q=80", # Aarti
    ],
    "islam": [
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1080&q=80", # (replaced with architecture below)
        "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1080&q=80", # Grand Mosque architecture
        "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1080&q=80", # Crescent moon night
    ],
    "sikh": [
        "https://images.unsplash.com/photo-1609137144822-09470c1737be?auto=format&fit=crop&w=1080&q=80", # Golden Temple Amritsar
        "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1080&q=80",
    ],
    "christian": [
        "https://images.unsplash.com/photo-1548625361-19597793c393?auto=format&fit=crop&w=1080&q=80", # Cathedral stained glass / light
        "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1080&q=80", # Sacred candles
    ],
    "jain": [
        "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1080&q=80", # Jain carved marble temple
        "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80",
    ],
}

def pick_wallpaper(theme: str, target_date: date) -> str:
    """Picks a wallpaper matching the festival theme and rotates based on day."""
    wallpapers = THEME_WALLPAPERS.get(theme, THEME_WALLPAPERS["temple"])
    # Filter out any non-sacred fallbacks
    valid_wallpapers = [w for w in wallpapers if not w.endswith("542838132-92c53300491e")]
    if not valid_wallpapers:
        valid_wallpapers = THEME_WALLPAPERS["temple"]
    # Deterministic rotation based on day number
    idx = target_date.day % len(valid_wallpapers)
    return valid_wallpapers[idx]

def generate_seo_metadata(event: dict, panchang: dict) -> dict:
    """Generates rich, high-CTR YouTube Shorts title, description, and hashtags."""
    title_raw = event.get("yt_title")
    if not title_raw:
        title_raw = f"{event['title']} | {panchang['date_display']} शुभ मुहूर्त #Shorts"

    description = f"""
🙏 {event['title']} — {panchang['date_display']}

आज का शुभ मुहूर्त, दैनिक पंचांग और पूजा समय:
═══════════════════════════════════════════
✦ {event['label1']}: {event['val1']}
✦ {event['label2']}: {event['val2']}
✦ {event['label3']}: {event['val3']}
✦ {event['footer']}
═══════════════════════════════════════════

☀️ सूर्योदय: {panchang['sunrise']} | सूर्यास्त: {panchang['sunset']}
🌙 तिथि: {panchang['tithi_name']} ({panchang['paksha']})
⭐ नक्षत्र: {panchang['nakshatra_name']}
✨ योग: {panchang['yoga_name']} | करण: {panchang['karana_name']}
⚡ राहुकाल (अशुभ समय): {panchang['rahu_kaal']}
🌟 शुभ अभिजीत मुहूर्त: {panchang['abhijit']}

प्रतिदिन सभी धर्मों के पावन पर्व, शुभ मुहूर्त और सटीक पंचांग के लिए चैनल को Subscribe अवश्य करें! 🔔

#PavitraPanchang365 #Shorts #Panchang #AajKaPanchang #{event['theme'].capitalize()} #Bhakti #DailyMuhurat #ShubhMuhurat
""".strip()

    tags = [
        "Shorts", "Panchang", "Aaj Ka Panchang", "Shubh Muhurat",
        event["title"].split(" ")[0], panchang["tithi_name"].split(" ")[0],
        "Bhakti", "Devotional", "Hindu Calendar", "Puja Samay"
    ]

    return {
        "yt_title": title_raw,
        "yt_description": description,
        "yt_tags": tags,
    }

def generate_daily_payload(target_date: date = None) -> dict:
    """
    Main function: Generates full real-time panchang props payload.
    """
    if target_date is None:
        target_date = (datetime.now(timezone.utc) + timedelta(hours=5.5)).date()

    panchang = get_complete_panchang(target_date)
    festivals = detect_todays_festivals(panchang, target_date)
    primary_event = festivals[0] # Highest priority event

    theme = primary_event.get("theme", "temple")
    bg_url = pick_wallpaper(theme, target_date)
    seo = generate_seo_metadata(primary_event, panchang)

    payload = {
        "religion": primary_event["religion"],
        "title": primary_event["title"],
        "dateDisplay": panchang["date_display"],
        "label1": primary_event["label1"],
        "val1": primary_event["val1"],
        "label2": primary_event["label2"],
        "val2": primary_event["val2"],
        "label3": primary_event["label3"],
        "val3": primary_event["val3"],
        "footer": primary_event["footer"],
        "bgImageUrl": bg_url,
        "panchang_raw": panchang,
        **seo,
    }

    return payload

def main():
    parser = argparse.ArgumentParser(description="PavitraPanchang365 Real-Time Engine")
    parser.add_argument("--date", help="Target date in YYYY-MM-DD format (defaults to today in IST)")
    parser.add_argument("--out", default="out/daily_props.json", help="Path to write JSON output")
    args = parser.parse_args()

    if args.date:
        parts = [int(p) for p in args.date.split("-")]
        target_date = date(parts[0], parts[1], parts[2])
    else:
        target_date = (datetime.now(timezone.utc) + timedelta(hours=5.5)).date()

    payload = generate_daily_payload(target_date)

    out_path = args.out
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print("==========================================================")
    print("      PavitraPanchang365 Real-Time Engine (Active)        ")
    print("==========================================================")
    print(f"Date:     {payload['dateDisplay']}")
    print(f"Event:    [{payload['religion']}] {payload['title']}")
    print(f"Card 1:   {payload['label1']} -> {payload['val1']}")
    print(f"Card 2:   {payload['label2']} -> {payload['val2']}")
    print(f"Card 3:   {payload['label3']} -> {payload['val3']}")
    print(f"Footer:   {payload['footer']}")
    print(f"Props:    Saved to {out_path}")
    print("==========================================================")

if __name__ == "__main__":
    main()
