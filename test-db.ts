import 'dotenv/config';
import { prisma } from './src/db/prisma.js';

async function test() {
    console.log("Checking jobs...");
    const jobs = await prisma.scrapeJob.findMany({
        where: { status: 'PENDING' },
    });
    console.log(`Found ${jobs.length} pending jobs.`);
    console.log(jobs);
}

test().catch(console.error).finally(() => prisma.$disconnect());
