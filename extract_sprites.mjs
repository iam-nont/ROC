/**
 * Extract character body sprites from ROC GRF → raw SPR/ACT files.
 * Handles EUC-KR encoding for file path lookup.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const { GrfNode } = require('grf-loader');
const iconv = require('iconv-lite');

const GRF_PATH = 'C:\\Program Files (x86)\\Gravity Game Tech\\RagnarokClassic\\data.grf';
const RAW_DIR = path.join(process.cwd(), 'web', 'sprites', 'raw');

const JOB_SPRITES = {
  0:    ['초보자', '남'],
  1:    ['검사', '남'],
  2:    ['마법사', '남'],
  3:    ['궁수', '남'],
  4:    ['성직자', '남'],
  5:    ['상인', '남'],
  6:    ['도둑', '남'],
  7:    ['기사', '남'],
  8:    ['프리스트', '남'],
  9:    ['위저드', '남'],
  10:   ['제철공', '남'],
  11:   ['헌터', '남'],
  12:   ['어세신', '남'],
  14:   ['크루세이더', '남'],
  15:   ['몽크', '남'],
  16:   ['세이지', '남'],
  17:   ['로그', '남'],
  18:   ['연금술사', '남'],
  19:   ['바드', '남'],
  20:   ['무희', '여'],
  23:   ['슈퍼노비스', '남'],
  24:   ['건너', '남'],
  25:   ['닌자', '남'],
  4008: ['로드나이트', '남'],
  4009: ['하이프리', '남'],
  4010: ['하이위저드', '남'],
  4011: ['화이트스미스', '남'],
  4012: ['스나이퍼', '남'],
  4013: ['어쌔신크로스', '남'],
  4015: ['팔라딘', '남'],
  4016: ['챔피온', '남'],
  4017: ['프로페서', '남'],
  4018: ['스토커', '남'],
  4019: ['크리에이터', '남'],
  4020: ['클라운', '남'],
  4021: ['집시', '여'],
  4046: ['태권소년', '남'],
  4047: ['권성', '남'],
  4049: ['소울링커', '남'],
  4211: ['kagerou', '남'],
  4212: ['oboro', '여'],
};

/** Convert Unicode path to EUC-KR binary string (Latin-1 representation). */
function toEucKrBinaryString(unicodePath) {
  const buf = iconv.encode(unicodePath, 'euc-kr');
  return buf.toString('binary'); // Each byte as Latin-1 char
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });

  console.log('Loading GRF...');
  const fd = fs.openSync(GRF_PATH, 'r');
  const grf = new GrfNode(fd);
  await grf.load();

  // Count files
  let fileCount = 0;
  grf.files.forEach(() => fileCount++);
  console.log(`GRF loaded: ${fileCount} files`);

  let success = 0;
  const failed = [];

  for (const [jobId, [krName, gender]] of Object.entries(JOB_SPRITES)) {
    const sprUnicode = `data\\sprite\\인간족\\몸통\\${gender}\\${krName}_${gender}.spr`;
    const actUnicode = `data\\sprite\\인간족\\몸통\\${gender}\\${krName}_${gender}.act`;

    const sprPath = toEucKrBinaryString(sprUnicode);
    const actPath = toEucKrBinaryString(actUnicode);

    try {
      const sprResult = await grf.getFile(sprPath);
      if (sprResult.error || !sprResult.data) {
        console.log(`  [${jobId}] SPR not found`);
        failed.push(jobId);
        continue;
      }

      const actResult = await grf.getFile(actPath);

      fs.writeFileSync(path.join(RAW_DIR, `${jobId}.spr`), sprResult.data);
      if (actResult.data) {
        fs.writeFileSync(path.join(RAW_DIR, `${jobId}.act`), actResult.data);
      }

      const sprKB = Math.round(sprResult.data.length / 1024);
      const actKB = actResult.data ? Math.round(actResult.data.length / 1024) : 0;
      console.log(`  [${jobId}] OK: SPR=${sprKB}KB ACT=${actKB}KB`);
      success++;
    } catch (e) {
      console.log(`  [${jobId}] ERROR: ${e.message}`);
      failed.push(jobId);
    }
  }

  // Extract head sprites (hairstyle 1) for male and female
  console.log('\nExtracting head sprites...');
  const heads = [
    { id: 'head_m', gender: '남', num: 1 },
    { id: 'head_f', gender: '여', num: 1 },
  ];
  for (const h of heads) {
    const sprU = `data\\sprite\\인간족\\머리통\\${h.gender}\\${h.num}_${h.gender}.spr`;
    const actU = `data\\sprite\\인간족\\머리통\\${h.gender}\\${h.num}_${h.gender}.act`;
    try {
      const sprR = await grf.getFile(toEucKrBinaryString(sprU));
      const actR = await grf.getFile(toEucKrBinaryString(actU));
      if (sprR.data) {
        fs.writeFileSync(path.join(RAW_DIR, `${h.id}.spr`), sprR.data);
        console.log(`  [${h.id}] SPR OK: ${Math.round(sprR.data.length / 1024)}KB`);
      }
      if (actR.data) {
        fs.writeFileSync(path.join(RAW_DIR, `${h.id}.act`), actR.data);
        console.log(`  [${h.id}] ACT OK: ${Math.round(actR.data.length / 1024)}KB`);
      }
    } catch (e) {
      console.log(`  [${h.id}] ERROR: ${e.message}`);
    }
  }

  fs.closeSync(fd);
  console.log(`\nExtracted: ${success}/${Object.keys(JOB_SPRITES).length}`);
  if (failed.length) console.log('Failed:', failed);
  else console.log('All sprites extracted to web/sprites/raw/');
}

main().catch(console.error);
