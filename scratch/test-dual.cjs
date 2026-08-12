const Store = require('electron-store');
const store = new Store();

console.log('Reminders backup in Store:', store.get('reminders_backup'));
console.log('Tickets backup in Store:', store.get('tickets_backup'));
