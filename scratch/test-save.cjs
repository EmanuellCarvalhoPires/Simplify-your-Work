const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join('C:', 'Users', 'Trabalho', 'AppData', 'Roaming', 'simplify-your-work', 'data', 'simplify_work.db');
const db = new Database(dbPath);

console.log('--- TEST SAVING REMINDER ---');
const id = 'rem_test_123';
const now = new Date().toISOString();

const stmt = db.prepare(`
  INSERT INTO reminders (id, title, message, recurrence, intervalMinutes, scheduledTime, enabled, lastTriggered, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title,
    message=excluded.message,
    recurrence=excluded.recurrence,
    intervalMinutes=excluded.intervalMinutes,
    scheduledTime=excluded.scheduledTime,
    enabled=excluded.enabled,
    lastTriggered=CASE WHEN excluded.lastTriggered IS NOT NULL AND excluded.lastTriggered != '' THEN excluded.lastTriggered ELSE reminders.lastTriggered END
`);

stmt.run(id, 'Beber Água Teste', 'Mensagem de teste', 'INTERVAL', 45, '', 1, now, now);

console.log('After insert, Query all:', db.prepare('SELECT * FROM reminders').all());
