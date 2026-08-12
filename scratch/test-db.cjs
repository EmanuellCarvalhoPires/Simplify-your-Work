const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join('C:', 'Users', 'Trabalho', 'AppData', 'Roaming', 'simplify-your-work', 'data', 'simplify_work.db');
console.log('DB Path:', dbPath);

try {
  const db = new Database(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in DB:', tables);

  const reminders = db.prepare('SELECT * FROM reminders').all();
  console.log('Reminders in DB:', reminders);

  const tickets = db.prepare('SELECT * FROM tickets').all();
  console.log('Tickets in DB:', tickets);
} catch (err) {
  console.error('Error opening DB:', err);
}
