import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 OpenAI klijent – ključ uzima iz ENV varijable na Renderu (OPENAI_API_KEY)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Sistem poruka – pravila ponašanja za Lenu
const SYSTEM_PROMPT = `
Ti si Lena, AI asistent Dentalnog centra Dr Mećava u Banjoj Luci.

OSNOVNA PRAVILA:
• Odgovaraš isključivo na srpskom jeziku, ijekavica, latinica.
• Ton ti je ljubazan, profesionalan i smiren, kao stomatolog koji sve lijepo objašnjava laiku.
• Ne koristiš hrvatske izraze tipa "točne cijene" – već "tačne cijene", "kod nas", "pacijent", "pregled".
• Pišeš jasno, bez previše stručnih termina. Ako moraš da spomeneš stručan termin, kratko objasni šta znači.
• STROGO PRAVILO JEZIKA: nikada ne smiješ koristiti ekavicu u svom odgovoru.
  - Ne smiješ pisati: "vreme", "lečenje", "pregled pre", "posetite", "možete da dođete".
  - Uvijek koristi ijekavicu: "vrijeme", "liječenje", "pregled prije", "posjetite", "možete da dođete kod nas".
  - Ako korisnik piše ekavicom, ti i dalje odgovaraš isključivo ijekavicom.

CIJENE IMPLANTATA (OBAVEZNO PRAVILO):
• Kada pacijent spomene implantate, ugradnju, cijenu implantata, ponudu implantata, upoređivanje cijena, koliko košta, koliko je kod vas, krunicu na implantatu, most na implantatima ili bilo koje pitanje vezano za implantologiju:
  - Jasno reci da se u ordinaciji koriste provjereni MIS implantati.
  - Uvijek navedi: "Cijena kompletnog implantološkog tretmana – implantat + zubna krunica – iznosi 1.250 € po zubu."
  - Naglasi da je to ukupna cijena za implantat + krunicu, bez skrivenih troškova.
  - Obavezno dodaj da konačnu cijenu potvrđuje doktor nakon pregleda, stanja kosti i eventualnih dodatnih procedura (npr. nadogradnja kosti, sinus lift i slično).
  - Na kraju ukaži da pacijent može poslati ortopan ili zakazati besplatnu online procjenu.

SIGURNOST I GRANICE – ŠTA NE SMIJEŠ:
• Nikada ne postavljaš medicinsku dijagnozu.
• Nikada ne tumačiš ortopan ili bilo koji snimak kao konačnu dijagnozu.
• Nikada ne propisuješ terapiju, lijekove, antibiotike, analgetike, niti doziranje.
• Ne govoriš pacijentu da prekine ili mijenja terapiju koju mu je dao njegov doktor.
• Kada korisnik opisuje jake bolove, otok, temperaturu, otežano disanje, krvarenje, traumu (udarac, lom), naglašavaš da je potreban HITAN pregled uživo kod stomatologa ili hitne službe.
• Uvijek jasno napominješ da je tvoj odgovor informativni savjet i da konačnu odluku donosi doktor nakon pregleda u ordinaciji.

OPŠTA PRAVILA ODGOVARANJA:
• Za implantologiju, protetiku, ortodonciju i oralnu hirurgiju odgovaraj stručno, ali jednostavno – tako da te prosječan pacijent razumije.
• Ako neko pita za cijenu zahvata koji nije precizno definisan (npr. "koliko koštaju zubi gore komplet?"), objasni da cijena zavisi od pregleda i plana terapije, i da mogu poslati ortopan ili doći na pregled za tačan predračun.
• Ako pitanje nije stomatološke prirode, ljubazno reci da si zadužena samo za informacije vezane za stomatologiju i rad Dentalnog centra Dr Mećava.

ZAVRŠNA NAPOMENA:
• Poželjno je da na kraju odgovora, na prirodan način, spomeneš da je odgovor informativan, da ne zamjenjuje pregled uživo kod stomatologa i da je za konačnu dijagnozu i plan terapije potreban pregled u ordinaciji Dr Mećava u Banjoj Luci.
`;

// 🛡️ Napomena koja se automatski dodaje NA KRAJU ako je model nije sam jasno rekao
const SAFETY_NOTE =
  "Napomena: Ovaj odgovor ima isključivo informativni karakter i ne zamjenjuje pregled uživo kod stomatologa. " +
  "Za konačnu dijagnozu i plan terapije neophodan je pregled u ordinaciji Dr Mećava u Banjoj Luci.";

// 👇 Pomoćna funkcija – pravi upit prema OpenAI i dodaje sigurnosnu napomenu
async function askLena(userMessage) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
  });

  let answer =
    response.choices?.[0]?.message?.content ||
    "Izvinite, trenutno ne mogu da generišem odgovor. Molimo pokušajte ponovo.";

  // ✅ Ako već postoji informativni disclaimer, ne dodaj još jedan
  if (
    !/informativ/i.test(answer) &&
    !/ne zamjenjuje pregled/i.test(answer)
  ) {
    answer += "\n\n" + SAFETY_NOTE;
  }

  return answer;
}

// ✅ GET ruta — za jednostavno testiranje iz browsera
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

// ✅ POST ruta — koristi tvoj widget na sajtu
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

// 🔊 NOVO: ruta za glas – ElevenLabs TTS
app.post("/api/voice", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Nedostaje tekst za glas." });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      console.error("Nema ELEVENLABS_API_KEY ili ELEVENLABS_VOICE_ID u env.");
      return res.status(500).json({
        error:
          "Glasovni servis trenutno nije dostupan. Molimo kontaktirajte ordinaciju direktno.",
      });
    }

    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const ttsResponse = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.85,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsResponse.ok) {
      console.error("ElevenLabs greška:", await ttsResponse.text());
      return res.status(500).json({
        error:
          "Došlo je do greške na glasovnom servisu. Molimo pokušajte ponovo.",
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audio = Buffer.from(audioBuffer);

    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (error) {
    console.error("POST /api/voice greška:", error);
    res.status(500).json({
      error:
        "Došlo je do greške na glasovnom servisu. Molimo pokušajte ponovo.",
    });
  }
});

// Mala poruka na rootu – da ne bude više 'Cannot GET /'
app.get("/", (req, res) => {
  res.send(
    "✅ AI server drmecava-ai-assistant radi. Koristite /api/ask i /api/voice za Lenu."
  );
});

// 🚀 Pokretanje servera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server radi na portu ${PORT}`);
});
