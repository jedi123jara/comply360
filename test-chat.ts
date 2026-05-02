import { prisma } from './src/lib/prisma';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const orgId = 'org-inveraduaneras-gmail-com';
  
  try {
    const { generateChatResponse, detectProvider, getModelName } = require('./src/lib/ai/chat-engine');
    const { checkAiBudget } = require('./src/lib/ai/usage');
    
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { razonSocial: true, sector: true, sizeRange: true, regimenPrincipal: true, plan: true },
    });
    const totalWorkers = await prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } });
    const openAlerts = await prisma.workerAlert.count({ where: { orgId, resolvedAt: null } });

    console.log("Checking budget...", org?.plan);
    const budgetCheck = await checkAiBudget({ orgId, plan: org?.plan ?? 'FREE' });
    console.log("Budget check:", budgetCheck);

    const orgContext = {
      razonSocial: org?.razonSocial || undefined,
      sector: org?.sector || undefined,
      sizeRange: org?.sizeRange || undefined,
      regimenPrincipal: org?.regimenPrincipal || undefined,
      totalWorkers,
      complianceScore: 100,
      openAlerts,
    };

    console.log("Generating chat response...");
    const result = await generateChatResponse(
      [{ role: 'user', content: 'como se calcula el cts' }],
      orgContext,
      { orgId, userId: 'test', feature: 'chat' }
    );
    console.log("Result:", result);

  } catch (error) {
    console.error("ERROR GENERATING:", error);
  }
}
run().catch(console.error).finally(() => process.exit(0));
