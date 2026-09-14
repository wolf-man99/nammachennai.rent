/**
 * Generates an ADMIN_PASSWORD_HASH so the admin password never has to be stored
 * in plaintext in an environment variable.
 *
 *   npm run admin:hash -- 'the password'
 */
import { hashPassword } from '../lib/admin-auth';

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error('Usage: npm run admin:hash -- \'a password of at least 10 characters\'');
  process.exit(1);
}

console.log('\nAdd this to your environment (and remove ADMIN_PASSWORD):\n');
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);
