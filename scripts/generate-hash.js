const bcrypt = require('bcryptjs');

// Change this to your desired admin password
const adminPassword = 'YourSecureAdminPassword123!';

const hash = bcrypt.hashSync(adminPassword, 10);

console.log('\n=================================');
console.log('Admin Password Hash Generated');
console.log('=================================');
console.log(`Your password: ${adminPassword}`);
console.log(`\nAdd this to your .env file:`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log('=================================\n');