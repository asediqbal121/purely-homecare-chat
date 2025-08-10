# Purely Homecare Chat (Vercel)

This is the tiny backend that powers the chat widget on your Carrd site.

## 1) Upload to GitHub
- Create a new repo called `purely-homecare-chat`.
- Upload the entire folder contents (including the `api` folder).

## 2) Connect on Vercel
- In Vercel, click **Add New → Project**.
- Import the `purely-homecare-chat` repo.
- Framework: **Other** (default is fine).
- Add Environment Variable: `OPENAI_API_KEY` = your OpenAI key.
- Deploy.

## 3) Test
- Open `https://YOUR-APP.vercel.app/api/health` — should return `{ ok: true }`.

## 4) Use in Carrd
- Open `carrd-embed.html` and copy everything into **Embed → Code** (Before Body End).
- Replace `YOUR-APP` in the snippet with your Vercel app domain.
