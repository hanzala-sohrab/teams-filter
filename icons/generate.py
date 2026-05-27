"""Generate PNG icons from SVG using cairosvg or Pillow fallback."""

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect width="{size}" height="{size}" rx="{rx}" fill="#6264a7"/>
  <text x="{cx}" y="{cy}" font-family="Arial" font-size="{fs}" fill="white"
        text-anchor="middle" dominant-baseline="central">🚫</text>
</svg>"""

SIZES = [16, 48, 128]

def make_svg(size):
    return SVG_TEMPLATE.format(
        size=size,
        rx=size // 5,
        cx=size // 2,
        cy=size // 2,
        fs=int(size * 0.55),
    )

try:
    import cairosvg
    for s in SIZES:
        cairosvg.svg2png(bytestring=make_svg(s).encode(), write_to=f"icon{s}.png", output_width=s, output_height=s)
    print("Icons generated with cairosvg.")
except ImportError:
    try:
        from PIL import Image, ImageDraw
        for s in SIZES:
            img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            r = s // 5
            draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=(98, 100, 167, 255))
            img.save(f"icon{s}.png")
        print("Icons generated with Pillow.")
    except ImportError:
        print("Neither cairosvg nor Pillow available — creating placeholder PNGs.")
        import struct, zlib

        def minimal_png(size):
            def chunk(name, data):
                c = zlib.crc32(name + data) & 0xFFFFFFFF
                return struct.pack(">I", len(data)) + name + data + struct.pack(">I", c)

            ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
            raw = b""
            for _ in range(size):
                row = b"\x00"
                for _ in range(size):
                    row += bytes([98, 100, 167])
                raw += row
            compressed = zlib.compress(raw)
            return (
                b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", ihdr)
                + chunk(b"IDAT", compressed)
                + chunk(b"IEND", b"")
            )

        for s in SIZES:
            with open(f"icon{s}.png", "wb") as f:
                f.write(minimal_png(s))
        print("Placeholder PNGs created.")
