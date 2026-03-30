"""List all body sprite paths from GRF to a file for debugging."""
import struct, zlib

GRF_PATH = r'C:\Program Files (x86)\Gravity Game Tech\RagnarokClassic\data.grf'

entries = {}
with open(GRF_PATH, 'rb') as f:
    magic = f.read(15)
    key = f.read(15)
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
        pos = end + 1
        comp_size, align_size, real_size, entry_type, offset = struct.unpack('<IIIB I', table_data[pos:pos+17])
        pos += 17
        count += 1

        # Check for body sprite path (인간족\몸통 in EUC-KR)
        # 인간족 = \xc0\xce\xb0\xa3\xc1\xb7
        # 몸통 = \xb8\xf6\xc5\xeb
        if b'\xc0\xce\xb0\xa3\xc1\xb7' in filename_bytes and b'.spr' in filename_bytes.lower():
            try:
                decoded = filename_bytes.decode('euc-kr')
            except:
                decoded = repr(filename_bytes)
            entries[decoded] = True

# Write to file
with open('sprite_paths.txt', 'w', encoding='utf-8') as f:
    for path in sorted(entries.keys()):
        f.write(path + '\n')

print(f'Written {len(entries)} paths to sprite_paths.txt')
