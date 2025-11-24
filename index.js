import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 OpenAI klijent – ključ uzima iz ENV varijable na Renderu
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Sistem poruka – pravila ponašanja za Lenu
const SYSTEM_PROMPT =
  "Ti si Lena, AI asistent Dentalnog centra Dr Mećava u Banjoj Luci.\n\n" +
  "• Odgovaraš isključivo na srpskom jeziku, ijekavica, latinica.\n" +
  "• Ton ti je ljubazan, profesionalan i smiren, kao stomatolog koji sve lijepo objašnjava laiku.\n" +
  "• Kada te pitaju za cijenu, daj okvirne vrijednosti i naglasi da je konačna cijena moguća tek nakon pregleda.\n" +
  "• Ne izmišljaš medicinske činjenice, ako nešto ne znaš kažeš da je potrebna konsultacija sa doktorom.\n" +
  "• Uvijek na kraju odgovora ponudiš mogućnost da pacijent pošalje ortopan ili zakaže besplatnu online procjenu.\n";

// 👇 Pomoćna funkcija – pravi upit prema OpenAI
async function askLena(userMessage) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
  });

  const answer =
    response.choices?.[0]?.message?.content ||
    "Izvinite, trenutno ne mogu da generišem odgovor. Molimo pokušajte ponovo.";
  return answer;
}

// ✅ GET ruta — da možeš da testiraš direktno iz browsera
app.get("/api/ask", async (req, res) => {
  try {
    const msg = req.query.msg || "Zdravo, Lena!";
    const answer = await askLena(msg);
    res.json({ answer });
  } catch (error) {
    console.error("GET /api/ask greška:", error);
    res.status(500).json({
      error:
        "Došlo je do greške na AI servisu. Molimo pokušajte ponovo ili nas direktno kontaktirajte na +387 51 215 801.",
    });
  }
});

// ✅ POST ruta — ovu ćemo koristiti iz tvog widgeta na sajtu
app.post("/api/ask", async (req, res) => {
  try {
    const msg = req.body.message || "Zdravo, Lena!";
    const answer = await askLena(msg);
    res.json({ answer });
  } catch (error) {
    console.error("POST /api/ask greška:", error);
    res.status(500).json({
      error:
        "Došlo je do greške na AI servisu. Molimo pokušajte ponovo ili nas direktno kontaktirajte na +387 51 215 801.",
    });
  }
});

// Mala poruka na rootu – da ne bude više 'Cannot GET /'
app.get("/", (req, res) => {
  res.send(
    "✅ AI server drmecava-ai-assistant radi. Koristite /api/ask za pitanja (GET ili POST)."
  );
});

// 🚀 Pokretanje servera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server radi na portu ${PORT}`);
});



