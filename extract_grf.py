"""
GRF (Gravity Resource File) Extractor for Ragnarok Online
Supports GRF version 0x200

Based on rAthena's grfio.cpp and des.cpp implementation.
The GRF uses a MODIFIED DES (single round, no key schedule) - NOT standard DES.

Type flags:
  0x01 = FILELIST_TYPE_FILE (is a file, compressed with zlib)
  0x02 = FILELIST_TYPE_ENCRYPT_MIXED (full DES encryption with periodic decrypt/shuffle)
  0x04 = FILELIST_TYPE_ENCRYPT_HEADER (header-only DES, first 20 blocks)

Type 1 (0x01): plain zlib
Type 3 (0x01|0x02): encrypt_mixed + zlib
Type 5 (0x01|0x04): encrypt_header + zlib
"""

import struct
import zlib
import os
import sys

# ============================================================
# Modified DES implementation (from rAthena des.cpp)
# This is NOT standard DES - single round, no key schedule
# ============================================================

mask = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]

ip_table = [
    58, 50, 42, 34, 26, 18, 10,  2,
    60, 52, 44, 36, 28, 20, 12,  4,
    62, 54, 46, 38, 30, 22, 14,  6,
    64, 56, 48, 40, 32, 24, 16,  8,
    57, 49, 41, 33, 25, 17,  9,  1,
    59, 51, 43, 35, 27, 19, 11,  3,
    61, 53, 45, 37, 29, 21, 13,  5,
    63, 55, 47, 39, 31, 23, 15,  7,
]

fp_table = [
    40,  8, 48, 16, 56, 24, 64, 32,
    39,  7, 47, 15, 55, 23, 63, 31,
    38,  6, 46, 14, 54, 22, 62, 30,
    37,  5, 45, 13, 53, 21, 61, 29,
    36,  4, 44, 12, 52, 20, 60, 28,
    35,  3, 43, 11, 51, 19, 59, 27,
    34,  2, 42, 10, 50, 18, 58, 26,
    33,  1, 41,  9, 49, 17, 57, 25,
]

tp_table = [
    16,  7, 20, 21,
    29, 12, 28, 17,
     1, 15, 23, 26,
     5, 18, 31, 10,
     2,  8, 24, 14,
    32, 27,  3,  9,
    19, 13, 30,  6,
    22, 11,  4, 25,
]

# S-boxes (optimized: two nibbles per lookup)
s_table = [
    [
        0xef, 0x03, 0x41, 0xfd, 0xd8, 0x74, 0x1e, 0x47,  0x26, 0xef, 0xfb, 0x22, 0xb3, 0xd8, 0x84, 0x1e,
        0x39, 0xac, 0xa7, 0x60, 0x62, 0xc1, 0xcd, 0xba,  0x5c, 0x96, 0x90, 0x59, 0x05, 0x3b, 0x7a, 0x85,
        0x40, 0xfd, 0x1e, 0xc8, 0xe7, 0x8a, 0x8b, 0x21,  0xda, 0x43, 0x64, 0x9f, 0x2d, 0x14, 0xb1, 0x72,
        0xf5, 0x5b, 0xc8, 0xb6, 0x9c, 0x37, 0x76, 0xec,  0x39, 0xa0, 0xa3, 0x05, 0x52, 0x6e, 0x0f, 0xd9,
    ],
    [
        0xa7, 0xdd, 0x0d, 0x78, 0x9e, 0x0b, 0xe3, 0x95,  0x60, 0x36, 0x36, 0x4f, 0xf9, 0x60, 0x5a, 0xa3,
        0x11, 0x24, 0xd2, 0x87, 0xc8, 0x52, 0x75, 0xec,  0xbb, 0xc1, 0x4c, 0xba, 0x24, 0xfe, 0x8f, 0x19,
        0xda, 0x13, 0x66, 0xaf, 0x49, 0xd0, 0x90, 0x06,  0x8c, 0x6a, 0xfb, 0x91, 0x37, 0x8d, 0x0d, 0x78,
        0xbf, 0x49, 0x11, 0xf4, 0x23, 0xe5, 0xce, 0x3b,  0x55, 0xbc, 0xa2, 0x57, 0xe8, 0x22, 0x74, 0xce,
    ],
    [
        0x2c, 0xea, 0xc1, 0xbf, 0x4a, 0x24, 0x1f, 0xc2,  0x79, 0x47, 0xa2, 0x7c, 0xb6, 0xd9, 0x68, 0x15,
        0x80, 0x56, 0x5d, 0x01, 0x33, 0xfd, 0xf4, 0xae,  0xde, 0x30, 0x07, 0x9b, 0xe5, 0x83, 0x9b, 0x68,
        0x49, 0xb4, 0x2e, 0x83, 0x1f, 0xc2, 0xb5, 0x7c,  0xa2, 0x19, 0xd8, 0xe5, 0x7c, 0x2f, 0x83, 0xda,
        0xf7, 0x6b, 0x90, 0xfe, 0xc4, 0x01, 0x5a, 0x97,  0x61, 0xa6, 0x3d, 0x40, 0x0b, 0x58, 0xe6, 0x3d,
    ],
    [
        0x4d, 0xd1, 0xb2, 0x0f, 0x28, 0xbd, 0xe4, 0x78,  0xf6, 0x4a, 0x0f, 0x93, 0x8b, 0x17, 0xd1, 0xa4,
        0x3a, 0xec, 0xc9, 0x35, 0x93, 0x56, 0x7e, 0xcb,  0x55, 0x20, 0xa0, 0xfe, 0x6c, 0x89, 0x17, 0x62,
        0x17, 0x62, 0x4b, 0xb1, 0xb4, 0xde, 0xd1, 0x87,  0xc9, 0x14, 0x3c, 0x4a, 0x7e, 0xa8, 0xe2, 0x7d,
        0xa0, 0x9f, 0xf6, 0x5c, 0x6a, 0x09, 0x8d, 0xf0,  0x0f, 0xe3, 0x53, 0x25, 0x95, 0x36, 0x28, 0xcb,
    ],
]


def des_IP(block):
    """Initial Permutation."""
    tmp = bytearray(8)
    for i in range(64):
        j = ip_table[i] - 1
        if block[(j >> 3) & 7] & mask[j & 7]:
            tmp[(i >> 3) & 7] |= mask[i & 7]
    return tmp


def des_FP(block):
    """Final Permutation (IP inverse)."""
    tmp = bytearray(8)
    for i in range(64):
        j = fp_table[i] - 1
        if block[(j >> 3) & 7] & mask[j & 7]:
            tmp[(i >> 3) & 7] |= mask[i & 7]
    return tmp


def des_E(block):
    """Expansion - expands upper 4 bytes (32b) into 8 x 6-bit (48b)."""
    tmp = bytearray(8)
    # Optimized version from rAthena
    tmp[0] = ((block[7] << 5) | (block[4] >> 3)) & 0x3f
    tmp[1] = ((block[4] << 1) | (block[5] >> 7)) & 0x3f
    tmp[2] = ((block[4] << 5) | (block[5] >> 3)) & 0x3f
    tmp[3] = ((block[5] << 1) | (block[6] >> 7)) & 0x3f
    tmp[4] = ((block[5] << 5) | (block[6] >> 3)) & 0x3f
    tmp[5] = ((block[6] << 1) | (block[7] >> 7)) & 0x3f
    tmp[6] = ((block[6] << 5) | (block[7] >> 3)) & 0x3f
    tmp[7] = ((block[7] << 1) | (block[4] >> 7)) & 0x3f
    return tmp


def des_TP(block):
    """Transposition (P-BOX)."""
    tmp = bytearray(8)
    for i in range(32):
        j = tp_table[i] - 1
        if block[(j >> 3) + 0] & mask[j & 7]:
            tmp[(i >> 3) + 4] |= mask[i & 7]
    return tmp


def des_SBOX(block):
    """S-box substitution (optimized: two nibbles per lookup)."""
    tmp = bytearray(8)
    for i in range(4):
        tmp[i] = (s_table[i][block[i*2+0]] & 0xf0) | (s_table[i][block[i*2+1]] & 0x0f)
    return tmp


def des_RoundFunction(block):
    """DES round function: XORs block[0..3] with TP(SBOX(E(block[4..7])))."""
    tmp = bytearray(block)
    tmp = des_E(tmp)
    tmp = des_SBOX(tmp)
    tmp = des_TP(tmp)
    result = bytearray(block)
    result[0] ^= tmp[4]
    result[1] ^= tmp[5]
    result[2] ^= tmp[6]
    result[3] ^= tmp[7]
    return result


def des_decrypt_block(block):
    """Decrypt a single 8-byte block using modified DES (single round)."""
    b = bytearray(block)
    b = des_IP(b)
    b = des_RoundFunction(b)
    b = des_FP(b)
    return bytes(b)


# ============================================================
# GRF-specific functions (from rAthena grfio.cpp)
# ============================================================

# Substitution table for grf_shuffle_dec
def grf_substitution(b):
    """Byte substitution (symmetric operation)."""
    table = {
        0x00: 0x2B, 0x2B: 0x00,
        0x6C: 0x80, 0x80: 0x6C,
        0x01: 0x68, 0x68: 0x01,
        0x48: 0x77, 0x77: 0x48,
        0x60: 0xFF, 0xFF: 0x60,
        0xB9: 0xC0, 0xC0: 0xB9,
        0xFE: 0xEB, 0xEB: 0xFE,
    }
    return table.get(b, b)


def grf_shuffle_dec(block):
    """De-shuffle an 8-byte block."""
    out = bytearray(8)
    out[0] = block[3]
    out[1] = block[4]
    out[2] = block[6]
    out[3] = block[0]
    out[4] = block[1]
    out[5] = block[2]
    out[6] = block[5]
    out[7] = grf_substitution(block[7])
    return bytes(out)


def grf_decode_header(data):
    """Decrypt first 20 blocks (160 bytes) with DES."""
    buf = bytearray(data)
    nblocks = len(buf) // 8

    for i in range(min(20, nblocks)):
        decrypted = des_decrypt_block(buf[i*8:(i+1)*8])
        buf[i*8:(i+1)*8] = decrypted

    return bytes(buf)


def grf_decode_full(data, cycle):
    """Full decryption: first 20 blocks DES, then periodic DES/shuffle."""
    buf = bytearray(data)
    nblocks = len(buf) // 8

    # First 20 blocks are all DES-encrypted
    for i in range(min(20, nblocks)):
        decrypted = des_decrypt_block(buf[i*8:(i+1)*8])
        buf[i*8:(i+1)*8] = decrypted

    dcycle = cycle
    scycle = 7

    # j starts at -1 (will be incremented to 0 on first non-des block)
    # Using the exact same logic as rAthena's C code
    j = -1  # unsigned wraparound equivalent - we use Python's arbitrary precision

    for i in range(20, nblocks):
        if i % dcycle == 0:
            # Decrypt block
            decrypted = des_decrypt_block(buf[i*8:(i+1)*8])
            buf[i*8:(i+1)*8] = decrypted
            continue

        j += 1
        if j % scycle == 0 and j != 0:
            # De-shuffle block
            shuffled = grf_shuffle_dec(buf[i*8:(i+1)*8])
            buf[i*8:(i+1)*8] = shuffled
            continue

        # Plaintext, do nothing

    return bytes(buf)


def grf_decode(data, entry_type, entry_len):
    """
    Decode GRF file data.

    Args:
        data: raw file data from GRF
        entry_type: file entry type flags
        entry_len: compressed size (srclen)

    Returns:
        Decoded (but still zlib-compressed) data
    """
    FILELIST_TYPE_ENCRYPT_MIXED = 0x02
    FILELIST_TYPE_ENCRYPT_HEADER = 0x04

    if entry_type & FILELIST_TYPE_ENCRYPT_MIXED:
        # Compute number of digits of entry_len
        digits = 1
        i = 10
        while i <= entry_len:
            digits += 1
            i *= 10

        # Choose cycle size
        if digits < 3:
            cycle = 1
        elif digits < 5:
            cycle = digits + 1
        elif digits < 7:
            cycle = digits + 9
        else:
            cycle = digits + 15

        return grf_decode_full(data, cycle)

    elif entry_type & FILELIST_TYPE_ENCRYPT_HEADER:
        return grf_decode_header(data)

    else:
        # Plaintext
        return data


def extract_grf_files(grf_path, target_patterns, output_dir):
    """
    Extract files matching patterns from a GRF archive.

    Args:
        grf_path: Path to the .grf file
        target_patterns: List of substrings to match in filenames (case-insensitive)
        output_dir: Directory to save extracted files
    """
    os.makedirs(output_dir, exist_ok=True)

    with open(grf_path, 'rb') as f:
        # Read header
        signature = f.read(15)
        if signature != b'Master of Magic':
            raise ValueError(f"Invalid GRF signature: {signature}")

        key = f.read(15)
        file_table_offset = struct.unpack('<I', f.read(4))[0]
        seed = struct.unpack('<I', f.read(4))[0]
        file_count_raw = struct.unpack('<I', f.read(4))[0]
        version = struct.unpack('<I', f.read(4))[0]

        if version != 0x200:
            raise ValueError(f"Unsupported GRF version: 0x{version:08X}")

        actual_count = file_count_raw - seed - 7
        print(f"GRF v{version >> 8}.{version & 0xFF}: {actual_count} files")

        # Read file table
        table_pos = file_table_offset + 46
        f.seek(table_pos)
        ft_compressed_size = struct.unpack('<I', f.read(4))[0]
        ft_uncompressed_size = struct.unpack('<I', f.read(4))[0]

        compressed_table = f.read(ft_compressed_size)
        table_data = zlib.decompress(compressed_table)

        # Parse file entries and find matches
        pos = 0
        count = 0
        extracted = []

        while pos < len(table_data) and count < actual_count:
            # Read null-terminated filename
            end = table_data.index(b'\x00', pos)
            filename_bytes = table_data[pos:end]
            pos = end + 1

            # Read entry metadata
            compressed_size, aligned_size, real_size = struct.unpack('<III', table_data[pos:pos+12])
            entry_type = table_data[pos+12]
            offset = struct.unpack('<I', table_data[pos+13:pos+17])[0]
            pos += 17
            count += 1

            # Decode filename
            try:
                fname = filename_bytes.decode('euc-kr')
            except:
                fname = filename_bytes.decode('latin-1')

            fname_lower = fname.lower()

            # Check if this file matches any of our patterns
            matched = False
            for pattern in target_patterns:
                if pattern.lower() in fname_lower:
                    matched = True
                    break

            if not matched:
                continue

            # Skip directory entries
            if entry_type == 2 or not (entry_type & 0x01):
                continue

            print(f"\nFound: {fname}")
            print(f"  Type: {entry_type}, Compressed: {compressed_size}, "
                  f"Aligned: {aligned_size}, Real: {real_size}, Offset: {offset}")

            # Read the file data from GRF (data offset = offset + 46)
            data_pos = offset + 46
            f_pos = f.tell()
            f.seek(data_pos)
            file_data = f.read(aligned_size)
            f.seek(f_pos)

            if len(file_data) != aligned_size:
                print(f"  WARNING: Read {len(file_data)} bytes, expected {aligned_size}")
                continue

            # Decrypt the data
            try:
                # Step 1: GRF decode (DES decryption if needed)
                decoded_data = grf_decode(file_data, entry_type, compressed_size)

                # Step 2: zlib decompress
                decompressed = zlib.decompress(decoded_data)

                # Verify size
                if len(decompressed) != real_size:
                    print(f"  WARNING: Decompressed {len(decompressed)} bytes, expected {real_size}")

                # Save the file
                basename = os.path.basename(fname)
                output_path = os.path.join(output_dir, basename)

                # Handle duplicates
                if os.path.exists(output_path):
                    name, ext = os.path.splitext(basename)
                    i = 1
                    while os.path.exists(output_path):
                        output_path = os.path.join(output_dir, f"{name}_{i}{ext}")
                        i += 1

                with open(output_path, 'wb') as out:
                    out.write(decompressed)

                print(f"  Saved: {output_path} ({len(decompressed):,} bytes)")
                extracted.append((fname, output_path, len(decompressed)))

            except Exception as e:
                print(f"  ERROR: {e}")
                import traceback
                traceback.print_exc()
                continue

        print(f"\n{'='*60}")
        print(f"Extracted {len(extracted)} files:")
        for fname, path, size in extracted:
            print(f"  {path} ({size:,} bytes)")

        return extracted


if __name__ == '__main__':
    grf_path = r'C:\Program Files (x86)\Gravity Game Tech\RagnarokClassic\data.grf'
    output_dir = r'D:\Development\ROC\web'

    # Patterns to match for world map files
    patterns = [
        'worldmap.bmp',
        'worldmap.jpg',
        'worldmap_dimension',
        'worldmap_localizing',
        'worldmap_mob',
    ]

    extract_grf_files(grf_path, patterns, output_dir)
