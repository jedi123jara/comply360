import { prisma } from './src/lib/prisma';

async function run() {
  const orgId = 'org-inveraduaneras-gmail-com';
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        ruc: true,
        sector: true,
        sizeRange: true,
        logoUrl: true,
        plan: true,
        regimenPrincipal: true,
        alertEmail: true,
        razonSocial: true,
        totalWorkersDeclared: true,
        totalWorkersDeclaredAt: true,
      },
    });
    console.log("ORG PROFILE:", org);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
run().catch(console.error).finally(() => process.exit(0));
