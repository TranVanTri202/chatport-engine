const { PrismaClient } = require('@prisma/client');
const { Zalo } = require('zca-js');
const repl = require('repl');

async function main() {
  const prisma = new PrismaClient();
  const botId = parseInt(process.argv[2] || '1', 10);

  console.log(`[ZCA Test] Fetching session for botId=${botId} from DB...`);
  const session = await prisma.botSession.findFirst({
    where: { botId }
  });

  if (!session) {
    console.error(`[ZCA Test] Error: No BotSession found for botId=${botId}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const { cookie, imei, userAgent } = session.payload;
  console.log(`[ZCA Test] Initializing Zalo instance...`);
  const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: true });

  console.log(`[ZCA Test] Logging in to Zalo API...`);
  const api = await zalo.login({ cookie, imei, userAgent });
  console.log(`[ZCA Test] Login successful!`);

  console.log(`\n=============================================================`);
  console.log(`Zalo API instance is logged in and ready!`);
  console.log(`You can run any API command interactively via the 'api' object.`);
  console.log(`Examples:`);
  console.log(`  await api.lastOnline("7016120329778007446")`);
  console.log(`  await api.getGroupInfo("group_id")`);
  console.log(`  await api.getAllFriends()`);
  console.log(`=============================================================\n`);

  // Start interactive Node REPL
  const replServer = repl.start({
    prompt: 'zca-js > ',
    useGlobal: true
  });

  // Add api, zalo, and prisma to REPL context
  replServer.context.api = api;
  replServer.context.zalo = zalo;
  replServer.context.prisma = prisma;

  replServer.on('exit', async () => {
    await prisma.$disconnect();
    console.log('Exiting ZCA test session.');
    process.exit(0);
  });
}

main().catch(async (err) => {
  console.error('[ZCA Test] Fatal error:', err);
  process.exit(1);
});

//docker exec -it askbase-app node test-zca.js
//docker exec askbase-app pnpm prisma db push
// docker exec askbase-app pnpm prisma generate