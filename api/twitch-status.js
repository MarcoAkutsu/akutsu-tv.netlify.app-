export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const broadcasterLogin = process.env.TWITCH_BROADCASTER_LOGIN || "akutsu_tv";

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Credenciais da Twitch não configuradas." });
    }

    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });

    if (!tokenRes.ok) {
      return res.status(500).json({ error: "Falha ao obter token da Twitch." });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(broadcasterLogin)}`,
      {
        headers: {
          "Client-Id": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const userData = await userRes.json();
    const user = userData.data?.[0];

    if (!user) {
      return res.status(404).json({ error: "Canal da Twitch não encontrado." });
    }

    const broadcasterId = user.id;

    const streamRes = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(broadcasterId)}`,
      {
        headers: {
          "Client-Id": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const streamData = await streamRes.json();
    const stream = streamData.data?.[0] || null;

    const followersRes = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}`,
      {
        headers: {
          "Client-Id": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const followersData = await followersRes.json();

    return res.status(200).json({
      live: Boolean(stream),
      title: stream?.title || "",
      viewers: stream?.viewer_count || 0,
      followers: typeof followersData.total === "number" ? followersData.total : null
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao consultar a Twitch." });
  }
}
