"""
Astronomical Panchang Calculator
Accurate real-time calculations based on Jean Meeus Astronomical Algorithms.
Computes Tithi, Nakshatra, Yoga, Karana, Sunrise, Sunset, Rahukaal, Abhijit Muhurat,
Brahma Muhurat, Godhuli Muhurat, and Choghadiya for any date and location.
Zero external dependencies (uses standard math and datetime).
"""

import sys
import math
from datetime import datetime, timedelta, timezone

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Reference location: Ujjain, Madhya Pradesh (Prime Meridian of ancient Hindu Astronomy)
# Can be configured for Delhi, Varanasi, Mumbai, etc.
DEFAULT_LAT = 23.1765
DEFAULT_LON = 75.7885
DEFAULT_TZ = 5.5  # IST (UTC +5:30)

# Lahiri Ayanamsha (Chitra Paksha) reference
# At J2000.0 (JD 2451545.0), Lahiri Ayanamsha was ~ 23.8569 degrees (23°51'25")
# Precession rate: ~ 50.29 arcseconds/year
AYANAMSHA_J2000 = 23.8569
PRECESSION_PER_CENTURY = 1.3963  # degrees per Julian century

# ----------------- Vernacular Names -----------------
TITHI_NAMES = [
    "प्रतिपदा (Pratipada)", "द्वितीया (Dwitiya)", "तृतीया (Tritiya)", "चतुर्थी (Chaturthi)",
    "पंचमी (Panchami)", "षष्ठी (Shashthi)", "सप्तमी (Saptami)", "अष्टमी (Ashtami)",
    "नवमी (Navami)", "दशमी (Dashami)", "एकादशी (Ekadashi)", "द्वादशी (Dwadashi)",
    "त्रयोदशी (Trayodashi)", "चतुर्दशी (Chaturdashi)", "पूर्णिमा (Purnima)",
    "प्रतिपदा (Pratipada)", "द्वितीया (Dwitiya)", "तृतीया (Tritiya)", "चतुर्थी (Chaturthi)",
    "पंचमी (Panchami)", "षष्ठी (Shashthi)", "सप्तमी (Saptami)", "अष्टमी (Ashtami)",
    "नवमी (Navami)", "दशमी (Dashami)", "एकादशी (Ekadashi)", "द्वादशी (Dwadashi)",
    "त्रयोदशी (Trayodashi)", "चतुर्दशी (Chaturdashi)", "अमावस्या (Amavasya)"
]

NAKSHATRA_NAMES = [
    "अश्विनी (Ashwini)", "भरणी (Bharani)", "कृत्तिका (Krittika)", "रोहिणी (Rohini)",
    "मृगशिरा (Mrigashirsha)", "आर्द्रा (Ardra)", "पुनर्वसु (Punarvasu)", "पुष्य (Pushya)",
    "आश्लेषा (Ashlesha)", "मघा (Magha)", "पूर्वाफाल्गुनी (Purva Phalguni)", "उत्तराफाल्गुनी (Uttara Phalguni)",
    "हस्त (Hasta)", "चित्रा (Chitra)", "स्वाती (Swati)", "विशाखा (Vishakha)",
    "अनुराधा (Anuradha)", "ज्येष्ठा (Jyeshtha)", "मूल (Mula)", "पूर्वाषाढ़ा (Purva Ashadha)",
    "उत्तराषाढ़ा (Uttara Ashadha)", "श्रवण (Shravana)", "धनिष्ठा (Dhanishtha)", "शतभिषा (Shatabhisha)",
    "पूर्वाभाद्रपद (Purva Bhadrapada)", "उत्तराभाद्रपद (Uttara Bhadrapada)", "रेवती (Revati)"
]

YOGA_NAMES = [
    "विष्कम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा", "धृति",
    "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र", "सिद्धि",
    "व्यतीपात", "वरीयान्", "परिघ", "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल",
    "ब्रह्म", "इन्द्र", "वैधृति"
]

KARANA_NAMES = [
    "बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि (भद्रा)",
    "शकुनि", "चतुष्पाद", "नाग", "किंस्तुघ्न"
]

HINDU_MONTHS = [
    "चैत्र (Chaitra)", "वैशाख (Vaishakha)", "ज्येष्ठ (Jyeshtha)", "आषाढ़ (Ashadha)",
    "श्रावण (Shravana)", "भाद्रपद (Bhadrapada)", "आश्विन (Ashwin)", "कार्तिक (Kartika)",
    "मार्गशीर्ष (Margashirsha)", "पौष (Pausha)", "माघ (Magha)", "फाल्गुन (Phalguna)"
]

WEEKDAY_NAMES_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"]

# ----------------- Core Astronomical Math -----------------

def gregorian_to_jd(year: int, month: int, day: int, hour: float = 0.0) -> float:
    """Converts Gregorian date and UTC hour to Julian Day."""
    if month <= 2:
        year -= 1
        month += 12
    a = math.floor(year / 100)
    b = 2 - a + math.floor(a / 4)
    jd = math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + (hour / 24.0) + b - 1524.5
    return jd

def get_ayanamsha(jd: float) -> float:
    """Computes Lahiri Ayanamsha for a given Julian Day."""
    T = (jd - 2451545.0) / 36525.0
    return (AYANAMSHA_J2000 + PRECESSION_PER_CENTURY * T) % 360.0

def sun_apparent_longitude(jd: float) -> float:
    """Calculates apparent geocentric ecliptic longitude of Sun (degrees)."""
    T = (jd - 2451545.0) / 36525.0
    L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
    M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
    M_rad = math.radians(M % 360.0)
    C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * math.sin(M_rad) + \
        (0.019993 - 0.000101 * T) * math.sin(2 * M_rad) + 0.000289 * math.sin(3 * M_rad)
    sun_true_lon = (L0 + C) % 360.0
    # Nutation & aberration correction
    omega = math.radians((125.04 - 1934.136 * T) % 360.0)
    sun_app_lon = (sun_true_lon - 0.00569 - 0.00478 * math.sin(omega)) % 360.0
    return sun_app_lon

def moon_apparent_longitude(jd: float) -> float:
    """Calculates apparent geocentric ecliptic longitude of Moon (degrees, Meeus Ch. 47)."""
    T = (jd - 2451545.0) / 36525.0
    L_prime = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T
    D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T
    M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T
    M_prime = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T
    F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T

    D_r = math.radians(D % 360.0)
    M_r = math.radians(M % 360.0)
    Mp_r = math.radians(M_prime % 360.0)
    F_r = math.radians(F % 360.0)

    sigma_l = (
        6.288774 * math.sin(Mp_r) +
        1.274027 * math.sin(2 * D_r - Mp_r) +
        0.658314 * math.sin(2 * D_r) +
        0.213618 * math.sin(2 * Mp_r) -
        0.185116 * math.sin(M_r) -
        0.114332 * math.sin(2 * F_r) +
        0.058793 * math.sin(2 * D_r - 2 * Mp_r) +
        0.057066 * math.sin(2 * D_r - M_r - Mp_r) +
        0.053322 * math.sin(2 * D_r + Mp_r) +
        0.045758 * math.sin(2 * D_r - M_r) -
        0.040923 * math.sin(M_r - Mp_r) -
        0.034720 * math.sin(D_r) -
        0.030383 * math.sin(M_r + Mp_r) +
        0.015327 * math.sin(2 * D_r - 2 * F_r) -
        0.012528 * math.sin(Mp_r + 2 * F_r) +
        0.010980 * math.sin(Mp_r - 2 * F_r)
    )
    return (L_prime + sigma_l) % 360.0

def get_solar_coordinates(jd: float):
    """Returns solar declination and equation of time (minutes)."""
    T = (jd - 2451545.0) / 36525.0
    L0 = 280.46646 + 36000.76983 * T
    M = math.radians((357.52911 + 35999.05029 * T) % 360.0)
    e = 0.016708634 - 0.000042037 * T
    C = (1.914602 - 0.004817 * T) * math.sin(M) + (0.019993 - 0.000101 * T) * math.sin(2 * M)
    sun_true_lon = (L0 + C) % 360.0

    eps0 = 23.4392911 - (46.8150 * T) / 3600.0
    eps = math.radians(eps0)
    lam = math.radians(sun_true_lon)

    sin_dec = math.sin(eps) * math.sin(lam)
    dec = math.asin(sin_dec)

    # Equation of time (in minutes)
    y = math.tan(eps / 2.0) ** 2
    L0_rad = math.radians(L0 % 360.0)
    eot = 4.0 * math.degrees(
        y * math.sin(2 * L0_rad) -
        2 * e * math.sin(M) +
        4 * e * y * math.sin(M) * math.cos(2 * L0_rad) -
        0.5 * (y ** 2) * math.sin(4 * L0_rad) -
        1.25 * (e ** 2) * math.sin(2 * M)
    )
    return dec, eot

# ----------------- Sun Times & Muhurats -----------------

def calculate_sun_times(date: datetime.date, lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON, tz: float = DEFAULT_TZ):
    """Calculates Sunrise, Sunset, Solar Noon, and day/night duration."""
    jd_noon = gregorian_to_jd(date.year, date.month, date.day, 12.0 - tz)
    dec, eot = get_solar_coordinates(jd_noon)

    solar_noon_minutes = 720 - (4 * lon) - eot + (tz * 60)
    
    # Standard zenith for sunrise/sunset accounting for atmospheric refraction (-0.833 degrees)
    zenith_rad = math.radians(90.833)
    lat_rad = math.radians(lat)

    cos_ha = (math.cos(zenith_rad) - math.sin(lat_rad) * math.sin(dec)) / (math.cos(lat_rad) * math.cos(dec))
    cos_ha = max(-1.0, min(1.0, cos_ha))
    ha_degrees = math.degrees(math.acos(cos_ha))
    ha_minutes = ha_degrees * 4.0

    sunrise_minutes = solar_noon_minutes - ha_minutes
    sunset_minutes = solar_noon_minutes + ha_minutes
    day_duration_minutes = sunset_minutes - sunrise_minutes

    def minutes_to_dt(m):
        base = datetime(date.year, date.month, date.day)
        return base + timedelta(minutes=m)

    return {
        "sunrise": minutes_to_dt(sunrise_minutes),
        "sunset": minutes_to_dt(sunset_minutes),
        "solar_noon": minutes_to_dt(solar_noon_minutes),
        "day_duration": day_duration_minutes,
    }

def format_time_12h(dt: datetime) -> str:
    """Formats datetime to 12-hour Hindi/English readable string (e.g., 06:42 AM)."""
    return dt.strftime("%I:%M %p")

def calculate_muhurats(sun_times: dict, weekday: int):
    """
    Computes Rahukaal, Yamaganda, Gulika Kaal, Abhijit, Brahma, and Godhuli Muhurat.
    weekday: 0=Monday, 1=Tuesday ... 6=Sunday
    """
    sunrise = sun_times["sunrise"]
    sunset = sun_times["sunset"]
    day_duration = sun_times["day_duration"]
    part = timedelta(minutes=day_duration / 8.0)

    # Rahukaal period by day of week (Monday=0 to Sunday=6)
    # Standard Vedic allocation:
    # Mon: 2nd, Tue: 7th, Wed: 5th, Thu: 6th, Fri: 4th, Sat: 3rd, Sun: 8th
    rahu_periods = {
        0: 1,  # Mon -> 2nd part (0-indexed: 1)
        1: 6,  # Tue -> 7th part
        2: 4,  # Wed -> 5th part
        3: 5,  # Thu -> 6th part
        4: 3,  # Fri -> 4th part
        5: 2,  # Sat -> 3rd part
        6: 7,  # Sun -> 8th part
    }
    rahu_idx = rahu_periods[weekday]
    rahu_start = sunrise + (part * rahu_idx)
    rahu_end = rahu_start + part

    # Abhijit Muhurat: 8th of 15 daylight muhurats (centered on solar noon)
    muhurat_len = timedelta(minutes=day_duration / 15.0)
    abhijit_start = sunrise + (muhurat_len * 7)
    abhijit_end = sunrise + (muhurat_len * 8)

    # Brahma Muhurat: 2 muhurats (96 mins to 48 mins) before sunrise
    brahma_start = sunrise - timedelta(minutes=96)
    brahma_end = sunrise - timedelta(minutes=48)

    # Godhuli Muhurat: 24 mins window around sunset (-12 to +12)
    godhuli_start = sunset - timedelta(minutes=12)
    godhuli_end = sunset + timedelta(minutes=12)

    # Disha Shool by weekday (Monday=0 ... Sunday=6)
    disha_map = {
        0: "पूर्व दिशा (East)",
        1: "उत्तर दिशा (North)",
        2: "उत्तर दिशा (North)",
        3: "दक्षिण दिशा (South)",
        4: "पश्चिम दिशा (West)",
        5: "पूर्व दिशा (East)",
        6: "पश्चिम दिशा (West)",
    }
    disha_shool = disha_map.get(weekday, "पश्चिम दिशा")

    # Daytime Choghadiya (8 segments from sunrise to sunset)
    choghadiya_patterns = {
        0: ["अमृत", "काल", "शुभ", "रोग", "उद्वेग", "चर", "लाभ", "अमृत"],  # Mon
        1: ["रोग", "उद्वेग", "चर", "लाभ", "अमृत", "काल", "शुभ", "रोग"],   # Tue
        2: ["लाभ", "अमृत", "काल", "शुभ", "रोग", "उद्वेग", "चर", "लाभ"],   # Wed
        3: ["शुभ", "रोग", "उद्वेग", "चर", "लाभ", "अमृत", "काल", "शुभ"],   # Thu
        4: ["चर", "लाभ", "अमृत", "काल", "शुभ", "रोग", "उद्वेग", "चर"],   # Fri
        5: ["काल", "शुभ", "रोग", "उद्वेग", "चर", "लाभ", "अमृत", "काल"],   # Sat
        6: ["उद्वेग", "चर", "लाभ", "अमृत", "काल", "शुभ", "रोग", "उद्वेग"],  # Sun
    }
    pattern = choghadiya_patterns.get(weekday, choghadiya_patterns[0])
    chog_part = timedelta(minutes=day_duration / 8.0)

    choghadiyas = []
    shubh_times = []
    amrit_times = []
    labh_times = []

    for idx, name in enumerate(pattern):
        c_start = sunrise + (chog_part * idx)
        c_end = c_start + chog_part
        time_str = f"{format_time_12h(c_start)} से {format_time_12h(c_end)}"
        choghadiyas.append({"name": name, "time": time_str})
        if name == "शुभ":
            shubh_times.append(time_str)
        elif name == "अमृत":
            amrit_times.append(time_str)
        elif name == "लाभ":
            labh_times.append(time_str)

    return {
        "rahu_kaal": f"{format_time_12h(rahu_start)} से {format_time_12h(rahu_end)}",
        "abhijit": f"{format_time_12h(abhijit_start)} से {format_time_12h(abhijit_end)}",
        "brahma": f"{format_time_12h(brahma_start)} से {format_time_12h(brahma_end)}",
        "godhuli": f"{format_time_12h(godhuli_start)} से {format_time_12h(godhuli_end)}",
        "disha_shool": disha_shool,
        "shubh_choghadiya": ", ".join(shubh_times) if shubh_times else "दोपहर बाद",
        "amrit_choghadiya": ", ".join(amrit_times) if amrit_times else "प्रातःकाल",
        "labh_choghadiya": ", ".join(labh_times) if labh_times else "अपराह्न",
    }

# ----------------- Tithi, Nakshatra, Yoga, Karana -----------------

def calculate_panchang_elements(dt: datetime, tz: float = DEFAULT_TZ):
    """
    Computes exact astronomical Tithi, Nakshatra, Yoga, Karana, and Hindu Month.
    """
    utc_hour = (dt.hour + dt.minute / 60.0 + dt.second / 3600.0) - tz
    jd = gregorian_to_jd(dt.year, dt.month, dt.day, utc_hour)

    sun_lon = sun_apparent_longitude(jd)
    moon_lon = moon_apparent_longitude(jd)
    ayanamsha = get_ayanamsha(jd)

    # Sidereal (Nirayana) Moon Longitude
    moon_sidereal = (moon_lon - ayanamsha) % 360.0
    sun_sidereal = (sun_lon - ayanamsha) % 360.0

    # 1. Tithi: (Moon_lon - Sun_lon) / 12 deg
    diff = (moon_lon - sun_lon) % 360.0
    tithi_index = int(diff / 12.0)  # 0 to 29
    tithi_number = tithi_index + 1
    paksha = "शुक्ल पक्ष" if tithi_number <= 15 else "कृष्ण पक्ष"
    tithi_in_paksha = tithi_number if tithi_number <= 15 else tithi_number - 15

    # 2. Nakshatra: Moon_sidereal / 13°20' (13.33333 deg)
    nakshatra_span = 360.0 / 27.0
    nakshatra_index = int(moon_sidereal / nakshatra_span) % 27

    # 3. Yoga: (Moon_sidereal + Sun_sidereal) / 13°20'
    yoga_index = int(((moon_sidereal + sun_sidereal) % 360.0) / nakshatra_span) % 27

    # 4. Karana: diff / 6 deg
    karana_val = int(diff / 6.0) % 60
    if karana_val == 0:
        karana_name = KARANA_NAMES[10]  # Kimstughna
    elif 1 <= karana_val <= 56:
        karana_name = KARANA_NAMES[(karana_val - 1) % 7]
    elif karana_val == 57:
        karana_name = KARANA_NAMES[7]  # Shakuni
    elif karana_val == 58:
        karana_name = KARANA_NAMES[8]  # Chatushpada
    else:
        karana_name = KARANA_NAMES[9]  # Naga

    # Hindu Lunar Month:
    # Sun in Mina (11) -> Chaitra (0)
    # Sun in Mesha (0) -> Vaishakha (1)
    # ...
    # Sun in Tula (6) -> Kartika (7)
    rashi_idx = int(sun_sidereal / 30.0) % 12
    lunar_month_idx = (rashi_idx + 1) % 12

    return {
        "tithi_number": tithi_number,
        "tithi_in_paksha": tithi_in_paksha,
        "paksha": paksha,
        "tithi_name": TITHI_NAMES[tithi_index],
        "nakshatra_name": NAKSHATRA_NAMES[nakshatra_index],
        "yoga_name": YOGA_NAMES[yoga_index],
        "karana_name": karana_name,
        "hindu_month": HINDU_MONTHS[lunar_month_idx],
        "moon_phase_deg": diff,
    }

def get_complete_panchang(date: datetime.date = None, lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON, tz: float = DEFAULT_TZ):
    """
    Main API: Generates complete Vedic astronomical panchang for a given calendar date.
    """
    if date is None:
        # Default to current date in IST
        date = (datetime.now(timezone.utc) + timedelta(hours=DEFAULT_TZ)).date()

    sun_times = calculate_sun_times(date, lat, lon, tz)
    weekday = date.weekday()  # Monday=0, Sunday=6
    weekday_hi = WEEKDAY_NAMES_HI[(weekday + 1) % 7]

    # Evaluate panchang at Sunrise (Surya Udaya is the primary reference in Vedic Jyotish)
    sunrise_dt = sun_times["sunrise"]
    elements = calculate_panchang_elements(sunrise_dt, tz)
    muhurats = calculate_muhurats(sun_times, weekday)

    return {
        "date": date.strftime("%Y-%m-%d"),
        "date_display": f"{date.day} {['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'][date.month-1]} {date.year}, {weekday_hi}",
        "weekday": weekday_hi,
        "sunrise": format_time_12h(sun_times["sunrise"]),
        "sunset": format_time_12h(sun_times["sunset"]),
        **elements,
        **muhurats,
    }

if __name__ == "__main__":
    import json
    p = get_complete_panchang()
    print(json.dumps(p, indent=2, ensure_ascii=False))
