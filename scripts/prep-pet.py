"""Crop the pet photos to their content and downscale them to render size.

The masters in assets-src/pet/ are phone photos: 1024px canvases holding a
person who occupies a quarter of the frame, at a different distance in every
shot. Shipping them raw is 1.8MB and leaves the sprite changing size between
frames. This bakes the crop and the scale in, and emits the anchor metadata
the engine needs to stand him on the floor.
"""
from PIL import Image
import numpy as np, json, os
from collections import deque

SRC, OUT = 'assets-src/pet', 'public/image/pet'
BODY_PX = 260          # body's long side in the shipped PNG (~2x render size)
EFFECT_PX = 300        # effects' long side

def blobs(mask, min_px):
    h, w = mask.shape
    seen = np.zeros((h, w), bool); out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]: continue
            q = deque([(sy, sx)]); seen[sy, sx] = True
            x0=x1=sx; y0=y1=sy; n=0
            while q:
                y, x = q.popleft(); n += 1
                x0=min(x0,x); x1=max(x1,x); y0=min(y0,y); y1=max(y1,y)
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        ny, nx = y+dy, x+dx
                        if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]:
                            seen[ny,nx]=True; q.append((ny,nx))
            if n >= min_px: out.append((n, (x0,y0,x1,y1)))
    out.sort(key=lambda c: -c[0])
    return out

D = 4
def analyse(path):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    a = np.array(im.getchannel('A').resize((W//D, H//D), Image.BILINEAR)) > 20
    cs = blobs(a, max(30, (W//D)*(H//D)//4000))
    boxes = [tuple(min(v*D + (D if i>1 else 0), W if i%2==0 else H) for i,v in enumerate(b))
             for _, b in cs]
    return im, boxes

# key -> (source file, keep the prop blob?)
FRAMES = {
    'idle':   ('idle.png',        True),
    'walk_l': ('walk_l.png',      True),
    'walk_r': ('walk_r.png',      True),
    'fall':   ('fall.png',        True),
    'land':   ('land.png',        True),   # bag on the floor beside him - keep
    'drag':   ('drag.png',        True),
    'fly':    ('fly_bag.png',     False),  # airborne: a bag flying alongside reads as a bug
    'pose_1': ('pose_1_bag.png',  True),
    'pose_2': ('pose_2_bag.png',  True),
    'pose_3': ('pose_3.png',      True),
    'pose_4': ('pose_4.png',      True),
    'pose_5': ('pose_5.png',      True),
    'pose_6': ('pose_6.png',      True),
}

meta = {}
for key, (fname, keep_props) in FRAMES.items():
    im, boxes = analyse(os.path.join(SRC, fname))
    body = boxes[0]
    region = list(body)
    if keep_props:
        for b in boxes[1:]:
            region[0]=min(region[0],b[0]); region[1]=min(region[1],b[1])
            region[2]=max(region[2],b[2]); region[3]=max(region[3],b[3])
    crop = im.crop(tuple(region))
    if not keep_props and len(boxes) > 1:
        # zero the alpha of every non-body blob still inside the crop
        px = np.array(crop)
        for b in boxes[1:]:
            x0,y0,x1,y1 = b[0]-region[0], b[1]-region[1], b[2]-region[0], b[3]-region[1]
            x0,y0 = max(x0,0), max(y0,0)
            if x1>0 and y1>0: px[y0:y1, x0:x1, 3] = 0
        crop = Image.fromarray(px)

    bw, bh = body[2]-body[0], body[3]-body[1]
    s = BODY_PX / max(bw, bh)
    ow, oh = max(1, round(crop.width*s)), max(1, round(crop.height*s))
    crop = crop.resize((ow, oh), Image.LANCZOS)
    crop.save(os.path.join(OUT, key + '.png'), optimize=True)

    meta[key] = {
        'w': ow, 'h': oh,
        'bw': round(bw*s), 'bh': round(bh*s),
        # ground anchor: body's horizontal centre, body's lowest point
        'ax': round((body[0]+body[2])/2*s - region[0]*s, 1),
        'ay': round(body[3]*s - region[1]*s, 1),
    }

# The bag on its own. It is the corner peek — a small green shape poking in is
# a lighter invitation than a whole person dangling off the edge. Taken from
# land.png, where it lies furthest from him and crops cleanest.
im, boxes = analyse(os.path.join(SRC, 'land.png'))
bag = min(boxes[1:], key=lambda b: b[0])
crop = im.crop(bag)
s = 170 / max(crop.width, crop.height)
crop = crop.resize((max(1, round(crop.width*s)), max(1, round(crop.height*s))), Image.LANCZOS)
crop.save(os.path.join(OUT, 'bag.png'), optimize=True)
meta['bag'] = {'w': crop.width, 'h': crop.height}

for i in (1, 2, 3, 4, 5, 6, 7):
    im, boxes = analyse(os.path.join(SRC, f'effect_{i}.png'))
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    crop = im.crop((x0, y0, x1, y1))
    s = EFFECT_PX / max(crop.width, crop.height)
    crop = crop.resize((max(1,round(crop.width*s)), max(1,round(crop.height*s))), Image.LANCZOS)
    crop.save(os.path.join(OUT, f'effect_{i}.png'), optimize=True)
    meta[f'effect_{i}'] = {'w': crop.width, 'h': crop.height}

print(json.dumps(meta, indent=1))
