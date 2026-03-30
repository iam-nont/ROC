# -*- coding: utf-8 -*-
"""Convert extracted raw SPR/ACT files to animated GIF with head+body compositing."""
import struct, os, sys, shutil, glob
from PIL import Image

RAW_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web', 'sprites', 'raw')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web', 'sprites')

AWAKENED_TO_TRANS = {
    5008:4008, 5009:4009, 5010:4010, 5011:4011,
    5012:4012, 5013:4013, 5015:4015, 5016:4016,
    5017:4017, 5018:4018, 5019:4019, 5020:4020, 5021:4021
}

# Jobs that use female sprites
FEMALE_JOBS = {20, 4021, 4212}


def parse_spr(data):
    """Parse .spr -> (indexed_frames, rgba_frames, palette)."""
    if data[0:2] != b'SP':
        raise ValueError('Not a SPR file')
    version = struct.unpack('<H', data[2:4])[0]
    idx_count = struct.unpack('<H', data[4:6])[0]
    pos = 6
    rgba_count = 0
    if version >= 0x201:
        rgba_count = struct.unpack('<H', data[6:8])[0]
        pos = 8

    indexed_frames = []
    for _ in range(idx_count):
        w = struct.unpack('<H', data[pos:pos+2])[0]
        h = struct.unpack('<H', data[pos+2:pos+4])[0]
        pos += 4
        if version >= 0x201:
            enc_size = struct.unpack('<H', data[pos:pos+2])[0]
            pos += 2
            pixels = bytearray()
            end_pos = pos + enc_size
            while pos < end_pos:
                b = data[pos]; pos += 1
                if b == 0:
                    cnt = data[pos]; pos += 1
                    pixels.extend(b'\x00' * cnt)
                else:
                    pixels.append(b)
            indexed_frames.append((w, h, bytes(pixels)))
        else:
            size = w * h
            indexed_frames.append((w, h, data[pos:pos+size]))
            pos += size

    rgba_frames = []
    for _ in range(rgba_count):
        w = struct.unpack('<H', data[pos:pos+2])[0]
        h = struct.unpack('<H', data[pos+2:pos+4])[0]
        pos += 4
        size = w * h * 4
        rgba_frames.append((w, h, data[pos:pos+size]))
        pos += size

    palette = data[-1024:]
    return indexed_frames, rgba_frames, palette


def parse_act(data):
    """Parse .act -> list of actions with frames, layers, and anchor points."""
    if data[0:2] != b'AC':
        raise ValueError('Not an ACT file')
    version = struct.unpack('<H', data[2:4])[0]
    action_count = struct.unpack('<H', data[4:6])[0]
    pos = 16  # magic(2) + version(2) + action_count(2) + reserved(10)

    actions = []
    for _ in range(action_count):
        frame_count = struct.unpack('<I', data[pos:pos+4])[0]
        pos += 4
        frames = []
        for _ in range(frame_count):
            pos += 32  # range rectangles
            layer_count = struct.unpack('<I', data[pos:pos+4])[0]
            pos += 4
            layers = []
            for _ in range(layer_count):
                x = struct.unpack('<i', data[pos:pos+4])[0]
                y = struct.unpack('<i', data[pos+4:pos+8])[0]
                sprite_idx = struct.unpack('<i', data[pos+8:pos+12])[0]
                mirror = struct.unpack('<I', data[pos+12:pos+16])[0]
                pos += 16
                scale_x = scale_y = 1.0
                sprite_type = 0
                if version >= 0x200:
                    pos += 4  # color RGBA
                    scale_x = struct.unpack('<f', data[pos:pos+4])[0]; pos += 4
                    if version >= 0x204:
                        scale_y = struct.unpack('<f', data[pos:pos+4])[0]; pos += 4
                    else:
                        scale_y = scale_x
                    pos += 4  # rotation
                    sprite_type = struct.unpack('<i', data[pos:pos+4])[0]; pos += 4
                    if version >= 0x205:
                        pos += 8  # w/h override
                layers.append({
                    'x': x, 'y': y, 'idx': sprite_idx,
                    'mirror': mirror, 'sx': scale_x, 'sy': scale_y,
                    'type': sprite_type
                })
            # Sound
            if version >= 0x200:
                pos += 4
            # Anchor points
            anchors = []
            if version >= 0x203:
                anc_count = struct.unpack('<i', data[pos:pos+4])[0]; pos += 4
                for _ in range(anc_count):
                    # Each anchor: unknown(4) + x(4) + y(4) + attr(4) = 16 bytes
                    ax = struct.unpack('<i', data[pos+4:pos+8])[0]
                    ay = struct.unpack('<i', data[pos+8:pos+12])[0]
                    anchors.append((ax, ay))
                    pos += 16
            frames.append({'layers': layers, 'anchors': anchors})
        actions.append(frames)
    return actions


def render_sprite_layer(idx_frames, rgba_frames, palette, layer):
    """Render a single sprite layer to an RGBA Image, or None."""
    idx = layer['idx']
    if idx < 0:
        return None
    stype = layer['type']

    img = None
    if stype == 0 and idx < len(idx_frames):
        w, h, px = idx_frames[idx]
        if w == 0 or h == 0:
            return None
        img = Image.new('RGBA', (w, h))
        for py in range(h):
            for ppx in range(w):
                pi = py * w + ppx
                if pi >= len(px):
                    break
                pal_idx = px[pi]
                if pal_idx == 0:
                    continue
                r = palette[pal_idx * 4]
                g = palette[pal_idx * 4 + 1]
                b = palette[pal_idx * 4 + 2]
                img.putpixel((ppx, py), (r, g, b, 255))
    elif stype == 1 and idx < len(rgba_frames):
        w, h, raw = rgba_frames[idx]
        if w == 0 or h == 0:
            return None
        rgba = bytearray(len(raw))
        for i in range(0, len(raw), 4):
            if i + 3 < len(raw):
                rgba[i]   = raw[i+3]
                rgba[i+1] = raw[i+2]
                rgba[i+2] = raw[i+1]
                rgba[i+3] = raw[i]
        img = Image.frombytes('RGBA', (w, h), bytes(rgba))

    if img is None:
        return None

    if layer['mirror']:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    sx, sy = layer['sx'], layer['sy']
    if sx != 1.0 or sy != 1.0:
        nw = max(1, int(img.width * abs(sx)))
        nh = max(1, int(img.height * abs(sy)))
        img = img.resize((nw, nh), Image.NEAREST)

    return img


def render_composite_frame(body_spr, body_palette, body_frame,
                           head_spr, head_palette, head_frame,
                           cw=120, ch=200):
    """Render body + head composited frame."""
    body_idx, body_rgba, _ = body_spr
    head_idx, head_rgba, _ = head_spr

    canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    cx, cy = cw // 2, ch // 2 + 40

    # Render body layers
    for layer in body_frame['layers']:
        img = render_sprite_layer(body_idx, body_rgba, body_palette, layer)
        if img is None:
            continue
        paste_x = cx + layer['x'] - img.width // 2
        paste_y = cy + layer['y'] - img.height // 2
        canvas.paste(img, (paste_x, paste_y), img)

    # Get body anchor point (where head attaches)
    body_anchor = body_frame['anchors'][0] if body_frame['anchors'] else (0, 0)

    # Get head anchor point (head's attachment origin)
    head_anchor = head_frame['anchors'][0] if head_frame['anchors'] else (0, 0)

    # Head offset: body anchor position - head anchor position
    head_off_x = body_anchor[0] - head_anchor[0]
    head_off_y = body_anchor[1] - head_anchor[1]

    # Render head layers
    for layer in head_frame['layers']:
        img = render_sprite_layer(head_idx, head_rgba, head_palette, layer)
        if img is None:
            continue
        paste_x = cx + head_off_x + layer['x'] - img.width // 2
        paste_y = cy + head_off_y + layer['y'] - img.height // 2
        canvas.paste(img, (paste_x, paste_y), img)

    return canvas


def main():
    # Load head sprites
    head_data = {}
    for gender_key in ['head_m', 'head_f']:
        spr_path = os.path.join(RAW_DIR, f'{gender_key}.spr')
        act_path = os.path.join(RAW_DIR, f'{gender_key}.act')
        if os.path.exists(spr_path) and os.path.exists(act_path):
            with open(spr_path, 'rb') as f:
                spr = f.read()
            with open(act_path, 'rb') as f:
                act = f.read()
            idx, rgba, pal = parse_spr(spr)
            actions = parse_act(act)
            head_data[gender_key] = {
                'spr': (idx, rgba, pal),
                'palette': pal,
                'actions': actions
            }
            print(f'Loaded {gender_key}: {len(idx)} idx + {len(rgba)} rgba frames, {len(actions)} actions')
        else:
            print(f'WARNING: {gender_key} not found, heads will be missing')

    # Process body sprites
    spr_files = glob.glob(os.path.join(RAW_DIR, '*.spr'))
    # Filter out head files
    spr_files = [f for f in spr_files if not os.path.basename(f).startswith('head_')]
    print(f'Found {len(spr_files)} body SPR files')

    success = 0
    for spr_path in sorted(spr_files):
        job_id = os.path.splitext(os.path.basename(spr_path))[0]
        act_path = spr_path.replace('.spr', '.act')

        if not os.path.exists(act_path):
            print(f'  [{job_id}] No ACT file, skipping')
            continue

        try:
            with open(spr_path, 'rb') as f:
                spr_data = f.read()
            with open(act_path, 'rb') as f:
                act_data = f.read()

            body_idx, body_rgba, body_pal = parse_spr(spr_data)
            body_actions = parse_act(act_data)

            if not body_actions:
                print(f'  [{job_id}] No actions')
                continue

            # Select head based on gender
            job_num = int(job_id)
            gender_key = 'head_f' if job_num in FEMALE_JOBS else 'head_m'
            head = head_data.get(gender_key)

            # Action 8 = walking (facing south), fallback to 0 (idle)
            walk_action = 8
            if walk_action >= len(body_actions) or not body_actions[walk_action]:
                walk_action = 0
            body_frames = body_actions[walk_action]
            gif_images = []

            for fi, body_frame in enumerate(body_frames):
                head_action_idx = walk_action
                if head and head['actions']:
                    if head_action_idx >= len(head['actions']):
                        head_action_idx = 0
                    head_act_frames = head['actions'][head_action_idx]
                    head_frame = head_act_frames[fi % len(head_act_frames)] if head_act_frames else None
                else:
                    head_frame = None

                if head and head_frame:
                    img = render_composite_frame(
                        (body_idx, body_rgba, body_pal), body_pal, body_frame,
                        head['spr'], head['palette'], head_frame
                    )
                else:
                    # No head available - render body only
                    canvas = Image.new('RGBA', (120, 200), (0, 0, 0, 0))
                    cx, cy = 60, 140
                    for layer in body_frame['layers']:
                        img_l = render_sprite_layer(body_idx, body_rgba, body_pal, layer)
                        if img_l:
                            px = cx + layer['x'] - img_l.width // 2
                            py = cy + layer['y'] - img_l.height // 2
                            canvas.paste(img_l, (px, py), img_l)
                    img = canvas
                gif_images.append(img)

            if not gif_images:
                print(f'  [{job_id}] No frames rendered')
                continue

            output = os.path.join(OUTPUT_DIR, f'{job_id}.gif')
            gif_images[0].save(
                output,
                save_all=True,
                append_images=gif_images[1:],
                duration=150,
                loop=0,
                disposal=2,
            )
            fsize = os.path.getsize(output) // 1024
            print(f'  [{job_id}] OK -> {len(gif_images)} frames, {fsize}KB')
            success += 1

        except Exception as e:
            print(f'  [{job_id}] ERROR: {e}')
            import traceback
            traceback.print_exc()

    # Copy transcendent -> awakened
    for aw_id, tr_id in AWAKENED_TO_TRANS.items():
        src = os.path.join(OUTPUT_DIR, f'{tr_id}.gif')
        dst = os.path.join(OUTPUT_DIR, f'{aw_id}.gif')
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f'  [{aw_id}] Copied from {tr_id}')

    print(f'\nDone! {success} GIFs created')


if __name__ == '__main__':
    main()
