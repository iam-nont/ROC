# -*- coding: utf-8 -*-
"""Extract character body sprites from ROC GRF and convert to animated GIF."""
import struct, zlib, os, sys, shutil

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

GRF_PATH = r'C:\Program Files (x86)\Gravity Game Tech\RagnarokClassic\data.grf'
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web', 'sprites')

# Job ID → (GRF sprite base name, gender 남/여)
# Path: data\sprite\인간족\몸통\{gender}\{name}_{gender}.spr
JOB_SPRITES = {
    0:    ('초보자', '남'),
    1:    ('검사', '남'),
    2:    ('마법사', '남'),
    3:    ('궁수', '남'),
    4:    ('성직자', '남'),
    5:    ('상인', '남'),
    6:    ('도둑', '남'),
    7:    ('기사', '남'),
    8:    ('프리스트', '남'),
    9:    ('위저드', '남'),
    10:   ('제철공', '남'),
    11:   ('헌터', '남'),
    12:   ('어세신', '남'),
    14:   ('크루세이더', '남'),
    15:   ('몽크', '남'),
    16:   ('세이지', '남'),
    17:   ('로그', '남'),
    18:   ('연금술사', '남'),
    19:   ('바드', '남'),
    20:   ('무희', '여'),
    23:   ('슈퍼노비스', '남'),
    24:   ('건너', '남'),       # Gunslinger
    25:   ('닌자', '남'),
    4008: ('로드나이트', '남'),
    4009: ('하이프리', '남'),    # Not 하이프리스트
    4010: ('하이위저드', '남'),
    4011: ('화이트스미스', '남'),
    4012: ('스나이퍼', '남'),
    4013: ('어쌔신크로스', '남'),
    4015: ('팔라딘', '남'),
    4016: ('챔피온', '남'),
    4017: ('프로페서', '남'),
    4018: ('스토커', '남'),
    4019: ('크리에이터', '남'),
    4020: ('클라운', '남'),
    4021: ('집시', '여'),
    4046: ('태권소년', '남'),
    4047: ('권성', '남'),
    4049: ('소울링커', '남'),
    4211: ('kagerou', '남'),
    4212: ('oboro', '여'),
}

# Awakened share sprites with transcendent
AWAKENED_TO_TRANS = {
    5008:4008, 5009:4009, 5010:4010, 5011:4011,
    5012:4012, 5013:4013, 5015:4015, 5016:4016,
    5017:4017, 5018:4018, 5019:4019, 5020:4020, 5021:4021
}


def read_grf_entries(grf_path):
    """Read all file entries from GRF, keyed by decoded filename."""
    entries = {}
    with open(grf_path, 'rb') as f:
        f.read(15)  # magic
        f.read(15)  # key
        file_table_offset = struct.unpack('<I', f.read(4))[0]
        seed = struct.unpack('<I', f.read(4))[0]
        file_count_raw = struct.unpack('<I', f.read(4))[0]
        version = struct.unpack('<I', f.read(4))[0]
        file_count = file_count_raw - seed - 7

        f.seek(file_table_offset + 46)
        table_comp_size = struct.unpack('<I', f.read(4))[0]
        table_size = struct.unpack('<I', f.read(4))[0]
        table_data = zlib.decompress(f.read(table_comp_size))

        pos = 0
        count = 0
        while pos < len(table_data) and count < file_count:
            end = table_data.index(b'\x00', pos)
            filename_bytes = table_data[pos:end]
            try:
                filename = filename_bytes.decode('euc-kr')
            except:
                filename = filename_bytes.decode('latin-1')
            pos = end + 1
            comp_size, align_size, real_size, entry_type, offset = struct.unpack(
                '<IIIB I', table_data[pos:pos+17])
            pos += 17
            count += 1
            entries[filename] = {
                'comp_size': comp_size,
                'align_size': align_size,
                'real_size': real_size,
                'type': entry_type,
                'offset': offset
            }
    return entries


def extract_file(grf_path, entry):
    """Extract a single file from GRF."""
    with open(grf_path, 'rb') as f:
        f.seek(entry['offset'] + 46)
        data = f.read(entry['align_size'])
        if entry['type'] & 1:
            data = zlib.decompress(data)
        return data


def parse_spr(data):
    """Parse RO .spr file → (indexed_frames, rgba_frames, palette)."""
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
    for i in range(idx_count):
        w = struct.unpack('<H', data[pos:pos+2])[0]
        h = struct.unpack('<H', data[pos+2:pos+4])[0]
        pos += 4
        if version >= 0x201:
            encoded_size = struct.unpack('<H', data[pos:pos+2])[0]
            pos += 2
            pixels = bytearray()
            end_pos = pos + encoded_size
            while pos < end_pos:
                b = data[pos]; pos += 1
                if b == 0:
                    cnt = data[pos]; pos += 1
                    pixels.extend(b'\x00' * cnt)
                else:
                    pixels.append(b)
            indexed_frames.append({'w': w, 'h': h, 'pixels': bytes(pixels)})
        else:
            size = w * h
            indexed_frames.append({'w': w, 'h': h, 'pixels': data[pos:pos+size]})
            pos += size

    rgba_frames = []
    for i in range(rgba_count):
        w = struct.unpack('<H', data[pos:pos+2])[0]
        h = struct.unpack('<H', data[pos+2:pos+4])[0]
        pos += 4
        size = w * h * 4
        # RGBA frames are stored as ABGR
        rgba_frames.append({'w': w, 'h': h, 'pixels': data[pos:pos+size], 'rgba': True})
        pos += size

    palette = data[-1024:]
    return indexed_frames, rgba_frames, palette


def parse_act(data):
    """Parse RO .act file → list of actions, each with frames and layers."""
    if data[0:2] != b'AC':
        raise ValueError('Not an ACT file')

    version = struct.unpack('<H', data[2:4])[0]
    action_count = struct.unpack('<H', data[4:6])[0]
    pos = 10

    actions = []
    for a in range(action_count):
        frame_count = struct.unpack('<I', data[pos:pos+4])[0]
        pos += 4
        frames = []
        for fr in range(frame_count):
            # Range rectangles (32 bytes)
            pos += 32
            layer_count = struct.unpack('<I', data[pos:pos+4])[0]
            pos += 4
            layers = []
            for l in range(layer_count):
                x = struct.unpack('<i', data[pos:pos+4])[0]
                y = struct.unpack('<i', data[pos+4:pos+8])[0]
                sprite_idx = struct.unpack('<i', data[pos+8:pos+12])[0]
                mirror = struct.unpack('<I', data[pos+12:pos+16])[0]
                pos += 16
                color = (255, 255, 255, 255)
                scale_x = scale_y = 1.0
                rotation = 0
                sprite_type = 0
                if version >= 0x200:
                    color = (data[pos], data[pos+1], data[pos+2], data[pos+3])
                    pos += 4
                    scale_x = struct.unpack('<f', data[pos:pos+4])[0]; pos += 4
                    if version >= 0x204:
                        scale_y = struct.unpack('<f', data[pos:pos+4])[0]; pos += 4
                    else:
                        scale_y = scale_x
                    rotation = struct.unpack('<i', data[pos:pos+4])[0]; pos += 4
                    sprite_type = struct.unpack('<i', data[pos:pos+4])[0]; pos += 4
                    if version >= 0x205:
                        pos += 8  # w/h override
                layers.append({
                    'x': x, 'y': y, 'sprite_idx': sprite_idx,
                    'mirror': mirror, 'color': color,
                    'scale_x': scale_x, 'scale_y': scale_y,
                    'rotation': rotation, 'sprite_type': sprite_type,
                })
            if version >= 0x200:
                pos += 4  # sound id
            if version >= 0x203:
                anchor_count = struct.unpack('<i', data[pos:pos+4])[0]; pos += 4
                pos += anchor_count * 16
            frames.append({'layers': layers})
        actions.append({'frames': frames})
    return actions


def render_frame(indexed_frames, rgba_frames, palette, layers, cw=120, ch=160):
    """Render one animation frame to RGBA PIL Image."""
    from PIL import Image
    canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    cx, cy = cw // 2, ch // 2 + 20

    for layer in layers:
        idx = layer['sprite_idx']
        if idx < 0:
            continue
        stype = layer['sprite_type']

        if stype == 0 and idx < len(indexed_frames):
            fr = indexed_frames[idx]
            w, h = fr['w'], fr['h']
            if w == 0 or h == 0: continue
            img = Image.new('RGBA', (w, h))
            px = fr['pixels']
            for py_ in range(h):
                for px_ in range(w):
                    pi = py_ * w + px_
                    if pi >= len(px): break
                    pal_idx = px[pi]
                    if pal_idx == 0: continue
                    r = palette[pal_idx * 4]
                    g = palette[pal_idx * 4 + 1]
                    b = palette[pal_idx * 4 + 2]
                    img.putpixel((px_, py_), (r, g, b, 255))
        elif stype == 1 and idx < len(rgba_frames):
            fr = rgba_frames[idx]
            w, h = fr['w'], fr['h']
            if w == 0 or h == 0: continue
            # ABGR → RGBA
            raw = fr['pixels']
            rgba = bytearray(len(raw))
            for i in range(0, len(raw), 4):
                rgba[i]   = raw[i+3]  # R
                rgba[i+1] = raw[i+2]  # G
                rgba[i+2] = raw[i+1]  # B
                rgba[i+3] = raw[i]    # A
            img = Image.frombytes('RGBA', (w, h), bytes(rgba))
        else:
            continue

        if layer['mirror']:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)

        sx, sy = layer['scale_x'], layer['scale_y']
        if sx != 1.0 or sy != 1.0:
            nw = max(1, int(img.width * abs(sx)))
            nh = max(1, int(img.height * abs(sy)))
            img = img.resize((nw, nh), Image.NEAREST)

        paste_x = cx + layer['x'] - img.width // 2
        paste_y = cy + layer['y'] - img.height // 2
        canvas.paste(img, (paste_x, paste_y), img)

    return canvas


def create_animated_gif(frames, output_path, duration=150):
    """Save frames as animated GIF with transparency."""
    if not frames:
        return False
    # Convert RGBA to P mode for GIF transparency
    from PIL import Image
    gif_frames = []
    for fr in frames:
        # Create a new image with transparent background
        p = fr.convert('RGBA')
        gif_frames.append(p)

    gif_frames[0].save(
        output_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
    )
    return True


def main():
    from PIL import Image
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print('Reading GRF entries...')
    entries = read_grf_entries(GRF_PATH)
    print(f'Total entries: {len(entries)}')

    success = 0
    failed = []

    for job_id, (kr_name, gender) in JOB_SPRITES.items():
        spr_path = f'data\\sprite\\인간족\\몸통\\{gender}\\{kr_name}_{gender}.spr'
        act_path = f'data\\sprite\\인간족\\몸통\\{gender}\\{kr_name}_{gender}.act'

        if spr_path not in entries:
            print(f'  [{job_id}] NOT FOUND: {spr_path}')
            failed.append(job_id)
            continue

        if act_path not in entries:
            print(f'  [{job_id}] ACT NOT FOUND: {act_path}')
            failed.append(job_id)
            continue

        try:
            spr_data = extract_file(GRF_PATH, entries[spr_path])
            act_data = extract_file(GRF_PATH, entries[act_path])

            idx_frames, rgba_frames, palette = parse_spr(spr_data)
            actions = parse_act(act_data)

            # Action 0 = idle standing (facing south)
            if not actions or not actions[0]['frames']:
                print(f'  [{job_id}] No idle frames')
                failed.append(job_id)
                continue

            idle = actions[0]
            gif_frames = []
            for frame in idle['frames']:
                img = render_frame(idx_frames, rgba_frames, palette, frame['layers'])
                gif_frames.append(img)

            output_path = os.path.join(OUTPUT_DIR, f'{job_id}.gif')
            if create_animated_gif(gif_frames, output_path):
                fsize = os.path.getsize(output_path) // 1024
                print(f'  [{job_id}] OK → {len(gif_frames)} frames, {fsize}KB')
                success += 1
            else:
                failed.append(job_id)

        except Exception as e:
            print(f'  [{job_id}] ERROR: {e}')
            failed.append(job_id)

    # Copy transcendent → awakened
    for aw_id, tr_id in AWAKENED_TO_TRANS.items():
        src = os.path.join(OUTPUT_DIR, f'{tr_id}.gif')
        dst = os.path.join(OUTPUT_DIR, f'{aw_id}.gif')
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f'  [{aw_id}] Copied from {tr_id}')

    print(f'\nDone! Success: {success}/{len(JOB_SPRITES)}, Failed: {len(failed)}')
    if failed:
        print(f'Failed IDs: {failed}')


if __name__ == '__main__':
    main()
