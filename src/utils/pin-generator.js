const crypto = require('crypto');

const PINGenerator = () => {
  const buffer = crypto.randomBytes(4);
  const randomNumber = buffer.readUInt32BE(0) % 10000;
  return randomNumber.toString().padStart(4, '0');
};

module.exports = PINGenerator;
