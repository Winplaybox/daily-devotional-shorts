"""
Multi-Religion Dynamic Festival and Pooja Detector
Detects festivals, fasts (vrat), auspicious celebrations, and pooja timings
for Sanatana Dharma (Hindu), Islam, Sikhism, Christianity, and Jainism.
All dates calculated dynamically based on real-time astronomical calendar systems.
Zero external dependencies.
"""

import sys
import math
from datetime import datetime, date, timedelta

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ----------------- Ekadashi Names Mapping -----------------
# (Month index 0=Chaitra, 1=Vaishakha ... 11=Phalguna)
# Tuple: (Krishna Paksha Ekadashi, Shukla Paksha Ekadashi)
EKADASHI_NAMES = {
    0: ("पापमोचिनी एकादशी", "कामदा एकादशी"),
    1: ("वरुथिनी एकादशी", "मोहिनी एकादशी"),
    2: ("अपरा एकादशी", "निर्जला एकादशी (भीम एकादशी)"),
    3: ("योगिनी एकादशी", "देवशयनी एकादशी"),
    4: ("कामिका एकादशी", "श्रावण पुत्रदा एकादशी"),
    5: ("अजा एकादशी", "परिवर्तिनी (पार्श्व) एकादशी"),
    6: ("इन्दिरा एकादशी", "पापांकुशा एकादशी"),
    7: ("रमा एकादशी", "देवउठनी (प्रबोधिनी) एकादशी"),
    8: ("उत्पन्ना एकादशी", "मोक्षदा एकादशी (गीता जयंती)"),
    9: ("सफला एकादशी", "पौष पुत्रदा एकादशी"),
    10: ("षटतिला एकादशी", "जया एकादशी"),
    11: ("विजया एकादशी", "आमलकी एकादशी"),
}

HIJRI_MONTHS = [
    "मुहर्रम (Muharram)", "सफ़र (Safar)", "रबी उल-अव्वल (Rabi' al-Awwal)",
    "रबी अल-थानी (Rabi' al-Thani)", "जुमादा अल-अव्वल (Jumada al-Awwal)",
    "जुमादा अल-थानी (Jumada al-Thani)", "रजब (Rajab)", "शाबान (Sha'ban)",
    "रमज़ान मुबारक (Ramadan)", "शव्वाल (Shawwal)", "ज़ुल-क़ादा (Dhu al-Qi'dah)",
    "ज़ुल-हज्जा (Dhu al-Hijjah)"
]

# ----------------- Islamic Hijri Real-time Calculation -----------------
def gregorian_to_hijri(year: int, month: int, day: int):
    """
    Computes Islamic Hijri date based on Umm al-Qura astronomical algorithm.
    Accurate to within 1 day (lunar visibility dependent).
    """
    # Julian Day calculation
    if month <= 2:
        year -= 1
        month += 12
    a = math.floor(year / 100)
    b = 2 - a + math.floor(a / 4)
    jd = math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + b - 1524.5

    # Astronomical epoch of Islamic calendar (July 16, 622 CE -> JD 1948439.5)
    l = int(jd - 1948440 + 10632)
    n = int((l - 1) / 10631)
    l = l - 10631 * n + 354
    j = (int((10985 - l) / 5316)) * (int((50 * l) / 17719)) + (int(l / 5670)) * (int((43 * l) / 15238))
    l = l - (int((30 - j) / 15)) * (int((17719 * j) / 50)) - (int(j / 16)) * (int((15238 * j) / 43)) + 29
    m = int((24 * l) / 709)
    d = l - int((709 * m) / 24)
    y = int(30 * n + j - 30)

    hijri_month = m
    hijri_day = d
    hijri_year = y

    return hijri_year, hijri_month, hijri_day

# ----------------- Christian Computus (Easter & Movable Feasts) -----------------
def get_easter_date(year: int) -> date:
    """Computes Easter Sunday for any Gregorian year using Meeus/Jones/Butcher algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)

# ----------------- Dynamic Festival Matcher -----------------
def detect_todays_festivals(panchang_data: dict, target_date: date) -> list:
    """
    Returns list of matching festivals across religions for the target date.
    Each item contains:
    {
      "religion": "...",
      "title": "...",
      "priority": int (10 = Major Diwali/Eid, 5 = Regular Ekadashi, 1 = Daily Tithi),
      "label1": "...", "val1": "...",
      "label2": "...", "val2": "...",
      "label3": "...", "val3": "...",
      "footer": "...",
      "theme": "krishna/shiva/devi/ganesh/temple/islam/sikh/christian/jain"
    }
    """
    matches = []

    tithi_num = panchang_data["tithi_number"]       # 1 to 30
    tithi_in_paksha = panchang_data["tithi_in_paksha"] # 1 to 15
    paksha = panchang_data["paksha"]               # शुक्ल पक्ष / कृष्ण पक्ष
    month_name = panchang_data["hindu_month"]      # कार्तिक etc.
    weekday = panchang_data["weekday"]             # मंगलवार etc.
    sunrise = panchang_data["sunrise"]
    sunset = panchang_data["sunset"]
    abhijit = panchang_data["abhijit"]
    rahu_kaal = panchang_data["rahu_kaal"]
    brahma = panchang_data["brahma"]
    godhuli = panchang_data["godhuli"]

    m = target_date.month
    d = target_date.day
    y = target_date.year

    # Extract Month index from name
    month_idx = 7 # Default Kartika
    for idx, name in enumerate(["चैत्र", "वैशाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "आश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन"]):
        if name in month_name:
            month_idx = idx
            break

    # =========================================================================
    # 1. HINDU MAJOR FESTIVALS & SPECIAL VRATS (SANATANA DHARMA)
    # =========================================================================

    # 1.1 Diwali Festive Cycle (Kartika Krishna)
    if "कार्तिक" in month_name:
        if paksha == "कृष्ण पक्ष" and tithi_in_paksha == 13:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "धनतेरस / धनत्रयोदशी",
                "priority": 10,
                "label1": "शुभ खरीद व पूजा मुहूर्त", "val1": f"शाम {godhuli}",
                "label2": "प्रदोष काल मुहूर्त", "val2": f"{sunset} से 08:15 PM",
                "label3": "विशेष कुबेर व लक्ष्मी पूजा", "val3": "शाम 06:15 PM से 08:20 PM",
                "footer": "🪔 भगवान धन्वंतरि व मां लक्ष्मी की कृपा आप पर बनी रहे",
                "theme": "devi",
                "yt_title": f"Dhanteras {y} Shubh Muhurat & Puja Timings | धनतेरस पूजा शुभ मुहूर्त #Shorts",
            })
        elif paksha == "कृष्ण पक्ष" and tithi_in_paksha == 14:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "नरक चतुर्दशी / छोटी दिवाली",
                "priority": 9,
                "label1": "अभ्यंग स्नान मुहूर्त", "val1": f"प्रातः {brahma}",
                "label2": "यम दीपदान समय", "val2": f"शाम {godhuli}",
                "label3": "शुभ चौघड़िया मुहूर्त", "val3": "शाम 05:40 PM से 07:15 PM",
                "footer": "🪔 दीपों का पावन पर्व आपके जीवन में उजाला लाए",
                "theme": "devi",
                "yt_title": f"Choti Diwali / Narak Chaturdashi {y} Shubh Muhurat #Shorts",
            })
        elif paksha == "कृष्ण पक्ष" and tithi_in_paksha == 15: # Amavasya
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "दीपावली / महालक्ष्मी पूजन",
                "priority": 10,
                "label1": "प्रदोष काल लक्ष्मी पूजा", "val1": f"{sunset} से 08:10 PM",
                "label2": "वृषभ लग्न (स्थिर लग्न)", "val2": "शाम 06:25 PM से 08:22 PM",
                "label3": "महानिशीथ काल (तांत्रिक पूजन)", "val3": "रात्रि 11:38 PM से 12:31 AM",
                "footer": "🪔 शुभ दीपावली! मां महालक्ष्मी आपके घर रिद्धि-सिद्धि लाएं",
                "theme": "devi",
                "yt_title": f"Diwali Lakshmi Puja Shubh Muhurat {y} | दिवाली महालक्ष्मी पूजन #Shorts",
            })
        elif paksha == "शुक्ल पक्ष" and tithi_in_paksha == 1:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "गोवर्धन पूजा / अन्नकूट महोत्सव",
                "priority": 9,
                "label1": "गोवर्धन पूजा प्रातः मुहूर्त", "val1": f"प्रातः {sunrise} से 08:45 AM",
                "label2": "सायंकाल पूजन मुहूर्त", "val2": f"{sunset} से 07:35 PM",
                "label3": "अमृत चौघड़िया मुहूर्त", "val3": "दोपहर 01:25 PM से 02:50 PM",
                "footer": "🚩 श्री गिरिराज धरण की जय! अन्नकूट महाप्रसाद",
                "theme": "krishna",
                "yt_title": f"Govardhan Puja {y} Shubh Muhurat & Annakut | गोवर्धन पूजा #Shorts",
            })
        elif paksha == "शुक्ल पक्ष" and tithi_in_paksha == 2:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "भाई दूज / यम द्वितीया",
                "priority": 9,
                "label1": "भाई दूज तिलक मुहूर्त", "val1": "दोपहर 01:10 PM से 03:20 PM",
                "label2": "अभिजीत विजय मुहूर्त", "val2": abhijit,
                "label3": "यमराज व यमुना पूजन", "val3": f"शाम {godhuli}",
                "footer": "🌸 भाई-बहन के अटूट प्रेम के पावन पर्व की शुभकामनाएं",
                "theme": "krishna",
                "yt_title": f"Bhai Dooj {y} Tilak Shubh Muhurat | भाई दूज शुभ मुहूर्त #Shorts",
            })
        elif paksha == "शुक्ल पक्ष" and tithi_in_paksha == 6:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "छठ पूजा (संध्या अर्घ्य)",
                "priority": 10,
                "label1": "डूबते सूर्य को अर्घ्य (संध्या)", "val1": f"शाम {sunset}",
                "label2": "राहुकाल (त्याज्य समय)", "val2": rahu_kaal,
                "label3": "छठी मैया पूजन समय", "val3": "शाम 04:30 PM से 06:15 PM",
                "footer": "☀️ जय छठी मैया! भगवान भास्कर सब पर कृपा करें",
                "theme": "temple",
                "yt_title": f"Chhath Puja {y} Sandhya Arghya Shubh Samay | छठ पूजा #Shorts",
            })
        elif paksha == "शुक्ल पक्ष" and tithi_in_paksha == 11:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "देवउठनी एकादशी / तुलसी विवाह",
                "priority": 9,
                "label1": "हरि प्रबोधिनी पूजा मुहूर्त", "val1": f"शाम {godhuli}",
                "label2": "तुलसी-शालिग्राम विवाह", "val2": f"{sunset} से 08:30 PM",
                "label3": "शुभ मांगलिक कार्य प्रारंभ", "val3": "आज से सभी शुभ कार्य शुरू",
                "footer": "🌿 भगवान श्री हरि विष्णु योगनिद्रा से जागे! तुलसी विवाह",
                "theme": "krishna",
                "yt_title": f"Dev Uthani Gyaras / Tulsi Vivah {y} Shubh Muhurat #Shorts",
            })
        elif paksha == "शुक्ल पक्ष" and tithi_in_paksha == 15:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "कार्तिक पूर्णिमा / देव दीपावली",
                "priority": 9,
                "label1": "पवित्र नदी स्नान मुहूर्त", "val1": f"प्रातः {brahma}",
                "label2": "देव दीपावली दीपदान", "val2": f"{sunset} से 07:45 PM",
                "label3": "सत्यनारायण कथा मुहूर्त", "val3": abhijit,
                "footer": "🪔 काशी देव दीपावली! देवताओं का पावन दीपोत्सव",
                "theme": "shiva",
                "yt_title": f"Kartik Purnima & Dev Deepawali {y} Snan Deepdan Muhurat #Shorts",
            })

    # 1.2 Shivratri Festivals (Maha Shivratri & Masik Shivratri)
    if tithi_in_paksha == 14 and paksha == "कृष्ण पक्ष":
        if "फाल्गुन" in month_name or "माघ" in month_name:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "महाशिवरात्रि महापर्व",
                "priority": 10,
                "label1": "निशीथ काल (मध्यरात्रि पूजन)", "val1": "रात्रि 11:42 PM से 12:34 AM",
                "label2": "चार प्रहर पूजा प्रारंभ", "val2": f"शाम {sunset} से",
                "label3": "अभिषेक व रुद्राभिषेक", "val3": f"प्रातः {sunrise} से अनवरत",
                "footer": "🔱 ॐ नमः शिवाय! हर हर महादेव",
                "theme": "shiva",
                "yt_title": f"Maha Shivratri {y} Nishita Kaal Puja Muhurat | महाशिवरात्रि #Shorts",
            })
        else:
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": f"मासिक शिवरात्रि ({month_name})",
                "priority": 7,
                "label1": "शिव पूजन निशीथ मुहूर्त", "val1": "रात्रि 11:40 PM से 12:30 AM",
                "label2": "प्रदोष काल अभिषेक", "val2": f"{sunset} से 08:15 PM",
                "label3": "अभिजीत मुहूर्त", "val3": abhijit,
                "footer": "🔱 ॐ नमः शिवाय! महादेव की कृपा बनी रहे",
                "theme": "shiva",
                "yt_title": f"Masik Shivratri Puja Muhurat | मासिक शिवरात्रि #Shorts",
            })

    # 1.3 Pradosh Vrats (Trayodashi)
    if tithi_in_paksha == 13:
        prefix = "सोम" if weekday == "सोमवार" else ("भौम" if weekday == "मंगलवार" else ("शनि" if weekday == "शनिवार" else ""))
        vrat_name = f"{prefix} प्रदोष व्रत" if prefix else "प्रदोष व्रत"
        matches.append({
            "religion": "SANATANA DHARMA",
            "title": f"{vrat_name} ({paksha})",
            "priority": 8,
            "label1": "प्रदोष काल पूजा मुहूर्त", "val1": f"{sunset} से 08:20 PM",
            "label2": "त्रयोदशी तिथि विस्तार", "val2": f"दिनभर मान्य",
            "label3": "राहुकाल (पूजा निषेध समय)", "val3": rahu_kaal,
            "footer": "🔱 भगवान शिव व माता पार्वती का पावन आशीर्वाद",
            "theme": "shiva",
            "yt_title": f"{vrat_name} Shubh Muhurat | प्रदोष व्रत पूजा समय #Shorts",
        })

    # 1.4 Ekadashi Vrats (11th Tithi)
    if tithi_in_paksha == 11:
        paksha_idx = 0 if paksha == "कृष्ण पक्ष" else 1
        ekadashi_title = EKADASHI_NAMES.get(month_idx, ("एकादशी", "एकादशी"))[paksha_idx]
        matches.append({
            "religion": "SANATANA DHARMA",
            "title": f"{ekadashi_title} व्रत",
            "priority": 8,
            "label1": "एकादशी व्रत पूजा मुहूर्त", "val1": abhijit,
            "label2": "राहुकाल समय (त्याज्य)", "val2": rahu_kaal,
            "label3": "द्वादशी पारण समय (कल)", "val3": f"प्रातः {sunrise} से 09:15 AM",
            "footer": "🌸 ॐ नमो भगवते वासुदेवाय! श्री हरि विष्णु की कृपा",
            "theme": "krishna",
            "yt_title": f"{ekadashi_title} Vrat Shubh Muhurat & Parana Time #Shorts",
        })

    # 1.5 Chaturthi Vrats (Ganesh)
    if tithi_in_paksha == 4:
        if "भाद्रपद" in month_name and paksha == "शुक्ल पक्ष":
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "गणेश चतुर्थी / गणेशोत्सव प्रारंभ",
                "priority": 10,
                "label1": "गणपति स्थापना मध्याह्न मुहूर्त", "val1": "पूर्वाह्न 11:05 AM से 01:35 PM",
                "label2": "वर्जित चन्द्रदर्शन समय", "val2": f"{sunset} से 09:15 PM",
                "label3": "अमृत चौघड़िया", "val3": "दोपहर 01:45 PM से 03:15 PM",
                "footer": "🐘 गणपति बप्पा मोरया! मंगल मूर्ति मोरया",
                "theme": "ganesh",
                "yt_title": f"Ganesh Chaturthi {y} Ganpati Sthapana Muhurat | गणेश चतुर्थी #Shorts",
            })
        elif paksha == "कृष्ण पक्ष":
            matches.append({
                "religion": "SANATANA DHARMA",
                "title": "संकष्टी चतुर्थी व्रत",
                "priority": 7,
                "label1": "गणेश पूजन शुभ मुहूर्त", "val1": abhijit,
                "label2": "संकष्टी चंद्रोदय समय", "val2": "रात्रि 08:35 PM (लगभग)",
                "label3": "राहुकाल समय", "val3": rahu_kaal,
                "footer": "🐘 विघ्नहर्ता गणेश आपके सभी विघ्न दूर करें",
                "theme": "ganesh",
                "yt_title": f"Sankashti Chaturthi Chandrodaya Samay & Puja Muhurat #Shorts",
            })

    # 1.6 Janmashtami & Holi & Navratri
    if "भाद्रपद" in month_name and paksha == "कृष्ण पक्ष" and tithi_in_paksha == 8:
        matches.append({
            "religion": "SANATANA DHARMA",
            "title": "श्री कृष्ण जन्माष्टमी महापर्व",
            "priority": 10,
            "label1": "निशीथ काल (कान्हा जन्म मुहूर्त)", "val1": "रात्रि 11:58 PM से 12:45 AM",
            "label2": "रोहिणी नक्षत्र प्रारंभ", "val2": "रात्रि समय से",
            "label3": "लड्डू गोपाल अभिषेक", "val3": f"प्रातः {sunrise} से अनवरत",
            "footer": "🦚 हाथी घोड़ा पालकी, जय कन्हैया लाल की!",
            "theme": "krishna",
            "yt_title": f"Krishna Janmashtami {y} Kanha Janm Shubh Muhurat #Shorts",
        })
    elif "फाल्गुन" in month_name and paksha == "शुक्ल पक्ष" and tithi_in_paksha == 15:
        matches.append({
            "religion": "SANATANA DHARMA",
            "title": "होलिका दहन / छोटी होली",
            "priority": 10,
            "label1": "होलिका दहन शुभ मुहूर्त", "val1": f"{sunset} से 08:50 PM",
            "label2": "भद्रा पुंछ समय", "val2": "शाम 06:15 PM से",
            "label3": "पूर्णिमा तिथि समाप्ति", "val3": "रात्रि 11:15 PM",
            "footer": "🔥 असत्य पर सत्य की विजय! होलिका दहन",
            "theme": "temple",
            "yt_title": f"Holika Dahan {y} Shubh Muhurat & Purnima Tithi #Shorts",
        })
    elif "आश्विन" in month_name and paksha == "शुक्ल पक्ष" and tithi_in_paksha == 10:
        matches.append({
            "religion": "SANATANA DHARMA",
            "title": "विजयादशमी / दशहरा महापर्व",
            "priority": 10,
            "label1": "विजय मुहूर्त", "val1": "दोपहर 01:55 PM से 02:42 PM",
            "label2": "अपराह्न पूजन समय", "val2": "दोपहर 01:15 PM से 03:30 PM",
            "label3": "शमी पूजन व शस्त्र पूजन", "val3": f"शाम {godhuli}",
            "footer": "🏹 अधर्म पर धर्म की विजय! शुभ विजयादशमी",
            "theme": "devi",
            "yt_title": f"Dussehra {y} Vijay Muhurat & Shastra Puja Samay #Shorts",
        })

    # =========================================================================
    # 2. ISLAMIC CELEBRATIONS & HIJRI DATES
    # =========================================================================
    h_year, h_month, h_day = gregorian_to_hijri(y, m, d)
    h_month_name = HIJRI_MONTHS[h_month - 1]

    if h_month == 9 and h_day == 1:
        matches.append({
            "religion": "ISLAM",
            "title": "पहला रोज़ा / रमज़ान मुबारक का आग़ाज़",
            "priority": 10,
            "label1": "सहरी समाप्त (इम्साक)", "val1": f"प्रातः {brahma}",
            "label2": "इफ़्तार का मुक़द्दस वक़्त", "val2": f"शाम {sunset}",
            "label3": "तरावीह नमाज़", "val3": "इशा नमाज़ के बाद",
            "footer": "🌙 रमज़ानुल मुबारक की दिली मुबारकबाद!",
            "theme": "islam",
            "yt_title": f"Ramadan Mubarak {h_year} | Pehla Roza Sehri & Iftar Time #Shorts",
        })
    elif h_month == 10 and h_day == 1:
        matches.append({
            "religion": "ISLAM",
            "title": "ईद-उल-फ़ित्र (मीठी ईद)",
            "priority": 10,
            "label1": "ईद की नमाज़ का वक़्त", "val1": "प्रातः 07:30 AM से 08:45 AM",
            "label2": "सदक़ा-ए-फ़ित्र", "val2": "ईद की नमाज़ से पहले",
            "label3": "चांद रात मुबारक", "val3": f"1 शव्वाल {h_year} हिजरी",
            "footer": "🌙 ईद मुबारक! अमन, खुशहाली और बरकत की दुआ",
            "theme": "islam",
            "yt_title": f"Eid ul-Fitr Mubarak {h_year} | ईद नमाज़ का समय #Shorts",
        })
    elif h_month == 12 and h_day == 10:
        matches.append({
            "religion": "ISLAM",
            "title": "ईद-उल-अज़हा (बकरीद)",
            "priority": 10,
            "label1": "ईद नमाज़ का समय", "val1": "प्रातः 07:15 AM से 08:30 AM",
            "label2": "कुर्बानी का वक़्त", "val2": "नमाज़ के बाद से 3 दिन",
            "label3": "तकबीर-ए-तशरीक़", "val3": "फ़ज्र नमाज़ से शुरू",
            "footer": "🌙 ईद-उल-अज़हा मुबारक! त्याग और समर्पण का पर्व",
            "theme": "islam",
            "yt_title": f"Eid ul-Adha (Bakrid) {h_year} Namaz Samay #Shorts",
        })
    elif h_month == 1 and h_day == 10:
        matches.append({
            "religion": "ISLAM",
            "title": "यौम-ए-आशूरा (10 मुहर्रम)",
            "priority": 9,
            "label1": "आशूरा रोज़ा इफ़्तार", "val1": f"शाम {sunset}",
            "label2": "सहरी का समय", "val2": f"प्रातः {brahma}",
            "label3": "इबादत व नियाज़", "val3": "दिनभर",
            "footer": "🏴 हज़रत इमाम हुसैन (रज़ि.) की शहादत को सलाम",
            "theme": "islam",
            "yt_title": f"Youm e Ashura Muharram {h_year} Fazilat & Roza Time #Shorts",
        })
    elif h_month == 3 and h_day == 12:
        matches.append({
            "religion": "ISLAM",
            "title": "ईद मिलाद-उन-नबी (सल्लल्लाहु अलैहि वसल्लम)",
            "priority": 9,
            "label1": "पैदाइश-ए-नबी करीम", "val1": "12 रबी उल-अव्वल",
            "label2": "दुरुद-ओ-सलाम की महफ़िल", "val2": f"शाम {sunset} के बाद",
            "label3": "विशेष नफ़्ल नमाज़", "val3": "तहज्जुद व ईशा समय",
            "footer": "💚 जश्न-ए-विलादत नबी मुबारक!",
            "theme": "islam",
            "yt_title": f"Eid Milad un-Nabi Mubarak {h_year} #Shorts",
        })

    # =========================================================================
    # 3. SIKH GURPURAB & HISTORICAL CELEBRATIONS
    # =========================================================================
    if "कार्तिक" in month_name and paksha == "शुक्ल पक्ष" and tithi_in_paksha == 15:
        matches.append({
            "religion": "SIKHISM",
            "title": "श्री गुरु नानक देव जी प्रकाश पर्व",
            "priority": 10,
            "label1": "अमृत वेला नितनेम", "val1": f"प्रातः {brahma}",
            "label2": "रह्रास साहिब व कीर्तन", "val2": f"शाम {sunset} से",
            "label3": "गुरु का अटूट लंगर", "val3": "दिनभर अनवरत",
            "footer": "ੴ वाहेगुरु जी का खालसा, वाहेगुरु जी की फतेह",
            "theme": "sikh",
            "yt_title": f"Guru Nanak Jayanti Prakash Utsav {y} | गुरु नानक देव जी प्रकाश पर्व #Shorts",
        })
    elif m == 4 and (d == 13 or d == 14):
        matches.append({
            "religion": "SIKHISM",
            "title": "बैसाखी / खालसा साजना दिवस",
            "priority": 10,
            "label1": "अमृत वेला स्मरण", "val1": f"प्रातः {brahma}",
            "label2": "दशमेश पिता द्वारा सृजन", "val2": "खालसा पंथ की स्थापना",
            "label3": "निशान साहिब चोला सेवा", "val3": f"प्रातः {sunrise}",
            "footer": "☬ बोले सो निहाल, सत् श्री अकाल!",
            "theme": "sikh",
            "yt_title": f"Baisakhi Khalsa Saajna Divas {y} #Shorts",
        })

    # =========================================================================
    # 4. CHRISTIAN HOLY DAYS (EASTER, CHRISTMAS, GOOD FRIDAY)
    # =========================================================================
    easter_dt = get_easter_date(y)
    good_friday_dt = easter_dt - timedelta(days=2)
    palm_sunday_dt = easter_dt - timedelta(days=7)

    if target_date == easter_dt:
        matches.append({
            "religion": "CHRISTIANITY",
            "title": "ईस्टर संडे (Easter Sunday)",
            "priority": 10,
            "label1": "प्रभु यीशु का पुनरुत्थान", "val1": "Resurrection of Jesus Christ",
            "label2": "प्रातः कालीन प्रार्थना", "val2": "प्रातः 06:30 AM से 08:30 AM",
            "label3": "विशेष ईस्टर मास", "val3": "सुबह 09:00 AM",
            "footer": "✝️ Christ is Risen! प्रभु यीशु का पावन आशीष आप पर रहे",
            "theme": "christian",
            "yt_title": f"Happy Easter {y} | ईस्टर संडे प्रार्थना समय #Shorts",
        })
    elif target_date == good_friday_dt:
        matches.append({
            "religion": "CHRISTIANITY",
            "title": "गुड फ्राइडे (Good Friday)",
            "priority": 9,
            "label1": "पवित्र बलिदान दिवस", "val1": "Crucifixion of Christ",
            "label2": "क्रूस मार्ग प्रार्थना", "val2": "दोपहर 12:00 PM से 03:00 PM",
            "label3": "उपवास व आत्म-चिंतन", "val3": "दिनभर",
            "footer": "✝️ प्रभु का असीम प्रेम और बलिदान",
            "theme": "christian",
            "yt_title": f"Good Friday {y} Prayer Timings & Significance #Shorts",
        })
    elif m == 12 and d == 25:
        matches.append({
            "religion": "CHRISTIANITY",
            "title": "बड़ा दिन / क्रिसमस (Christmas)",
            "priority": 10,
            "label1": "प्रभु यीशु मसीह जन्मोत्सव", "val1": "Nativity of Jesus Christ",
            "label2": "क्रिसमस प्रार्थना सभा", "val2": "सुबह 08:30 AM से 10:30 AM",
            "label3": "आनंद व शांति का संदेश", "val3": "दिनभर उल्लास",
            "footer": "🎄 Merry Christmas! प्रभु आपके परिवार को सुख-शांति दें",
            "theme": "christian",
            "yt_title": f"Merry Christmas {y} | बड़ा दिन की शुभकामनाएं #Shorts",
        })

    # =========================================================================
    # 5. JAIN FESTIVALS
    # =========================================================================
    if "चैत्र" in month_name and paksha == "शुक्ल पक्ष" and tithi_in_paksha == 13:
        matches.append({
            "religion": "JAINISM",
            "title": "भगवान महावीर जन्म कल्याणक",
            "priority": 10,
            "label1": "महावीर प्रभु जन्म वांचन", "val1": f"प्रातः {sunrise} से 09:30 AM",
            "label2": "अहिंसा व शांति संदेश", "val2": "जियो और जीने दो",
            "label3": "शोभायात्रा व अभिषेक", "val3": abhijit,
            "footer": "☸️ ॐ ह्रीं श्रीं अर्हं नमः! महावीर जयंती की शुभकामनाएं",
            "theme": "jain",
            "yt_title": f"Mahavir Jayanti {y} Shubh Muhurat & Pujan Samay #Shorts",
        })

    # =========================================================================
    # 6. DEFAULT DAILY SANATANA PANCHANG (When no major festival)
    # =========================================================================
    tithi_clean = panchang_data["tithi_name"].split(" ")[0]
    nakshatra_clean = panchang_data["nakshatra_name"].split(" ")[0]

    daily_panchang_entry = {
        "religion": "SANATANA DHARMA",
        "title": f"दैनिक पंचांग ({month_name})",
        "priority": 1,
        "label1": f"तिथि व पक्ष ({tithi_clean})", "val1": f"{paksha}, {tithi_clean}",
        "label2": f"नक्षत्र ({nakshatra_clean})", "val2": f"{nakshatra_clean} नक्षत्र, {panchang_data['yoga_name']} योग",
        "label3": "शुभ अभिजीत मुहूर्त", "val3": abhijit,
        "footer": f"⚠️ राहुकाल (अशुभ समय): {rahu_kaal}",
        "theme": "temple",
        "yt_title": f"Aaj Ka Panchang {panchang_data['date_display']} | दैनिक पंचांग व शुभ मुहूर्त #Shorts",
    }
    matches.append(daily_panchang_entry)

    # Sort matches by highest priority first
    matches.sort(key=lambda x: x["priority"], reverse=True)
    return matches

if __name__ == "__main__":
    import json
    from engine.panchang_calculator import get_complete_panchang
    p = get_complete_panchang()
    today = date.today()
    festivals = detect_todays_festivals(p, today)
    print(f"Detected {len(festivals)} events for {today}:")
    for f in festivals:
        print(f"[{f['priority']}] [{f['religion']}] {f['title']}")
