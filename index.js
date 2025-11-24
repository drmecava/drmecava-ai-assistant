import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 API ključ ide iz okoline (ENV varijabla na Render-u)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 PRAVILA PONAŠANJA – LENA
const SYSTEM_PROMPT =
  "Ti si Lena, AI asistent Dentalnog centra Dr Mećava u Banjoj Luci.\n\n" +
  "• Odgovaraš isključivo na srpskom jeziku, ijekavica, latinica.\n" +
  "• Ton ti je ljubazan, profesionalan i smiren, kao stomatolog koji sve lijepo objašnjava laiku.\n" +
  "• Ne koristiš hrvatske izraze tipa 'točne cijene' – već 'tačne cijene', 'kod nas', 'pacijent', 'pregled'.\n\n" +
  "• Kada te pacijent pita za cijenu implantata (cijena implantata, koliko košta implantat, koliko je implantat kod vas i slično), objasni sljedeće:\n" +
  "  - U ordinaciji se koriste provjereni MIS implantati.\n" +
  "  - Cijena kompletnog implantološkog rada (implantat + suprastruktura + krunica) iznosi oko 1250 € po zubu.\n" +
  "  - To je otprilike 60–70% povoljnije nego iste usluge u Sloveniji ili Austriji.\n" +
  "  - Naglasi da konačna cijena uvijek zavisi od pregleda, kvaliteta kosti i eventualnih dodatnih procedura (npr. nadogradnje kosti, sinus lift i sl.).\n" +
  "  - Na kraju ih podstakni da pošalju ortopan ili zakažu besplatnu online procjenu preko sajta.\n\n" +
  "• Za druge stomatološke teme (implantologija, protetika, ortodoncija, oralna hirurgija) odgovaraj stručno ali jednostavno, bez previše stručnih termina.\n" +
  "• Ako nisi sigurna u tačnu cijenu nekog drugog zahvata, nemoj izmišljati broj – reci da cijena zavisi od pregleda i da nas mogu kontaktirati za tačan predračun.\n" +
  "• Uvijek naglasi da AI savjet NE zamjenjuje pregled uživo kod stomatologa.";

// 🔁 GLAVNA RUTA NA KOJU SE JAVlja WIDGET
app.post("/ask", async (req, res) => {
  try {
    const body = req.body || {};
    const question = (body.message || body.question || "").trim();
    const hasImage = !!body.image;

    let userContent = question;

    if (hasImage) {
      // Za sada sliku samo tretiramo kao napomenu, ne analiziramo je direktno
      userContent =
        (question || "Pacijent je poslao samo sliku/ortopan bez teksta.") +
        "\n\n(Napomena: pacijent je poslao sliku ili ortopan – koristi je samo kao dodatni kontekst, ali ne postavljaj dijagnozu na osnovu slike.)";
    }

    if (!userContent) {
      return res.json({
        answer:
          "Molim vas da ukratko opišete problem ili pitanje (npr. 'Boli me zub gore lijevo' ili 'Koliko košta implantat?')."
      });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent }
      ],
      temperature: 0.5
    });

    const answer =
      response.choices?.[0]?.message?.content ||
      "Izvinite, trenutno ne mogu da generišem odgovor. Molimo pokušajte ponovo.";

    res.json({ answer });
  } catch (error) {
    console.error("OpenAI / server error:", error);

    let msg =
      "Došlo je do greške na AI servisu. Molimo pokušajte ponovo ili nas direktno kontaktirajte na +387 51 215 801.";

    // Ako istekne kredit ili neki drugi API problem
    if (
      error &&
      error.error &&
      typeof error.error.message === "string" &&
      error.error.message.toLowerCase().includes("insufficient_quota")
    ) {
      msg =
        "AI asistent je trenutno privremeno nedostupan zbog ograničenja na API servisu. " +
        "Molimo pokušajte kasnije ili nas direktno kontaktirajte na +387 51 215 801.";
    }

    res.status(500).json({ answer: msg });
  }
});

// 🚀 POKRETANJE SERVERA – Render koristi svoj PORT iz okoline
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("AI asistent radi na portu " + PORT);
});
