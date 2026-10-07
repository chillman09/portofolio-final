export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/hire' && request.method === 'POST') {
      return handleHire(request, env);
    }

    // everything else: serve the static site
    return env.ASSETS.fetch(request);
  }
};

async function handleHire(request, env) {
  const cors = { 'Content-Type': 'application/json' };

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: cors });
  }

  const { projectType, contact, details, hp } = data;

  // honeypot: bots tend to fill every field, humans never see this one
  if (hp) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }

  if (!contact || !details || contact.length > 200 || details.length > 1500) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400, headers: cors });
  }

  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 500, headers: cors });
  }

  const payload = {
    embeds: [{
      title: 'New Commission Inquiry',
      color: 0xC81E2C,
      fields: [
        { name: 'Project Type', value: (projectType || 'Not specified').slice(0, 200) },
        { name: 'Contact', value: contact.slice(0, 200) },
        { name: 'Details', value: details.slice(0, 1000) }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Discord rejected the message' }), { status: 502, headers: cors });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach Discord' }), { status: 502, headers: cors });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}
