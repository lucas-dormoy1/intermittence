import {
  construireRequeteDossier,
  construireRequeteFichierProfil,
  construireCorpsMultipart,
  construireRequeteListeFichiers,
} from "../../utils/googleDrive";

describe("construireRequeteDossier", () => {
  it("cible un dossier par nom exact et type dossier", () => {
    const url = construireRequeteDossier("Intermittence");
    const decoded = decodeURIComponent(url);
    expect(url.startsWith("https://www.googleapis.com/drive/v3/files?q=")).toBe(true);
    expect(decoded).toContain("mimeType='application/vnd.google-apps.folder'");
    expect(decoded).toContain("name='Intermittence'");
    expect(decoded).toContain("trashed=false");
  });
});

describe("construireRequeteFichierProfil", () => {
  it("cible un fichier par dossier parent et appProperties du profil", () => {
    const url = construireRequeteFichierProfil("dossier-123", "profil-abc");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("'dossier-123' in parents");
    expect(decoded).toContain("key='intermittenceProfilId' and value='profil-abc'");
  });

  it("isole les requêtes de deux profils différents", () => {
    const urlA = construireRequeteFichierProfil("dossier-1", "profil-a");
    const urlB = construireRequeteFichierProfil("dossier-1", "profil-b");
    expect(urlA).not.toBe(urlB);
  });
});

describe("construireRequeteListeFichiers", () => {
  it("cible tous les fichiers d'un dossier, sans filtre sur un profil précis", () => {
    const url = construireRequeteListeFichiers("dossier-123");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("'dossier-123' in parents");
    expect(decoded).toContain("trashed=false");
    expect(url).toContain("fields=files(id,name,appProperties)");
  });
});

describe("construireCorpsMultipart", () => {
  it("inclut les métadonnées et le contenu JSON entre les mêmes bornes", () => {
    const corps = construireCorpsMultipart({ name: "profil.json" }, '{"a":1}');
    expect(corps).toContain(JSON.stringify({ name: "profil.json" }));
    expect(corps).toContain('{"a":1}');
    expect(corps).toContain("Content-Type: application/json; charset=UTF-8");
  });

  it("démarre et termine par le même boundary", () => {
    const corps = construireCorpsMultipart({}, "{}");
    const boundaryOuverture = corps.match(/^--([^\r\n]+)/)?.[1];
    expect(boundaryOuverture).toBeDefined();
    expect(corps.endsWith(`--${boundaryOuverture}--`)).toBe(true);
  });
});
