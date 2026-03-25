"""
Extract minimap BMP images from data.grf and convert to PNG.

Minimap images in RO GRF are at:
  data\\texture\\유저인터페이스\\map\\<mapname>.bmp

Output: web/minimaps/<mapname>.png
"""
import os
import re
import struct
import sys
import zlib
import json
from PIL import Image
import io

from extract_grf import grf_decode

GRF_PATH = r'C:\Program Files (x86)\Gravity Game Tech\RagnarokClassic\data.grf'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'web', 'minimaps')

# Korean path component for minimap directory
MINIMAP_DIR_MARKER = 'map'  # The last folder in the path


def get_needed_maps():
    """Get set of map names we need minimaps for."""
    maps = set()

    # From mappostable.txt
    mappos_file = os.path.join(BASE_DIR, 'temp_extract', 'mappostable.txt')
    if os.path.exists(mappos_file):
        with open(mappos_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                parts = line.strip().split('#')
                if len(parts) >= 6:
                    try:
                        int(parts[2])
                        map_name = parts[1].replace('.rsw', '')
                        maps.add(map_name.lower())
                    except (ValueError, IndexError):
                        pass

    # From spawn_data.js
    spawn_file = os.path.join(BASE_DIR, 'web', 'spawn_data.js')
    if os.path.exists(spawn_file):
        with open(spawn_file, 'r', encoding='utf-8') as f:
            content = f.read()
        matches = re.findall(r'"([^"]+)":\[', content)
        maps.update(m.lower() for m in matches)

    return maps


def extract_minimaps():
    """Extract minimap BMPs from GRF and convert to PNG."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    needed_maps = get_needed_maps()
    print(f"Need minimaps for {len(needed_maps)} maps")

    if not os.path.exists(GRF_PATH):
        print(f"ERROR: GRF not found at {GRF_PATH}")
        return

    with open(GRF_PATH, 'rb') as f:
        # Read GRF header
        signature = f.read(15)
        if signature != b'Master of Magic':
            print(f"Invalid GRF signature")
            return

        key = f.read(15)
        file_table_offset = struct.unpack('<I', f.read(4))[0]
        seed = struct.unpack('<I', f.read(4))[0]
        file_count_raw = struct.unpack('<I', f.read(4))[0]
        version = struct.unpack('<I', f.read(4))[0]

        actual_count = file_count_raw - seed - 7
        print(f"GRF v{version >> 8}.{version & 0xFF}: {actual_count} files")

        # Read file table
        table_pos = file_table_offset + 46
        f.seek(table_pos)
        ft_compressed_size = struct.unpack('<I', f.read(4))[0]
        ft_uncompressed_size = struct.unpack('<I', f.read(4))[0]

        compressed_table = f.read(ft_compressed_size)
        table_data = zlib.decompress(compressed_table)
        print(f"File table decompressed: {len(table_data):,} bytes")

        # Scan for minimap BMP files
        pos = 0
        count = 0
        found = 0
        converted = 0

        while pos < len(table_data) and count < actual_count:
            end = table_data.index(b'\x00', pos)
            filename_bytes = table_data[pos:end]
            pos = end + 1

            compressed_size, aligned_size, real_size = struct.unpack('<III', table_data[pos:pos+12])
            entry_type = table_data[pos+12]
            offset = struct.unpack('<I', table_data[pos+13:pos+17])[0]
            pos += 17
            count += 1

            # Skip directory entries
            if entry_type == 2 or not (entry_type & 0x01):
                continue

            # Decode filename
            try:
                fname = filename_bytes.decode('euc-kr')
            except:
                try:
                    fname = filename_bytes.decode('latin-1')
                except:
                    continue

            fname_lower = fname.lower()

            # Check if this is a minimap file
            # Path pattern: data\texture\유저인터페이스\map\MAPNAME.bmp
            if '\\map\\' not in fname_lower or not fname_lower.endswith('.bmp'):
                continue

            # Extract map name from path
            parts = fname.replace('/', '\\').split('\\')
            bmp_name = parts[-1]  # e.g., "prontera.bmp"
            map_name = bmp_name[:-4].lower()  # e.g., "prontera"

            # Only extract maps we need
            if map_name not in needed_maps:
                continue

            found += 1

            # Check if already exists
            png_path = os.path.join(OUTPUT_DIR, f"{map_name}.png")
            if os.path.exists(png_path):
                converted += 1
                continue

            # Read and decode file data
            try:
                data_pos = offset + 46
                f_pos = f.tell()
                f.seek(data_pos)
                file_data = f.read(aligned_size)
                f.seek(f_pos)

                if len(file_data) != aligned_size:
                    continue

                decoded_data = grf_decode(file_data, entry_type, compressed_size)
                decompressed = zlib.decompress(decoded_data)

                # Convert BMP to PNG
                img = Image.open(io.BytesIO(decompressed))
                img.save(png_path, 'PNG', optimize=True)
                converted += 1

                if converted % 50 == 0:
                    print(f"  Converted {converted} maps...")

            except Exception as e:
                print(f"  Error extracting {map_name}: {e}")
                # Restore file position
                try:
                    f.seek(f_pos)
                except:
                    pass
                continue

    print(f"\nResults:")
    print(f"  Found in GRF: {found}")
    print(f"  Converted to PNG: {converted}")
    print(f"  Output: {OUTPUT_DIR}")

    # Check which needed maps are missing
    existing = {os.path.splitext(fn)[0] for fn in os.listdir(OUTPUT_DIR) if fn.endswith('.png')}
    missing = needed_maps - existing
    if missing:
        print(f"\n  Missing minimaps ({len(missing)}):")
        for m in sorted(missing):
            print(f"    {m}")
    else:
        print(f"\n  All {len(needed_maps)} minimaps extracted!")


if __name__ == '__main__':
    extract_minimaps()
