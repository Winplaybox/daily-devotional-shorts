# Skyfield engine implementation slice

This PR introduces an executable Skyfield-backed astronomy adapter, not a certified
Panchang release. It calculates apparent geocentric tropical longitudes, applies a
versioned Lahiri approximation, derives core angular indices, searches the next
tithi/nakshatra/yoga boundary with bracketed bisection, and obtains sunrise/sunset
from Skyfield's almanac routines using an IANA timezone-aware local day.

## Install

```bash
python -m pip install -r requirements-engine.txt
python -m unittest tests.test_skyfield_panchang -v
```

Skyfield will retrieve its default DE421 kernel on first use unless
`SKYFIELD_EPHEMERIS` points to a locally managed BSP file. Production deployments
should pin and checksum the kernel artifact and cache it outside ephemeral job dirs.

## Explicit limitations / next gates

- The Lahiri polynomial is versioned but is not yet independently calibrated to
  an approved Chitra Paksha reference series.
- The engine adapter is not yet wired into `panchang_engine.py`, JSON poster schema,
  festival rules, narration, request worker or uploader.
- Tithi/nakshatra/yoga index output is sampled at local noon; sunrise-day assignment,
  interval rendering and karana naming policy are subsequent integration work.
- Moonrise/moonset, planetary transits, festival observance, regional Amanta/
  Purnimanta rules and muhurta derivation are not implemented by this slice.
- Global validation fixtures and published Panchang comparisons remain release gates.
- Commercial distribution requires license review for Skyfield, jplephem, NumPy,
  the selected JPL BSP data and all other bundled assets. This dependency choice
  avoids making Swiss Ephemeris a runtime requirement; it is not a legal opinion.

Public publishing remains disabled until the complete validation and QC gates pass.
