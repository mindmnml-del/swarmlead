import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: "postgresql://admin:password123@localhost:5432/swarm_leads"
});

async function verifyData() {
    try {
        await client.connect();

        console.log("🔍 Checking Database...");
        const res = await client.query('SELECT * FROM "Lead" ORDER BY id DESC LIMIT 5');

        console.table(res.rows); // Prints data in a nice table

        if (res.rows.length > 0) {
            console.log(`✅ Success! Found ${res.rows.length} leads in the database.`);
        } else {
            console.log("⚠️ Database is empty.");
        }

        await client.end();
    } catch (err) {
        console.error("❌ Error querying DB:", err);
    }
}

verifyData();
