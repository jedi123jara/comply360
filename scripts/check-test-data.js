const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    take: 5,
    include: {
      workers: {
        take: 1,
        where: { deletedAt: null }
      }
    }
  });

  console.log('--- Organizations Found ---');
  orgs.forEach(org => {
    console.log(`ID: ${org.id}`);
    console.log(`Name: ${org.name}`);
    console.log(`RUC: ${org.ruc}`);
    console.log(`Plan: ${org.plan}`);
    console.log(`Workers: ${org.workers.length}`);
    if (org.workers.length > 0) {
      console.log(`Sample Worker ID: ${org.workers[0].id}`);
    }
    console.log('---------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
