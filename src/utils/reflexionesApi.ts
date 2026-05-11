const SHEET_URL = import.meta.env.PUBLIC_SHEET_URL;

if (!SHEET_URL) {
  throw new Error("Falta configurar PUBLIC_SHEET_URL en variables de entorno");
}

export interface Reflexion {
  day: string;
  title: string;
  description: string;
  url: string;
  published: string;
}

export interface DiaMes {
  day: number;
  title: string;
  description: string;
  url: string;
  published: boolean;
  disponible: boolean;
}

export function getTotalDiasDelMes(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export function getCurrentDay(): number {
  return new Date().getDate();
}

export async function getDiasDelMes(): Promise<DiaMes[]> {
  const allReflexiones = await getReflexiones();
  const currentDay = getCurrentDay();
  const totalDias = getTotalDiasDelMes();
  
  const dias: DiaMes[] = [];
  
  for (let i = 1; i <= totalDias; i++) {
    const reflexion = allReflexiones.find(r => Number(r.day) === i);
    const published = reflexion?.published === "TRUE";
    const diaHaLlegado = i <= currentDay;
    const disponible = published && diaHaLlegado;
    
    dias.push({
      day: i,
      title: reflexion?.title || `Día ${i}`,
      description: reflexion?.description || "",
      url: reflexion?.url || "",
      published: published,
      disponible: disponible
    });
  }
  
  return dias;
}

export async function getReflexiones(): Promise<Reflexion[]> {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("Error fetching data");
    const data = await response.json();
    return data as Reflexion[];
  } catch (error) {
    console.error("Error fetching reflexiones:", error);
    return [];
  }
}

export async function getReflexionesDelMes(): Promise<Reflexion[]> {
  const allReflexiones = await getReflexiones();
  const currentDay = new Date().getDate();
  
  return allReflexiones
    .filter(r => Number(r.day) <= currentDay && r.published === "TRUE")
    .sort((a, b) => Number(a.day) - Number(b.day));
}

export async function getTodasReflexiones(): Promise<Reflexion[]> {
  const allReflexiones = await getReflexiones();
  
  return allReflexiones
    .filter(r => r.published === "TRUE")
    .sort((a, b) => Number(a.day) - Number(b.day));
}

export async function getReflexionByDay(day: string): Promise<Reflexion | undefined> {
  const allReflexiones = await getReflexiones();
  return allReflexiones.find(r => r.day === day);
}

export async function getReflexionesDisponibles(): Promise<Reflexion[]> {
  const allReflexiones = await getReflexiones();
  const currentDay = new Date().getDate();
  
  return allReflexiones
    .filter(r => r.published === "TRUE")
    .sort((a, b) => Number(a.day) - Number(b.day));
}

export function isDayAccessible(day: number): boolean {
  const currentDay = new Date().getDate();
  return day <= currentDay;
}

export function getEmbedUrl(url: string): string {
  if (!url) return "";
  
  if (url.includes("/embed/")) {
    return url;
  }
  
  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return url;
}