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

# ----------------- Moon Coordinates & Rise/Set -----------------

def get_moon_coordinates(jd: float):
    """Calculates geocentric right ascension and declination of the Moon (radians)."""
    T = (jd - 2451545.0) / 36525.0
    lam_deg = moon_apparent_longitude(jd)
    lam = math.radians(lam_deg)

    F = math.radians((93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) % 360.0)
    Mp = math.radians((134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) % 360.0)
    D = math.radians((297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) % 360.0)

    beta_deg = (
        5.128177 * math.sin(F) +
        0.280602 * math.sin(Mp + F) +
        0.277693 * math.sin(Mp - F) +
        0.173237 * math.sin(2 * D - F) +
        0.055413 * math.sin(2 * D - Mp + F) +
        0.046271 * math.sin(2 * D - Mp - F) +
        0.032573 * math.sin(2 * D + F) +
        0.017198 * math.sin(2 * Mp + F)
    )
    beta = math.radians(beta_deg)

    eps0 = 23.4392911 - (46.8150 * T) / 3600.0
    eps = math.radians(eps0)

    sin_dec = math.sin(beta) * math.cos(eps) + math.cos(beta) * math.sin(eps) * math.sin(lam)
    dec = math.asin(max(-1.0, min(1.0, sin_dec)))

    y = math.cos(beta) * math.cos(eps) * math.sin(lam) - math.sin(beta) * math.sin(eps)
    x = math.cos(beta) * math.cos(lam)
    ra = math.atan2(y, x)
    return ra, dec

def moon_altitude_at_hour(target_date: datetime.date, hour_local: float, lat: float, lon: float, tz: float) -> float:
    """Calculates topocentric altitude of the Moon in degrees for a given local hour."""
    utc_hour = hour_local - tz
    jd = gregorian_to_jd(target_date.year, target_date.month, target_date.day, utc_hour)
    ra, dec = get_moon_coordinates(jd)

    T = (jd - 2451545.0) / 36525.0
    gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360.0
    lmst = math.radians((gmst + lon) % 360.0)

    ha = lmst - ra
    lat_r = math.radians(lat)
    sin_alt = math.sin(lat_r) * math.sin(dec) + math.cos(lat_r) * math.cos(dec) * math.cos(ha)
    return math.degrees(math.asin(max(-1.0, min(1.0, sin_alt))))

def calculate_moon_times(target_date: datetime.date, lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON, tz: float = DEFAULT_TZ):
    """
    Computes Moonrise and Moonset for the given calendar date and location.
    Returns datetime objects in local timezone or None if no rise/set occurs today.
    """
    # Sample altitude across 24 hours at 15-minute intervals
    step_minutes = 15
    alts = []
    for m in range(0, 24 * 60 + 1, step_minutes):
        h = m / 60.0
        alt = moon_altitude_at_hour(target_date, h, lat, lon, tz)
        alts.append((h, alt))

    # Standard apparent horizon altitude for Moon (+0.125 deg) accounting for parallax & refraction
    h0 = 0.125
    rise_dt = None
    set_dt = None

    for i in range(len(alts) - 1):
        h1, a1 = alts[i]
        h2, a2 = alts[i + 1]
        if a1 <= h0 < a2 and rise_dt is None:
            frac = (h0 - a1) / (a2 - a1) if a2 != a1 else 0
            rise_hour = h1 + frac * (h2 - h1)
            rise_dt = datetime(target_date.year, target_date.month, target_date.day) + timedelta(minutes=int(round(rise_hour * 60)))
        elif a1 >= h0 > a2 and set_dt is None:
            frac = (h0 - a1) / (a2 - a1) if a2 != a1 else 0
            set_hour = h1 + frac * (h2 - h1)
            set_dt = datetime(target_date.year, target_date.month, target_date.day) + timedelta(minutes=int(round(set_hour * 60)))

    return {
        "moonrise": rise_dt,
        "moonset": set_dt,
    }

def calculate_muhurats(sun_times: dict, weekday: int):
    """
    Computes Rahukaal, Yamaganda, Gulika Kaal, Abhijit, Brahma, and Godhuli Muhurat.
    weekday: 0=Monday, 1=Tuesday ... 6=Sunday
    """
    sunrise = sun_times["sunrise"]
    sunset = sun_times["sunset"]
    day_duration = sun_times["day_duration"]
    part = timedelta(minutes=day_duration / 8.0)

    # 1. Rahukaal period by day of week (Monday=0 to Sunday=6)
    # Mon: 2nd, Tue: 7th, Wed: 5th, Thu: 6th, Fri: 4th, Sat: 3rd, Sun: 8th
    rahu_periods = { 0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7 }
    rahu_idx = rahu_periods[weekday]
    rahu_start = sunrise + (part * rahu_idx)
    rahu_end = rahu_start + part

    # 2. Yamaganda period by day of week
    # Mon: 4th, Tue: 3rd, Wed: 2nd, Thu: 1st, Fri: 7th, Sat: 6th, Sun: 5th
    yamaganda_periods = { 0: 3, 1: 2, 2: 1, 3: 0, 4: 6, 5: 5, 6: 4 }
    yama_idx = yamaganda_periods[weekday]
    yama_start = sunrise + (part * yama_idx)
    yama_end = yama_start + part

    # 3. Gulika Kaal period by day of week
    # Mon: 6th, Tue: 5th, Wed: 4th, Thu: 3rd, Fri: 2nd, Sat: 1st, Sun: 7th
    gulika_periods = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 0, 6: 6 }
    guli_idx = gulika_periods[weekday]
    guli_start = sunrise + (part * guli_idx)
    guli_end = guli_start + part

    # 4. Abhijit Muhurat: 8th of 15 daylight muhurats (centered on solar noon)
    muhurat_len = timedelta(minutes=day_duration / 15.0)
    abhijit_start = sunrise + (muhurat_len * 7)
    abhijit_end = sunrise + (muhurat_len * 8)

    # 5. Brahma Muhurat: 2 muhurats (96 mins to 48 mins) before sunrise
    brahma_start = sunrise - timedelta(minutes=96)
    brahma_end = sunrise - timedelta(minutes=48)

    # 6. Godhuli Muhurat: 24 mins window around sunset (-12 to +12)
    godhuli_start = sunset - timedelta(minutes=12)
    godhuli_end = sunset + timedelta(minutes=12)

    # 7. Disha Shool by weekday (Monday=0 ... Sunday=6)
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

    # 8. Daytime Choghadiya (8 segments from sunrise to sunset)
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
    char_times = []
    labh_times = []
    amrit_times = []

    # Map the first occurrence of each of the 4 auspicious Choghadiyas
    shubh_first = None
    char_first = None
    labh_first = None
    amrit_first = None

    for idx, name in enumerate(pattern):
        c_start = sunrise + (chog_part * idx)
        c_end = c_start + chog_part
        range_str = f"{format_time_12h(c_start)} – {format_time_12h(c_end)}"
        time_str_hi = f"{format_time_12h(c_start)} से {format_time_12h(c_end)}"
        is_ausp = name in ("शुभ", "अमृत", "लाभ", "चर")
        choghadiyas.append({
            "name": name,
            "start": format_time_12h(c_start),
            "end": format_time_12h(c_end),
            "time": range_str,
            "type": "auspicious" if is_ausp else "inauspicious"
        })

        if name == "शुभ":
            shubh_times.append(time_str_hi)
            if shubh_first is None: shubh_first = range_str
        elif name == "चर":
            char_times.append(time_str_hi)
            if char_first is None: char_first = range_str
        elif name == "लाभ":
            labh_times.append(time_str_hi)
            if labh_first is None: labh_first = range_str
        elif name == "अमृत":
            amrit_times.append(time_str_hi)
            if amrit_first is None: amrit_first = range_str

    # Formatted 4 Auspicious Choghadiya items for poster display
    choghadiya_poster_items = [
        {"name": "शुभ", "time": shubh_first or "उपलब्ध नहीं", "display": f"शुभ का चौघड़िया {shubh_first or 'उपलब्ध नहीं'} तक"},
        {"name": "चर", "time": char_first or "उपलब्ध नहीं", "display": f"चर का चौघड़िया {char_first or 'उपलब्ध नहीं'} तक"},
        {"name": "लाभ", "time": labh_first or "उपलब्ध नहीं", "display": f"लाभ का चौघड़िया {labh_first or 'उपलब्ध नहीं'} तक"},
        {"name": "अमृत", "time": amrit_first or "उपलब्ध नहीं", "display": f"अमृत का चौघड़िया {amrit_first or 'उपलब्ध नहीं'} तक"},
    ]

    # Amrit Kaal: Calculate daytime Amrit Muhurat window from Choghadiya or astronomical window
    amrit_kaal_str = amrit_first or "उपलब्ध नहीं"

    return {
        "rahu_kaal": f"{format_time_12h(rahu_start)} से {format_time_12h(rahu_end)}",
        "rahu_kaal_range": f"{format_time_12h(rahu_start)} – {format_time_12h(rahu_end)}",
        "yamaganda": f"{format_time_12h(yama_start)} से {format_time_12h(yama_end)}",
        "yamaganda_range": f"{format_time_12h(yama_start)} – {format_time_12h(yama_end)}",
        "gulika": f"{format_time_12h(guli_start)} से {format_time_12h(guli_end)}",
        "gulika_range": f"{format_time_12h(guli_start)} – {format_time_12h(guli_end)}",
        "abhijit": f"{format_time_12h(abhijit_start)} से {format_time_12h(abhijit_end)}",
        "abhijit_range": f"{format_time_12h(abhijit_start)} – {format_time_12h(abhijit_end)}",
        "brahma": f"{format_time_12h(brahma_start)} से {format_time_12h(brahma_end)}",
        "brahma_range": f"{format_time_12h(brahma_start)} – {format_time_12h(brahma_end)}",
        "godhuli": f"{format_time_12h(godhuli_start)} से {format_time_12h(godhuli_end)}",
        "amrit_kaal": amrit_kaal_str,
        "disha_shool": disha_shool,
        "shubh_choghadiya": ", ".join(shubh_times) if shubh_times else "दोपहर बाद",
        "amrit_choghadiya": ", ".join(amrit_times) if amrit_times else "प्रातःकाल",
        "labh_choghadiya": ", ".join(labh_times) if labh_times else "अपराह्न",
        "choghadiya_day": choghadiyas,
        "choghadiya_poster_items": choghadiya_poster_items,
        "choghadiya_auspicious": {
            "shubh": shubh_first,
            "char": char_first,
            "labh": labh_first,
            "amrit": amrit_first,
        }
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
    moon_times = calculate_moon_times(date, lat, lon, tz)
    weekday = date.weekday()  # Monday=0, Sunday=6
    weekday_hi = WEEKDAY_NAMES_HI[(weekday + 1) % 7]

    # Evaluate panchang at Sunrise (Surya Udaya is the primary reference in Vedic Jyotish)
    sunrise_dt = sun_times["sunrise"]
    elements = calculate_panchang_elements(sunrise_dt, tz)
    muhurats = calculate_muhurats(sun_times, weekday)

    day_mins = sun_times["day_duration"]
    night_mins = 24 * 60 - day_mins
    day_length = f"{int(day_mins // 60)}h {int(round(day_mins % 60))}m"
    night_length = f"{int(night_mins // 60)}h {int(round(night_mins % 60))}m"

    # Vedic Ritu mapping (based on Hindu Month)
    ritu_map = {
        "चैत्र": "बसंत (Spring)", "वैशाख": "बसंत (Spring)",
        "ज्येष्ठ": "ग्रीष्म (Summer)", "आषाढ़": "ग्रीष्म (Summer)",
        "श्रावण": "वर्षा (Monsoon)", "भाद्रपद": "वर्षा (Monsoon)",
        "आश्विन": "शरद (Autumn)", "कार्तिक": "शरद (Autumn)",
        "मार्गशीर्ष": "हेमंत (Pre-Winter)", "पौष": "हेमंत (Pre-Winter)",
        "माघ": "शिशिर (Winter)", "फाल्गुन": "शिशिर (Winter)"
    }
    m_name = elements["hindu_month"].split(" ")[0]
    ritu = ritu_map.get(m_name, "शरद (Autumn)")

    # Ayana based on solar month (Dakshinayan vs Uttarayan)
    # Sun from Karka to Dhanu is Dakshinayan; Makara to Mithuna is Uttarayan
    jd_noon = gregorian_to_jd(date.year, date.month, date.day, 12.0 - tz)
    sun_lon = sun_apparent_longitude(jd_noon)
    ayana = "दक्षिणायन (Dakshinayan)" if (90.0 <= sun_lon < 270.0) else "उत्तरायण (Uttarayan)"

    # Clean Vernacular Hindi Tithi and Nakshatra names (without English brackets)
    tithi_clean = elements["tithi_name"].split(" ")[0]
    nakshatra_clean = elements["nakshatra_name"].split(" ")[0]
    hindu_month_clean = elements["hindu_month"].split(" ")[0]

    return {
        "date": date.strftime("%Y-%m-%d"),
        "date_display": f"{date.day} {['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'][date.month-1]} {date.year}",
        "date_display_full": f"{date.day} {['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'][date.month-1]} {date.year}, {weekday_hi}",
        "weekday": weekday_hi,
        "weekday_en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekday],
        "vikram_samvat": date.year + (56 if any(m in elements["hindu_month"] for m in ("पौष", "माघ", "फाल्गुन")) else 57),
        "shaka_samvat": date.year - (77 if any(m in elements["hindu_month"] for m in ("पौष", "माघ", "फाल्गुन")) else 78),
        "sunrise": format_time_12h(sun_times["sunrise"]),
        "sunset": format_time_12h(sun_times["sunset"]),
        "moonrise": format_time_12h(moon_times["moonrise"]) if moon_times["moonrise"] else None,
        "moonset": format_time_12h(moon_times["moonset"]) if moon_times["moonset"] else None,
        "day_length": day_length,
        "night_length": night_length,
        "ritu": ritu,
        "ayana": ayana,
        "tithi_clean": tithi_clean,
        "nakshatra_clean": nakshatra_clean,
        "hindu_month_clean": hindu_month_clean,
        **elements,
        **muhurats,
    }

if __name__ == "__main__":
    import json
    p = get_complete_panchang()
    print(json.dumps(p, indent=2, ensure_ascii=False))
