const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export async function onRequestGet({ request, env, params }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Sound sharing is not configured.", { status: 503 });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) {
    return new Response("Sound not found.", { status: 404 });
  }

  const getRow = async (table, select, filters) => {
    const query = new URLSearchParams({ select, limit: "1", ...filters });
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: env.SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Unable to load ${table}: ${response.status}`);
    return (await response.json())[0];
  };

  try {
    const file = await getRow("sound_files", "id,system_id,sound_id,station_id,title,description", { id: `eq.${params.id}` });
    if (!file) return new Response("Sound not found.", { status: 404 });
    const [system, sound, station] = await Promise.all([
      getRow("systems", "name,country_id,logo_url", { id: `eq.${file.system_id}` }),
      getRow("sounds", "title,description", { system_id: `eq.${file.system_id}`, id: `eq.${file.sound_id}` }),
      file.station_id ? getRow("stations", "name", { system_id: `eq.${file.system_id}`, id: `eq.${file.station_id}` }) : null,
    ]);
    if (!system || !sound) return new Response("Sound not found.", { status: 404 });

    const origin = new URL(request.url).origin;
    const title = [station?.name, sound.title, file.title].filter(Boolean).join(" · ");
    const description = [system.name, file.description || sound.description].filter(Boolean).join(" — ");
    const destination = `${origin}/#/${encodeURIComponent(system.country_id)}/${encodeURIComponent(file.system_id)}?sound=${encodeURIComponent(file.id)}`;
    const image = system.logo_url
      ? `${env.SUPABASE_URL}/storage/v1/object/public/images/${system.logo_url.split("/").map(encodeURIComponent).join("/")}`
      : null;
    const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | Rail Sound Atlas</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rail Sound Atlas">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(`${origin}/sound/${file.id}`)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ""}
<meta name="twitter:card" content="summary">
</head><body>
<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>
<a id="sound-link" href="${escapeHtml(destination)}">Open sound in Rail Sound Atlas</a>
<script>location.replace(document.getElementById("sound-link").href);</script>
</body></html>`;
    return new Response(html, { headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("Sound sharing:", error.message);
    return new Response("Unable to load this sound. Please try again shortly.", { status: 502 });
  }
}
