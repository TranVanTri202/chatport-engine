const { PrismaClient } = require('@prisma/client');
const { Zalo } = require('zca-js');

async function main() {
  const prisma = new PrismaClient();
  const botId = parseInt(process.argv[2] || '1', 10);
  
  console.log(`[ZCA Listener] Fetching session for botId=${botId} from DB...`);
  const session = await prisma.botSession.findFirst({
    where: { botId }
  });
  
  if (!session) {
    console.error(`[ZCA Listener] Error: No BotSession found for botId=${botId}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  const { cookie, imei, userAgent } = session.payload;
  console.log(`[ZCA Listener] Initializing Zalo instance...`);
  const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: true });
  
  console.log(`[ZCA Listener] Logging in to Zalo API...`);
  const api = await zalo.login({ cookie, imei, userAgent });
  console.log(`[ZCA Listener] Login successful!`);
  
  console.log(`[ZCA Listener] Registering event listeners...`);
  if (api.listener && typeof api.listener.on === 'function') {
    api.listener.on('message', (message) => {
      console.log('\n[ZCA Event] MESSAGE received:');
      console.log(JSON.stringify(message, null, 2));
    });
    api.listener.on('group_event', (event) => {
      console.log('\n[ZCA Event] GROUP_EVENT received:');
      console.log(JSON.stringify(event, null, 2));
    });
    api.listener.on('friend_event', (event) => {
      console.log('\n[ZCA Event] FRIEND_EVENT received:');
      console.log(JSON.stringify(event, null, 2));
    });
    api.listener.on('reaction', (reaction) => {
      console.log('\n[ZCA Event] REACTION received:');
      console.log(JSON.stringify(reaction, null, 2));
    });
    api.listener.on('undo', (event) => {
      console.log('\n[ZCA Event] UNDO received:');
      console.log(JSON.stringify(event, null, 2));
    });
    api.listener.on('closed', (code) => {
      console.log(`\n[ZCA Event] Listener CLOSED with code: ${code}`);
    });
    if (typeof api.listener.start === 'function') {
      api.listener.start();
      console.log(`[ZCA Listener] Event listener started!`);
    }
    console.log(`[ZCA Listener] Event listeners registered! Monitoring events...`);
  } else {
    console.warn(`[ZCA Listener] Warning: api.listener is not available or doesn't support 'on'`);
  }

  // Keep process running indefinitely
  process.on('SIGINT', async () => {
    console.log('\nStopping ZCA event listener...');
    await prisma.$disconnect();
    process.exit(0);
  });

  console.log('[ZCA Listener] Event loop is kept active. Listening...');
  setInterval(() => {}, 60000);
}

main().catch(async (err) => {
  console.error('[ZCA Listener] Fatal error:', err);
  process.exit(1);
});

// Run with: docker exec -it askbase-app node listen-zca.js
