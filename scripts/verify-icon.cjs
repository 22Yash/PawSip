const fs = require('fs');
const path = require('path');

const icoPath = path.join(__dirname, '../build/icon.ico');
const buf = fs.readFileSync(icoPath);

console.log('File size:', buf.length);
const reserved = buf.readUInt16LE(0);
const type = buf.readUInt16LE(2);
const count = buf.readUInt16LE(4);

console.log(`Reserved: ${reserved}, Type: ${type} (1=ICO), Count: ${count}`);

for (let i = 0; i < count; i++) {
  const offset = 6 + i * 16;
  const width = buf.readUInt8(offset) || 256;
  const height = buf.readUInt8(offset + 1) || 256;
  const planes = buf.readUInt16LE(offset + 4);
  const bitCount = buf.readUInt16LE(offset + 6);
  const bytesInRes = buf.readUInt32LE(offset + 8);
  const imgOffset = buf.readUInt32LE(offset + 12);
  const magic = buf.slice(imgOffset, imgOffset + 4).toString('hex');
  const isPng = magic === '89504e47';
  console.log(`Entry ${i}: ${width}x${height}, bpp: ${bitCount}, bytes: ${bytesInRes}, offset: ${imgOffset}, format: ${isPng ? 'PNG' : 'BMP/DIB'}`);
}
