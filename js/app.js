/*******************************************************
 * CALCULADORA CON OPENAI Y FORMATO LaTeX
 * Este script obtiene la API Key desde MockAPI,
 * y luego evalúa operaciones matemáticas usando
 * el modelo GPT de OpenAI.
 *******************************************************/

// Endpoint de MockAPI donde se almacena la API Key
const API_KEY_URL = "https://690a39491a446bb9cc21d78d.mockapi.io/apiKeyOpenAI";

// Variable global donde se guardará la API Key obtenida dinámicamente
let OPENAI_API_KEY = null;

// Referencias a los elementos del DOM (HTML)
const btnEvaluate = document.getElementById("btnEvaluate");
const btnClear = document.getElementById("btnClear");
const operationInput = document.getElementById("operationInput");
const statusMessage = document.getElementById("statusMessage");
const resultValue = document.getElementById("resultValue");
const resultLatex = document.getElementById("resultLatex");

/*******************************************************
 * FUNCIÓN PARA OBTENER LA API KEY DESDE MOCKAPI
 *******************************************************/
async function fetchApiKey() {
  try {
    // Petición GET al endpoint de MockAPI
    const response = await fetch(API_KEY_URL);
    
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    // Convertir la respuesta a JSON
    const data = await response.json();

    // Validar estructura del JSON recibido
    if (Array.isArray(data) && data.length > 0 && data[0].apiKey) {
      OPENAI_API_KEY = data[0].apiKey;
      console.log("✅ API Key obtenida correctamente:", OPENAI_API_KEY);
    } else {
      throw new Error("La respuesta no contiene un campo apiKey válido.");
    }

  } catch (error) {
    console.error("❌ Error al obtener la API Key desde MockAPI:", error);
    statusMessage.textContent = "Error al obtener la API Key desde el servidor.";
    statusMessage.classList.add("text-danger");
  }
}

/*******************************************************
 * 2️⃣ EVENTO PRINCIPAL: AL PRESIONAR "EVALUAR"
 *******************************************************/
btnEvaluate.addEventListener("click", async () => {

  // Si la API Key aún no se ha cargado, obtenerla primero
  if (!OPENAI_API_KEY) {
    await fetchApiKey();
    if (!OPENAI_API_KEY) {
      // Si aún no se obtiene, detener ejecución
      statusMessage.textContent = "No se pudo obtener la API Key.";
      statusMessage.classList.add("text-danger");
      return;
    }
  }

  // Capturar la operación escrita por el usuario
  const operation = operationInput.value.trim();

  // Validar que haya texto
  if (!operation) {
    statusMessage.textContent = "Escribe una operación primero.";
    statusMessage.classList.remove("text-muted");
    statusMessage.classList.add("text-danger");
    return;
  }

  // Mostrar estado de procesamiento
  statusMessage.textContent = "Consultando OpenAI...";
  statusMessage.classList.remove("text-danger");
  statusMessage.classList.add("text-muted");

  resultValue.innerHTML = '<span class="text-muted">Calculando…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Calculando…</span>';

  try {
    // Petición POST a la API de OpenAI con la clave dinámica
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
          Eres una calculadora matemática.
          Debes evaluar la siguiente operación de manera precisa.

          Reglas IMPORTANTES:
          - Responde ÚNICAMENTE un JSON válido.
          - El JSON debe tener exactamente estos campos:
            {
              "resultado": number,
              "latex": string
            }
          - "resultado" es el valor numérico final de la operación.
          - "latex" es una expresión en LaTeX que muestre la operación y el resultado.
          - NO uses bloques de código, NO uses \`\`\`, NO pongas la palabra json.
          - Responde solo el JSON, sin texto adicional.

          Operación: ${operation}
        `,
        temperature: 0,
      }),
    });

    // Comprobar respuesta de la API
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP:", response.status, errorText);
      throw new Error(`Error HTTP ${response.status}`);
    }

    // Procesar JSON de respuesta
    const data = await response.json();
    let rawText = data.output_text || data.output?.[0]?.content?.[0]?.text;

    if (!rawText) {
      throw new Error("No se encontró el texto de salida en la respuesta.");
    }

    rawText = rawText.trim();

    // Eliminar posibles bloques ```json
    if (rawText.startsWith("```")) {
      const firstNewline = rawText.indexOf("\n");
      if (firstNewline !== -1) rawText = rawText.slice(firstNewline + 1);
      if (rawText.endsWith("```")) rawText = rawText.slice(0, -3);
      rawText = rawText.trim();
    }

    // Convertir texto JSON a objeto JS
    const parsed = JSON.parse(rawText);
    const { resultado, latex } = parsed;

    if (resultado === undefined || typeof latex !== "string") {
      throw new Error("El JSON no contiene los campos 'resultado' y 'latex'.");
    }

    // Mostrar resultados
    resultValue.textContent = resultado;
    resultLatex.innerHTML = `$$${latex}$$`;

    // Renderizar LaTeX con MathJax si está disponible
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }

    statusMessage.textContent = "Operación evaluada correctamente ✅";
    statusMessage.classList.remove("text-danger");
    statusMessage.classList.add("text-success");

  } catch (err) {
    // Manejo de errores generales
    console.error(err);
    statusMessage.textContent = "Ocurrió un error al llamar a la API o parsear el JSON.";
    statusMessage.classList.remove("text-success", "text-muted");
    statusMessage.classList.add("text-danger");
    resultValue.innerHTML = '<span class="text-muted">Sin resultado por error…</span>';
    resultLatex.innerHTML = '<span class="text-muted">Sin resultado por error…</span>';
  }
});

/*******************************************************
 * 3️⃣ EVENTO: BOTÓN "LIMPIAR"
 *******************************************************/
btnClear.addEventListener("click", () => {
  operationInput.value = "";
  statusMessage.textContent = "";
  resultValue.innerHTML = '<span class="text-muted">Sin resultado aún…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Sin resultado aún…</span>';
});
