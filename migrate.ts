// Migration script to move legacy users to Supabase
// This script is no longer needed since legacyUserMap has been removed
// Users will need to register manually using /start command

import { saveUserMapping } from './utils/supabase';

async function migrateUsers() {
  console.log('❌ Migration script is no longer available.');
  console.log('The legacy user map has been removed.');
  console.log('Users should register manually using the /start command in the bot.');
  console.log('');
  console.log('If you have a list of users to migrate, you can modify this script');
  console.log('to include your user data and run the migration.');
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsers().catch(console.error);
}

export { migrateUsers };
