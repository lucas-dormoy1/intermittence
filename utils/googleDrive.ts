const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const NOM_PROPRIETE_PROFIL = "intermittenceProfilId";
const BOUNDARY = "intermittence_boundary";

interface FichierDrive {
  id: string;
  name: string;
}

async function requeteDrive<T>(accessToken: string, url: string, options?: RequestInit): Promise<T> {
  const reponse = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!reponse.ok) {
    throw new Error(`Erreur Drive (${reponse.status}): ${await reponse.text()}`);
  }
  return reponse.json();
}

export function construireRequeteDossier(nomDossier: string): string {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${nomDossier}' and trashed=false`;
  return `${DRIVE_FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name)`;
}

export async function trouverOuCreerDossier(accessToken: string, nomDossier: string): Promise<string> {
  const recherche = await requeteDrive<{ files: FichierDrive[] }>(
    accessToken,
    construireRequeteDossier(nomDossier)
  );
  if (recherche.files.length > 0) return recherche.files[0].id;

  const cree = await requeteDrive<FichierDrive>(accessToken, DRIVE_FILES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nomDossier, mimeType: "application/vnd.google-apps.folder" }),
  });
  return cree.id;
}

export function construireRequeteFichierProfil(dossierId: string, profilId: string): string {
  const q = `'${dossierId}' in parents and appProperties has { key='${NOM_PROPRIETE_PROFIL}' and value='${profilId}' } and trashed=false`;
  return `${DRIVE_FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name)`;
}

export async function trouverFichierProfil(
  accessToken: string,
  dossierId: string,
  profilId: string
): Promise<string | null> {
  const recherche = await requeteDrive<{ files: FichierDrive[] }>(
    accessToken,
    construireRequeteFichierProfil(dossierId, profilId)
  );
  return recherche.files[0]?.id ?? null;
}

export function construireCorpsMultipart(metadata: object, contenuJSON: string): string {
  return (
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${contenuJSON}\r\n` +
    `--${BOUNDARY}--`
  );
}

export async function televerserFichier(
  accessToken: string,
  dossierId: string,
  profilId: string,
  nomAffiche: string,
  contenuJSON: string,
  fichierIdExistant?: string | null
): Promise<string> {
  const metadata = fichierIdExistant
    ? { name: nomAffiche, appProperties: { [NOM_PROPRIETE_PROFIL]: profilId } }
    : { name: nomAffiche, parents: [dossierId], appProperties: { [NOM_PROPRIETE_PROFIL]: profilId } };

  const url = fichierIdExistant
    ? `${DRIVE_UPLOAD_URL}/${fichierIdExistant}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  const resultat = await requeteDrive<FichierDrive>(accessToken, url, {
    method: fichierIdExistant ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${BOUNDARY}` },
    body: construireCorpsMultipart(metadata, contenuJSON),
  });
  return resultat.id;
}

export interface SauvegardeDrive {
  profilId: string;
  nom: string;
}

export function construireRequeteListeFichiers(dossierId: string): string {
  const q = `'${dossierId}' in parents and trashed=false`;
  return `${DRIVE_FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name,appProperties)`;
}

export async function listerSauvegardes(accessToken: string, dossierId: string): Promise<SauvegardeDrive[]> {
  const recherche = await requeteDrive<{ files: { name: string; appProperties?: Record<string, string> }[] }>(
    accessToken,
    construireRequeteListeFichiers(dossierId)
  );
  return recherche.files
    .filter((f) => f.appProperties?.[NOM_PROPRIETE_PROFIL])
    .map((f) => ({ profilId: f.appProperties![NOM_PROPRIETE_PROFIL], nom: f.name }));
}

export async function telechargerFichier(accessToken: string, fichierId: string): Promise<string> {
  const reponse = await fetch(`${DRIVE_FILES_URL}/${fichierId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!reponse.ok) {
    throw new Error(`Erreur Drive (${reponse.status}): ${await reponse.text()}`);
  }
  return reponse.text();
}
