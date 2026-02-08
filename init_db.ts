import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function initDB() {
    try {
        console.log("🔌 Connecting to DB...");
        await client.connect();

        console.log("🛠️ Creating 'Lead' table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS "Lead" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT,
        "email" TEXT,
        "website" TEXT,
        "address" TEXT,
        "source" TEXT DEFAULT 'google_maps',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log("✅ Table 'Lead' created successfully!");
        await client.end();
    } catch (err) {
        console.error("❌ Migration failed:", err);
    }
}

initDB();
