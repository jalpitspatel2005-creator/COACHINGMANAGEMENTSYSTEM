const bcrypt = require('bcryptjs');

async function generateHash() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);
  console.log('Admin password hash:', hash);
  console.log('\nCopy this hash to your .env file as ADMIN_PASSWORD_HASH');
}

generateHash();