from pathlib import Path

WIDTH = 578
HEIGHT = 331
BACKGROUND = "#1f1f1f"
TEXT_COLOR = "#e8d9f1"
FONT_FAMILY = "'Montserrat', 'Arial', sans-serif"
FONT_SIZE = 88

WORDS = {
    "aktivnost": "АКТИВНОСТЬ",
    "kalendar": "КАЛЕНДАРЬ",
    "pravila": "ПРАВИЛА",
    "sostav": "СОСТАВ",
    "otchety": "ОТЧЕТЫ",
    "fidbek": "ФИДБЕК",
    "magaziny": "МАГАЗИНЫ",
}

OUTPUT_DIR = Path("images")
OUTPUT_DIR.mkdir(exist_ok=True)

SVG_TEMPLATE = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" viewBox=\"0 0 {width} {height}\">
  <defs>
    <filter id=\"noise\" x=\"0\" y=\"0\" width=\"100%\" height=\"100%\">
      <feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"1\" result=\"noise\"/>
      <feColorMatrix type=\"saturate\" values=\"0\" in=\"noise\" result=\"mono\"/>
      <feComponentTransfer in=\"mono\" result=\"noiseAlpha\">
        <feFuncA type=\"table\" tableValues=\"0 0.12\"/>
      </feComponentTransfer>
      <feBlend in=\"SourceGraphic\" in2=\"noiseAlpha\" mode=\"overlay\"/>
    </filter>
  </defs>
  <rect width=\"100%\" height=\"100%\" fill=\"{background}\" filter=\"url(#noise)\"/>
  <text
    x=\"50%\"
    y=\"50%\"
    fill=\"{text_color}\"
    font-family=\"{font_family}\"
    font-size=\"{font_size}\"
    font-weight=\"700\"
    text-anchor=\"middle\"
    dominant-baseline=\"middle\"
    lengthAdjust=\"spacingAndGlyphs\"
    textLength=\"{text_length}\"
  >{label}</text>
</svg>
"""

TEXT_LENGTH = WIDTH * 0.82

for name, label in WORDS.items():
    svg = SVG_TEMPLATE.format(
        width=WIDTH,
        height=HEIGHT,
        background=BACKGROUND,
        text_color=TEXT_COLOR,
        font_family=FONT_FAMILY,
        font_size=FONT_SIZE,
        text_length=TEXT_LENGTH,
        label=label,
    )
    (OUTPUT_DIR / f"{name}.svg").write_text(svg, encoding="utf-8")
