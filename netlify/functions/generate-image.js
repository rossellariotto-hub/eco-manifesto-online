exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Metodo non consentito. Usa POST." })
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Variabile GEMINI_API_KEY non configurata in Netlify."
        })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = body.prompt;
    const format = body.format || "orizzontale";

    if (!prompt || typeof prompt !== "string") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Prompt mancante o non valido." })
      };
    }

    const aspectRatio = format === "verticale" ? "3:4" : "16:9";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "Errore restituito da Gemini/Imagen.",
          details: data
        })
      };
    }

    const prediction = data.predictions && data.predictions[0];

    if (!prediction || !prediction.bytesBase64Encoded) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Imagen non ha restituito un'immagine valida.",
          details: data
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        imageUrl: `data:image/png;base64,${prediction.bytesBase64Encoded}`
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Errore interno della funzione Netlify."
      })
    };
  }
};
