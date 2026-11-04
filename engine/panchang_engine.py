"""
Main Real-Time Panchang & Festival Engine Orchestrator
Generates real-time astronomical Panchang, detects daily festivals across religions,
formats 3 daily slots (Morning, Afternoon, Evening), assigns native 2D vector themes,
and produces high-CTR SEO metadata + target Playlists.
"""

import sys
import os
import json
import argparse
from datetime import datetime, date, timedelta, timezone

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from engine.panchang_calculator import get_complete_panchang
from engine.festival_detector import detect_todays_festivals

def generate_seo_metadata(event: dict, panchang: dict, slot: str = "morning") -> dict:
    """Generates high-CTR, SEO rankable YouTube Shorts title, structured description with Google FAQs, and tags."""
    date_disp = panchang["date_display"]
    title_raw = event.get("yt_title")

    if slot == "afternoon":
        title_raw = f"आज का शुभ चौघड़िया व अमृत मुहूर्त ⚡ {date_disp} | Shubh Choghadiya Today #Shorts"
    elif slot == "evening":
        title_raw = f"कल का पंचांग 🕉️ {date_disp} | कल का शुभ मुहूर्त व राहुकाल | Kal Ka Panchang #Shorts"
    elif not title_raw:
        title_raw = f"आज का पंचांग 🌸 {date_disp} | शुभ मुहूर्त, राहुकाल व तिथि | Aaj Ka Panchang #Shorts"

    # High-retention structured description for YouTube & Google Search indexing
    description = f"""
🙏 {event['title']} — {date_disp}

सटीक दैनिक पंचांग, शुभ मुहूर्त व आज के विशेष समय:
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
🧭 दिशाशूल: {panchang.get('disha_shool', 'पश्चिम दिशा')}
⚡ राहुकाल (अशुभ समय): {panchang['rahu_kaal']}
🌟 शुभ अभिजीत मुहूर्त: {panchang['abhijit']}
🌅 ब्रह्म मुहूर्त: {panchang['brahma']}
🌆 गोधूलि मुहूर्त: {panchang['godhuli']}
🪔 अमृत चौघड़िया: {panchang.get('amrit_choghadiya', 'उपलब्ध')}
🌺 शुभ चौघड़िया: {panchang.get('shubh_choghadiya', 'उपलब्ध')}

═══════════════════════════════════════════
📌 अक्सर पूछे जाने वाले प्रश्न (Google Search FAQs):
1. आज कौन सी तिथि है?
उत्तर: आज {panchang['paksha']} की {panchang['tithi_name']} है।

2. आज का राहुकाल (अशुभ समय) कब से कब तक है?
उत्तर: आज राहुकाल {panchang['rahu_kaal']} तक रहेगा (इस समय शुभ कार्य वर्जित हैं)।

3. आज का शुभ अभिजीत मुहूर्त कब है?
उत्तर: आज अभिजीत मुहूर्त {panchang['abhijit']} तक रहेगा।

4. आज किस दिशा में यात्रा नहीं करनी चाहिए (दिशाशूल)?
उत्तर: आज दिशाशूल {panchang.get('disha_shool', 'पश्चिम दिशा')} में रहेगा।
═══════════════════════════════════════════

🔔 प्रतिदिन सबसे पहले प्रामाणिक दैनिक पंचांग, चौघड़िया एवं शुभ मुहूर्त देखने के लिए हमारे चैनल @PavitraPanchang365 को अभी SUBSCRIBE करें!

✨ Content Policy Notice: यह वीडियो 100% मौलिक वैदिक खगोलीय गणना (Jean Meeus Astronomical Ephemeris) और Remotion 2D मोशन ग्राफ़िक्स द्वारा निर्मित है। No AI synthetic media used (Self-Declared Non-AI).

#PavitraPanchang365 #Shorts #AajKaPanchang #Panchang #ShubhMuhurat #Bhakti #DailyMuhurat #SanatanaDharma #Devotional #Choghadiya #KalKaPanchang #Tithi
""".strip()

    tags = [
        "Shorts", "Panchang", "Aaj Ka Panchang", "Shubh Muhurat", "Daily Panchang",
        "Dainik Panchang", "Choghadiya", "Rahukaal", "Tithi", "Kal Ka Panchang",
        "Aaj Ka Panchang Today", "Aaj Ka Shubh Muhurat", "Hindu Calendar",
        "Puja Samay", "Bhakti", "Devotional", "PavitraPanchang365",
        panchang["tithi_name"].split(" ")[0], panchang["nakshatra_name"].split(" ")[0]
    ]

    return {
        "yt_title": title_raw,
        "yt_description": description,
        "yt_tags": tags,
    }

def get_target_playlist(religion: str, title: str, slot: str = "morning") -> str:
    """Maps video content to dedicated thematic playlists for viewer binge-watching."""
    if slot == "afternoon":
        return "शुभ चौघड़िया एवं अमृत मुहूर्त | Shubh Choghadiya"
    elif slot == "evening":
        return "कल का पंचांग व अग्रिम दर्शन | Advance Panchang"

    if religion == "SANATANA DHARMA":
        if "पंचांग" in title:
            return "दैनिक पंचांग व शुभ मुहूर्त 2026 | Daily Panchang"
        return "सनातन पावन पर्व, व्रत व त्योहार"
    elif religion == "ISLAM":
        return "इस्लामिक पर्व व हिजरी कैलेंडर | Islamic Holy Days"
    elif religion == "SIKHISM":
        return "सिख गुरपर्व एवं प्रकाश पर्व | Sikh Gurpurab"
    elif religion == "CHRISTIANITY":
        return "Christian Holy Days & Prayers"
    elif religion == "JAINISM":
        return "जैन पर्व एवं तीर्थंकर कल्याणक | Jain Parv"
    return "दैनिक पंचांग व शुभ मुहूर्त 2026 | Daily Panchang"

def compute_scheduled_publish_time(slot: str, target_date: date) -> str:
    """
    Computes ISO 8601 UTC timestamp for YouTube scheduled publishing in IST.
    Morning: 06:00 AM IST (00:30 UTC)
    Afternoon: 12:30 PM IST (07:00 UTC)
    Evening: 07:00 PM IST (13:30 UTC)
    Guarantees the scheduled time gives YouTube at least 30 minutes of processing buffer for 4K.
    """
    ist_tz = timezone(timedelta(hours=5.5))
    now_ist = datetime.now(ist_tz)

    if slot == "morning":
        slot_hour, slot_minute = 6, 0
    elif slot == "afternoon":
        slot_hour, slot_minute = 12, 30
    elif slot == "evening":
        slot_hour, slot_minute = 19, 0
    else:
        slot_hour, slot_minute = 6, 0

    target_dt_ist = datetime(target_date.year, target_date.month, target_date.day, slot_hour, slot_minute, tzinfo=ist_tz)

    # Buffer of at least 30 minutes so YouTube has time to process 4K Ultra HD
    min_buffer = now_ist + timedelta(minutes=30)
    if target_dt_ist < min_buffer:
        target_dt_ist = min_buffer

    target_dt_utc = target_dt_ist.astimezone(timezone.utc)
    return target_dt_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def generate_daily_payload(target_date: date = None, slot: str = "morning") -> dict:
    """
    Main function: Generates full real-time panchang props payload with slots.
    """
    if target_date is None:
        target_date = (datetime.now(timezone.utc) + timedelta(hours=float(os.getenv("PANCHANG_TZ", "5.5")))).date()

    # Evening slot calculates advance panchang for tomorrow
    eval_date = target_date + timedelta(days=1) if slot == "evening" else target_date

    lat = float(os.getenv('PANCHANG_LAT', '23.1765'))
    lon = float(os.getenv('PANCHANG_LON', '75.7885'))
    tz = float(os.getenv('PANCHANG_TZ', '5.5'))
    location_name = os.getenv('PANCHANG_LOCATION', 'Ujjain, India')
    timezone_label = os.getenv('PANCHANG_TIMEZONE_LABEL', f'UTC{tz:+g}')
    panchang = get_complete_panchang(eval_date, lat=lat, lon=lon, tz=tz)
    panchang['location_name'] = location_name
    panchang['timezone_label'] = timezone_label
    festivals = detect_todays_festivals(panchang, eval_date)
    primary_event = festivals[0] # Highest priority event

    theme = primary_event.get("theme", "temple")

    # Slot-specific customization for maximum engagement
    if slot == "afternoon":
        title_disp = f"आज का शुभ चौघड़िया ({panchang['weekday']})"
        label1 = "अमृत चौघड़िया"
        val1 = panchang.get("amrit_choghadiya", "प्रातःकाल")
        label2 = "शुभ चौघड़िया"
        val2 = panchang.get("shubh_choghadiya", "दोपहर बाद")
        label3 = "शुभ अभिजीत मुहूर्त"
        val3 = panchang["abhijit"]
        footer = f"🧭 दिशाशूल: {panchang.get('disha_shool', 'पश्चिम')} | राहुकाल: {panchang['rahu_kaal']}"
    elif slot == "evening":
        title_disp = f"कल का पंचांग (अग्रिम दर्शन)"
        label1 = "कल की तिथि व पक्ष"
        val1 = f"{panchang['paksha']}, {panchang['tithi_name']}"
        label2 = "कल का नक्षत्र"
        val2 = f"{panchang['nakshatra_name']}, {panchang['yoga_name']}"
        label3 = "कल का शुभ अभिजीत मुहूर्त"
        val3 = panchang["abhijit"]
        footer = f"⚠️ कल का राहुकाल: {panchang['rahu_kaal']}"
    else:
        title_disp = primary_event["title"]
        label1 = primary_event["label1"]
        val1 = primary_event["val1"]
        label2 = primary_event["label2"]
        val2 = primary_event["val2"]
        label3 = primary_event["label3"]
        val3 = primary_event["val3"]
        footer = primary_event["footer"]

    seo = generate_seo_metadata(
        {"title": title_disp, "label1": label1, "val1": val1, "label2": label2, "val2": val2, "label3": label3, "val3": val3, "footer": footer},
        panchang,
        slot=slot
    )
    playlist = get_target_playlist(primary_event["religion"], title_disp, slot=slot)
    publish_at = compute_scheduled_publish_time(slot, target_date)

    payload = {
        "religion": primary_event["religion"],
        "title": title_disp,
        "dateDisplay": panchang["date_display"],
        "label1": label1,
        "val1": val1,
        "label2": label2,
        "val2": val2,
        "label3": label3,
        "val3": val3,
        "footer": footer,
        "theme": theme,
        "slot": slot,
        "playlist_name": playlist,
        "publish_at": publish_at,
        "panchang_raw": panchang,
        "locationName": location_name,
        "timezoneLabel": timezone_label,
        **seo,
    }

    return payload

def main():
    parser = argparse.ArgumentParser(description="PavitraPanchang365 Real-Time Engine")
    parser.add_argument("--date", help="Target date in YYYY-MM-DD format (defaults to today in IST)")
    parser.add_argument("--slot", default="morning", choices=["morning", "afternoon", "evening", "auto"],
                        help="Publishing slot: morning, afternoon, evening, or auto")
    parser.add_argument("--out", default="out/daily_props.json", help="Path to write JSON output")
    args = parser.parse_args()

    # Auto-detect slot based on current IST hour
    slot = args.slot
    if slot == "auto":
        ist_hour = (datetime.now(timezone.utc) + timedelta(hours=5.5)).hour
        if ist_hour < 10:
            slot = "morning"
        elif ist_hour < 16:
            slot = "afternoon"
        else:
            slot = "evening"

    if args.date:
        parts = [int(p) for p in args.date.split("-")]
        target_date = date(parts[0], parts[1], parts[2])
    else:
        target_date = (datetime.now(timezone.utc) + timedelta(hours=5.5)).date()

    payload = generate_daily_payload(target_date, slot=slot)

    out_path = args.out
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print("==========================================================")
    print("      PavitraPanchang365 Real-Time Engine (Active)        ")
    print("==========================================================")
    print(f"Date:     {payload['dateDisplay']} (Slot: {slot})")
    print(f"Event:    [{payload['religion']}] {payload['title']}")
    print(f"Playlist: {payload['playlist_name']}")
    print(f"Card 1:   {payload['label1']} -> {payload['val1']}")
    print(f"Card 2:   {payload['label2']} -> {payload['val2']}")
    print(f"Card 3:   {payload['label3']} -> {payload['val3']}")
    print(f"Footer:   {payload['footer']}")
    print(f"Schedule: {payload['publish_at']}")
    print(f"Props:    Saved to {out_path}")
    print("==========================================================")

if __name__ == "__main__":
    main()
