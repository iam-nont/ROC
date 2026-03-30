# -*- coding: utf-8 -*-
"""List head sprite paths from GRF."""
import struct, zlib

GRF_PATH = r'C:\Program Files (x86)\Gravity Game Tech\RagnarokClassic\data.grf'

with open(GRF_PATH, 'rb') as f:
    f.read(15); f.read(15)
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
    heads = []
    while pos < len(table_data) and count < file_count:
        end = table_data.index(b'\x00', pos)
        fb = table_data[pos:end]
        pos = end + 1 + 17
        count += 1
        # 머리 = head in Korean, EUC-KR: \xb8\xd3\xb8\xae
        if b'\xb8\xd3\xb8\xae' in fb and b'.spr' in fb.lower():
            try:
                heads.append(fb.decode('euc-kr'))
            except:
                pass

with open('head_sprite_paths.txt', 'w', encoding='utf-8') as f:
    for h in sorted(heads):
        f.write(h + '\n')
print(f'Found {len(heads)} head sprites')
