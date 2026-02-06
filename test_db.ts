import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: "postgresql://admin:password123@localhost:5432/swarm_leads"
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
