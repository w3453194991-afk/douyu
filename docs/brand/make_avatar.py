from PIL import Image, ImageDraw, ImageFilter
import math, os, random

OUT = r"E:\湖北\douyu\docs\brand"
os.makedirs(OUT, exist_ok=True)

# Work at 2048 and downsample for clean edges.
S = 2048
C = S // 2

def shade(hex_color, f):
    h = hex_color.lstrip('#')
    r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    if f >= 0:
        r, g, b = r + (255-r)*f, g + (255-g)*f, b + (255-b)*f
    else:
        r, g, b = r*(1+f), g*(1+f), b*(1+f)
    return (max(0,min(255,round(r))), max(0,min(255,round(g))), max(0,min(255,round(b))))

def rgba(hex_color, a=255):
    if isinstance(hex_color, tuple):
        return (hex_color[0], hex_color[1], hex_color[2], a)
    h = hex_color.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

CREAM = "#F7EFE2"
DARK = "#1B1D23"
INK = "#14161B"
CORAL = "#E0582F"
MINT = "#8ECFBB"
YELLOW = "#F5C24F"
BLUE = "#4DA7D9"
PINK = "#F5B0C0"
PURPLE = "#B49AD9"

def background():
    img = Image.new("RGBA", (S, S), rgba(CREAM))
    d = ImageDraw.Draw(img)
    # warm vignette
    for i in range(18, 0, -1):
        r = int(S * (0.55 + i * 0.025))
        a = int(3 + i * 1.1)
        d.ellipse([C-r, C-r, C+r, C+r], fill=rgba("#E8D6B8", a))
    # very subtle pixel dots in the cream field
    for y in range(96, S-96, 64):
        for x in range(96, S-96, 64):
            d.ellipse([x-2, y-2, x+2, y+2], fill=rgba("#D8C3A3", 80))
    return img

def draw_bead(base, cx, cy, r, color, hole=INK, ring=True):
    # soft shadow
    shadow = Image.new("RGBA", (S, S), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([cx-r*1.04, cy-r*0.92+r*0.12, cx+r*1.04, cy+r*1.08+r*0.12], fill=(40,30,20,60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=r*0.08))
    base.alpha_composite(shadow)

    d = ImageDraw.Draw(base, "RGBA")
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=rgba(color))
    if ring:
        d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=rgba(shade(color,-0.35), 180), width=max(3, int(r*0.035)))
    # plastic highlight
    hb = [cx-r*0.62, cy-r*0.72, cx+r*0.62, cy+r*0.40]
    d.arc(hb, 200, 320, fill=(255,255,255,130), width=max(4, int(r*0.075)))
    # hole
    hr = r*0.27
    d.ellipse([cx-hr, cy-hr, cx+hr, cy+hr], fill=rgba(hole))
    d.ellipse([cx-hr*0.92, cy-hr*0.92, cx+hr*0.92, cy+hr*0.92], outline=rgba(shade(color,-0.5), 160), width=max(2, int(r*0.025)))
    d.arc([cx-hr*0.55, cy-hr*0.55, cx+hr*0.55, cy+hr*0.55], 180, 330, fill=(255,255,255,50), width=max(2,int(r*0.02)))

def make_a():
    img = background()
    # round pegboard
    shadow = Image.new("RGBA", (S,S), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    R = int(S*0.341)
    sd.ellipse([C-R, C-R+26, C+R, C+R+26], fill=(30,22,14,90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(38))
    img.alpha_composite(shadow)

    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([C-R, C-R, C+R, C+R], fill=rgba(DARK))
    d.ellipse([C-R, C-R, C+R, C+R], outline=rgba("#2B2E38"), width=10)
    d.ellipse([C-R+58, C-R+58, C+R-58, C+R-58], outline=rgba("#F7EFE2", 55), width=5)

    # subtle peg grid
    n = 9
    for iy in range(n):
        for ix in range(n):
            x = C + (ix-(n-1)/2)*(R*1.55/n)
            y = C + (iy-(n-1)/2)*(R*1.55/n)
            if (x-C)**2 + (y-C)**2 < (R-40)**2:
                d.ellipse([x-4, y-4, x+4, y+4], fill=rgba("#3A3E49", 150))

    # five-bead island cluster
    top = (C, C-int(S*0.102))
    left = (C-int(S*0.102), C)
    right = (C+int(S*0.102), C)
    bottom = (C, C+int(S*0.102))
    draw_bead(img, top[0], top[1], int(S*0.047), MINT)
    draw_bead(img, left[0], left[1], int(S*0.047), YELLOW)
    draw_bead(img, right[0], right[1], int(S*0.047), BLUE)
    draw_bead(img, bottom[0], bottom[1], int(S*0.047), PINK)
    draw_bead(img, C, C, int(S*0.078), CORAL)
    return img

def make_b():
    img = Image.new("RGBA", (S,S), rgba("#FBF5EA"))
    d = ImageDraw.Draw(img, "RGBA")
    # giant bead
    R = int(S*0.30)
    shadow = Image.new("RGBA",(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow)
    sd.ellipse([C-R, C-R+30, C+R, C+R+30], fill=(60,35,20,85))
    shadow=shadow.filter(ImageFilter.GaussianBlur(42)); img.alpha_composite(shadow)
    # island / sea arcs behind
    d.arc([C-R*1.35, C+R*0.35, C+R*1.35, C+R*1.65], 200, 340, fill=rgba(MINT,220), width=36)
    d.arc([C-R*1.25, C+R*0.48, C+R*1.25, C+R*1.78], 200, 340, fill=rgba("#6FBEAA",160), width=18)
    draw_bead(img, C, C, R, CORAL)
    # small companion beads
    draw_bead(img, C-int(R*0.86), C-int(R*0.62), int(S*0.038), YELLOW)
    draw_bead(img, C+int(R*0.86), C-int(R*0.62), int(S*0.038), BLUE)
    draw_bead(img, C+int(R*0.80), C+int(R*0.50), int(S*0.038), PINK)
    return img

def make_c():
    img = background()
    # clean flat board (no outer shadow)
    B = int(S*0.66); x0=C-B//2; y0=C-B//2
    d=ImageDraw.Draw(img,"RGBA")
    d.rounded_rectangle([x0,y0,x0+B,y0+B], radius=int(B*0.19), fill=rgba(DARK), outline=rgba("#2B2E38"), width=10)
    # 3x3 pixel island
    colors=[[None,MINT,None],[YELLOW,CORAL,BLUE],[None,PINK,PURPLE]]
    cell=B*0.205; gap=B*0.027
    ox=C-(cell*3+gap*2)/2; oy=C-(cell*3+gap*2)/2
    for iy,row in enumerate(colors):
        for ix,col in enumerate(row):
            if not col: continue
            cx=ox+ix*(cell+gap)+cell/2; cy=oy+iy*(cell+gap)+cell/2
            draw_bead(img,cx,cy,int(cell*0.43),col)
    return img

for key, fn in [("a", make_a), ("b", make_b), ("c", make_c)]:
    img = fn().convert("RGB").resize((1024,1024), Image.LANCZOS)
    img.save(os.path.join(OUT, f"wechat-avatar-{key}-1024.png"), quality=95)
    img.resize((512,512), Image.LANCZOS).save(os.path.join(OUT, f"wechat-avatar-{key}-512.png"))
    img.resize((144,144), Image.LANCZOS).save(os.path.join(OUT, f"wechat-avatar-{key}-144.png"))
    # circular preview on cream
    prev = Image.new("RGB",(1024,1024), "#F7EFE2")
    mask = Image.new("L",(1024,1024),0); md=ImageDraw.Draw(mask); md.ellipse([32,32,992,992], fill=255)
    prev.paste(img,(0,0),mask)
    prev.save(os.path.join(OUT, f"wechat-avatar-{key}-circle.png"))

# Final recommendation: C, clean flat board with six beads.
final = make_c().convert("RGB").resize((1024,1024), Image.LANCZOS)
final.save(os.path.join(OUT, "wechat-avatar-final-1024.png"), quality=95)
final.resize((512,512), Image.LANCZOS).save(os.path.join(OUT, "wechat-avatar-final-512.png"))
final.resize((144,144), Image.LANCZOS).save(os.path.join(OUT, "wechat-avatar-final-144.png"))
prev = Image.new("RGB",(1024,1024), "#F7EFE2")
mask = Image.new("L",(1024,1024),0); md=ImageDraw.Draw(mask); md.ellipse([32,32,992,992], fill=255)
prev.paste(final,(0,0),mask)
prev.save(os.path.join(OUT, "wechat-avatar-final-circle.png"))
print("done")
