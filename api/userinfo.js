import fetch from "node-fetch";

let sessions = {}; // Must match callback.js session object (or use DB)

export default async function handler(req, res) {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
    const session = searchParams.get("session");

    if (!session || !sessions[session]) return res.status(400).json({ error: "Invalid session" });

    try {
        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${sessions[session].access_token}` }
        });
        const userData = await userResponse.json();
        res.json(userData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user info." });
    }
}
