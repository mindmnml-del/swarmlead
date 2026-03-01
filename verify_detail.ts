import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function verifyData() {
    try {
        await client.connect();

        console.log("🔍 Checking Latest Lead...");
        // Get the very last inserted lead
        const res = await client.query('SELECT * FROM "Lead" ORDER BY id DESC LIMIT 1');

        if (res.rows.length > 0) {
            const lead = res.rows[0];
            console.log("✅ Latest Lead Details:");
            console.log(JSON.stringify(lead, null, 2));

            if (lead.phone || lead.website || lead.address) {
                console.log("🎉 SUCCESS: Data extracted!");
            } else {
                console.log("⚠️ WARNING: Fields are still empty.");
            }
        } else {
            console.log("⚠️ Database is empty.");
        }

        await client.end();
    } catch (err) {
        console.error("❌ Error querying DB:", err);
    }
}

verifyData();
