import { resetStalledJobs } from './src/db/queue.js';
import { prisma } from './src/db/company.js';

async function main() {
    try {
        const count = await resetStalledJobs(0); // Reset all processing jobs
        console.log(`Reset ${count} stalled jobs.`);
        const pendingCount = await prisma.company.count({ where: { status: 'PENDING' } });
        console.log(`Pending jobs for worker: ${pendingCount}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
