import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function testConnection() {
    try {
        console.log("🔌 Connecting to DB...");
        await client.connect();
        console.log("✅ Connected successfully!");

        const res = await client.query('SELECT NOW()');
        console.log("🕒 DB Time:", res.rows[0]);

        await client.end();
    } catch (err) {
        console.error("❌ Connection failed:", err);
    }
}

testConnection();
