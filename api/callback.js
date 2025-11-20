import fetch from "node-fetch";
import crypto from "crypto";

let sessions = {}; // Temporary session storage (serverless functions are stateless; use DB for production)

export default async function handler(req, res) {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const error_description = searchParams.get("error_description");

    console.log("Discord callback query:", Object.fromEntries(searchParams));

    if (error) return res.status(400).send(`Discord OAuth error: ${error} - ${error_description}`);
    if (!code) return res.status(400).send("Missing ?code= from Discord");

    try {
        const data = new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.REDIRECT_URI
        });

        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            body: data,
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) return res.status(400).send(tokenData.error_description);

        const sessionId = crypto.randomBytes(32).toString("hex");
        sessions[sessionId] = { access_token: tokenData.access_token };

        res.writeHead(302, { Location: `/success.html?session=${sessionId}` });
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal OAuth error: " + err.message);
    }
}
