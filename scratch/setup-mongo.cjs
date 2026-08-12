const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/simplify_work';

async function setupDatabase() {
  console.log('[MongoDB Setup] Conectando a ' + MONGODB_URI + '...');

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      directConnection: true,
    });

    console.log('[MongoDB Setup] Conectado com sucesso ao MongoDB!');

    const db = mongoose.connection.db;

    // Ensure collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log('[MongoDB Setup] Coleções existentes:', collectionNames);

    if (!collectionNames.includes('tickets')) {
      await db.createCollection('tickets');
      console.log('[MongoDB Setup] Coleção "tickets" criada com sucesso!');
    }

    if (!collectionNames.includes('jira_instances')) {
      await db.createCollection('jira_instances');
      console.log('[MongoDB Setup] Coleção "jira_instances" criada com sucesso!');
    }

    if (!collectionNames.includes('reminders')) {
      await db.createCollection('reminders');
      console.log('[MongoDB Setup] Coleção "reminders" criada com sucesso!');
    }

    if (!collectionNames.includes('notes')) {
      await db.createCollection('notes');
      console.log('[MongoDB Setup] Coleção "notes" criada com sucesso!');
    }

    // Insert a sample test ticket from Jira to verify document structure
    const ticketsCol = db.collection('tickets');
    const sampleTicket = {
      id: 'jira_SAMPLE-101_init',
      key: 'SAMPLE-101',
      source: 'JIRA',
      title: 'Ticket Exemplo do Jira',
      description: 'Documento inicial criado para estrutura do MongoDB.',
      status: 'TO_DO',
      statusLabel: 'A Fazer',
      color: '#0284c7',
      labels: ['JIRA', 'INICIAL'],
      comments: [
        {
          id: 'comm_sample',
          author: 'Sistema',
          body: 'Conexão inicial estabelecida no MongoDB.',
          created: new Date().toISOString(),
        },
      ],
      priority: 'High',
      assignee: 'Eu',
      jiraInstanceId: 'default',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await ticketsCol.updateOne({ id: sampleTicket.id }, { $set: sampleTicket }, { upsert: true });

    console.log('[MongoDB Setup] Banco de Dados "simplify_work" e coleção "tickets" configurados 100%!');

    const allCollections = await db.listCollections().toArray();
    console.log('[MongoDB Setup] Lista final de coleções:', allCollections.map((c) => c.name));

    await mongoose.disconnect();
    console.log('[MongoDB Setup] Processo concluído.');
  } catch (err) {
    console.error('[MongoDB Setup Error]:', err);
  }
}

setupDatabase();
