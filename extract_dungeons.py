import json

with open('D:/Development/ROC/monsters.json', 'r', encoding='utf-8') as f:
    monsters = json.load(f)

dungeon_monsters_list = [
    # Prontera Culvert
    ('THIEF_BUG', 'Prontera Culvert'),
    ('THIEF_BUG_', 'Prontera Culvert'),
    ('THIEF_BUG__', 'Prontera Culvert'),
    ('FAMILIAR', 'Prontera Culvert'),
    ('POISON_SPORE', 'Prontera Culvert'),
    ('PLANKTON', 'Prontera Culvert'),
    ('TAROU', 'Prontera Culvert'),
    ('CRAMP', 'Prontera Culvert'),
    ('GOLDEN_BUG', 'Prontera Culvert'),

    # Payon Dungeon
    ('ZOMBIE', 'Payon Dungeon'),
    ('SKELETON', 'Payon Dungeon'),
    ('ARCHER_SKELETON', 'Payon Dungeon'),
    ('SOLDIER_SKELETON', 'Payon Dungeon'),
    ('POPORING', 'Payon Dungeon'),
    ('MUNAK', 'Payon Dungeon'),
    ('BONGUN', 'Payon Dungeon'),
    ('HYEGUN', 'Payon Dungeon'),
    ('SOHEE', 'Payon Dungeon'),
    ('MOONLIGHT', 'Payon Dungeon'),
    ('HORONG', 'Payon Dungeon'),
    ('DOKEBI', 'Payon Dungeon'),
    ('NINE_TAIL', 'Payon Dungeon'),

    # Geffen Dungeon
    ('BAPHOMET_JR', 'Geffen Dungeon'),
    ('WHISPER', 'Geffen Dungeon'),
    ('MARIONETTE', 'Geffen Dungeon'),
    ('JAKK', 'Geffen Dungeon'),
    ('NIGHTMARE', 'Geffen Dungeon'),
    ('HUNTER_FLY', 'Geffen Dungeon'),
    ('BAPHOMET', 'Geffen Dungeon'),
    ('DEVILING', 'Geffen Dungeon'),

    # Orc Dungeon
    ('ORC_SKELETON', 'Orc Dungeon'),
    ('ORC_ZOMBIE', 'Orc Dungeon'),
    ('STEEL_CHONCHON', 'Orc Dungeon'),
    ('DRAINLIAR', 'Orc Dungeon'),
    ('ORC_WARRIOR', 'Orc Dungeon'),
    ('ORC_LADY', 'Orc Dungeon'),
    ('HIGH_ORC', 'Orc Dungeon'),
    ('ORC_BABY', 'Orc Dungeon'),
    ('ORC_ARCHER', 'Orc Dungeon'),
    ('ORC_LORD', 'Orc Dungeon'),

    # Byalan Dungeon
    ('VADON', 'Byalan Dungeon'),
    ('MARINA', 'Byalan Dungeon'),
    ('CORNUTUS', 'Byalan Dungeon'),
    ('MEGALODON', 'Byalan Dungeon'),
    ('HYDRA', 'Byalan Dungeon'),
    ('MARSE', 'Byalan Dungeon'),
    ('SWORDFISH', 'Byalan Dungeon'),
    ('OBEAUNE', 'Byalan Dungeon'),
    ('MARC', 'Byalan Dungeon'),
    ('PHEN', 'Byalan Dungeon'),
    ('MERMAN', 'Byalan Dungeon'),
    ('STROUF', 'Byalan Dungeon'),

    # Glast Heim
    ('RAYDRIC', 'Glast Heim'),
    ('KHALITZBURG', 'Glast Heim'),
    ('DARK_LORD', 'Glast Heim'),
    ('INJUSTICE', 'Glast Heim'),
    ('BLOODY_KNIGHT', 'Glast Heim'),
    ('CHIMERA', 'Glast Heim'),
    ('DARK_ILLUSION', 'Glast Heim'),
    ('ABYSMAL_KNIGHT', 'Glast Heim'),
    ('MIMIC', 'Glast Heim'),
    ('WRAITH', 'Glast Heim'),
    ('EVIL_DRUID', 'Glast Heim'),
    ('RIDEWORD', 'Glast Heim'),
    ('GARGOYLE', 'Glast Heim'),
    ('CARAT', 'Glast Heim'),
    ('WIND_GHOST', 'Glast Heim'),
    ('RAYDRIC_ARCHER', 'Glast Heim'),
    ('MYSTELTAINN', 'Glast Heim'),
    ('TIRFING', 'Glast Heim'),
    ('EXECUTIONER', 'Glast Heim'),

    # Sphinx
    ('REQUIEM', 'Sphinx'),
    ('MARDUK', 'Sphinx'),
    ('PASANA', 'Sphinx'),
    ('MINOROUS', 'Sphinx'),
    ('ANUBIS', 'Sphinx'),
    ('MATYR', 'Sphinx'),
    ('PHARAOH', 'Sphinx'),

    # Pyramid
    ('MUMMY', 'Pyramid'),
    ('ISIS', 'Pyramid'),
    ('VERIT', 'Pyramid'),
    ('DRAINLIAR', 'Pyramid'),
    ('OSIRIS', 'Pyramid'),
    ('ANCIENT_MUMMY', 'Pyramid'),
    ('AMON_RA', 'Pyramid'),

    # Clock Tower
    ('CLOCK', 'Clock Tower'),
    ('ALARM', 'Clock Tower'),
    ('PUNK', 'Clock Tower'),
    ('BATHORY', 'Clock Tower'),
    ('ELDER', 'Clock Tower'),
    ('PENOMENA', 'Clock Tower'),
    ('OWL_DUKE', 'Clock Tower'),
    ('OWL_BARON', 'Clock Tower'),

    # Turtle Island
    ('PERMETER', 'Turtle Island'),
    ('SOLIDER', 'Turtle Island'),
    ('FREEZER', 'Turtle Island'),
    ('HEATER', 'Turtle Island'),
    ('ASSAULTER', 'Turtle Island'),
    ('TURTLE_GENERAL', 'Turtle Island'),

    # Abbey
    ('BANSHEE', 'Abbey'),
    ('NECROMANCER_', 'Abbey'),
    ('RAGGED_ZOMBIE', 'Abbey'),
    ('ZOMBIE_SLAUGHTER', 'Abbey'),
    ('HELL_POODLE', 'Abbey'),
    ('FLAME_SKULL', 'Abbey'),
    ('FALLEN_BISHOP', 'Abbey'),
    ('BEELZEBUB', 'Abbey'),
]

# Build lookup
aegis_to_dungeons = {}
for aegis, dungeon in dungeon_monsters_list:
    if aegis not in aegis_to_dungeons:
        aegis_to_dungeons[aegis] = []
    if dungeon not in aegis_to_dungeons[aegis]:
        aegis_to_dungeons[aegis].append(dungeon)

# Collect results
results = {}
for m in monsters:
    aegis = m.get('aegisName', '')
    if aegis in aegis_to_dungeons:
        for dungeon in aegis_to_dungeons[aegis]:
            if dungeon not in results:
                results[dungeon] = []

            drops = m.get('drops', [])
            notable_drops = [d['itemName'] for d in sorted(drops, key=lambda x: -x['rate'])[:3]]
            card_drops = [d['itemName'] for d in drops if 'Card' in d.get('itemName', '')]

            results[dungeon].append({
                'name': m['name'],
                'aegis': aegis,
                'level': m['level'],
                'hp': m['hp'],
                'baseExp': m['baseExp'],
                'jobExp': m['jobExp'],
                'race': m.get('race', ''),
                'element': m.get('element', ''),
                'size': m.get('size', ''),
                'cls': m.get('class', ''),
                'notable_drops': notable_drops,
                'card': card_drops[0] if card_drops else 'N/A',
                'atk': m.get('atk', [0, 0]),
            })

# Print organized by dungeon, sorted by level
for dungeon in ['Prontera Culvert', 'Payon Dungeon', 'Byalan Dungeon', 'Orc Dungeon',
                 'Geffen Dungeon', 'Pyramid', 'Sphinx', 'Clock Tower',
                 'Glast Heim', 'Turtle Island', 'Abbey']:
    if dungeon not in results:
        print(f"\n=== {dungeon} === (NO DATA FOUND)")
        continue
    mons = sorted(results[dungeon], key=lambda x: x['level'])
    min_lv = mons[0]['level']
    max_lv = mons[-1]['level']

    # Determine difficulty
    avg_lv = sum(m['level'] for m in mons if m['cls'] == 'Normal') / max(1, len([m for m in mons if m['cls'] == 'Normal']))
    if avg_lv <= 40:
        diff = "Easy (1-40)"
    elif avg_lv <= 70:
        diff = "Medium (41-70)"
    elif avg_lv <= 99:
        diff = "Hard (71-99)"
    else:
        diff = "Very Hard (100+)"

    print(f"\n{'='*60}")
    print(f"=== {dungeon} === [Difficulty: {diff}]")
    print(f"Monster Level Range: {min_lv} - {max_lv}")
    print(f"{'='*60}")
    for mo in mons:
        atk_str = f"{mo['atk'][0]}-{mo['atk'][1]}" if len(mo['atk']) >= 2 else str(mo['atk'])
        boss_tag = " [BOSS]" if mo['cls'] == 'Boss' else " [MINI-BOSS]" if mo['cls'] == 'Guardian' else ""
        print(f"  {mo['name']}{boss_tag}")
        print(f"    Lv.{mo['level']} | HP: {mo['hp']:,} | ATK: {atk_str}")
        print(f"    Base EXP: {mo['baseExp']:,} | Job EXP: {mo['jobExp']:,}")
        print(f"    {mo['race']} / {mo['element']} / {mo['size']}")
        print(f"    Top Drops: {', '.join(mo['notable_drops'])}")
        print(f"    Card: {mo['card']}")
        print()
