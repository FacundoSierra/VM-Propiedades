/**
 * Lectura/escritura del archivo de inmuebles (`src/data/properties.json`)
 * directamente en el repositorio de GitHub mediante la API REST, usando
 * un token de acceso personal (variable de entorno GITHUB_TOKEN).
 *
 * Cada escritura crea un commit en `main`, lo que dispara un despliegue
 * normal en Vercel (la web pública tarda 1-2 minutos en reflejar el
 * cambio; este panel siempre lee el estado real más reciente).
 */

const OWNER = "FacundoSierra";
const REPO = "VM-Propiedades";
const BRANCH = "main";
const FILE_PATH = "src/data/properties.json";

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN no configurada en las variables de entorno.",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function readPropertiesFile(): Promise<{
  data: unknown;
  sha: string;
}> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(
      `No se pudo leer el archivo de inmuebles en GitHub (${res.status}).`,
    );
  }
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { data: JSON.parse(content), sha: json.sha };
}

export async function writePropertiesFile(
  data: unknown,
  sha: string,
  message: string,
) {
  const content = Buffer.from(
    JSON.stringify(data, null, 2) + "\n",
    "utf-8",
  ).toString("base64");

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, content, sha, branch: BRANCH }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`No se pudo guardar en GitHub (${res.status}). ${body}`);
  }

  return res.json();
}
