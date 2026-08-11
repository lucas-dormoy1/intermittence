import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from "react";
import { Platform } from "react-native";
import { alerterInfo } from "../utils/alerte";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ProfilIntermittent, ProfilSansId } from "../types/profil";
import * as Crypto from "expo-crypto";
import {
  charger,
  sauvegarder,
  supprimer,
  cleProfilData,
  cleBackupRestauration,
  chargerParCle,
  sauvegarderParCle,
  supprimerParCle,
  TypeDonneeProfil,
} from "../utils/storage";
import {
  trouverOuCreerDossier,
  trouverFichierProfil,
  televerserFichier,
  telechargerFichier,
  listerSauvegardes,
  SauvegardeDrive,
} from "../utils/googleDrive";

interface ProfilsContextType {
  profils: ProfilIntermittent[];
  profilActifId: string | null;
  profilActif: ProfilIntermittent | null;
  chargementTermine: boolean;
  versionDonneesExternes: number;
  ajouterProfil: (profil: ProfilSansId) => string;
  modifierProfil: (id: string, donnees: ProfilSansId) => void;
  supprimerProfil: (id: string) => void;
  dupliquerProfil: (id: string, nouveauNom: string) => void;
  exporterProfil: (id: string) => Promise<void>;
  importerProfil: () => Promise<void>;
  sauvegarderProfilSurDrive: (id: string, accessToken: string) => Promise<void>;
  restaurerProfilDepuisDrive: (id: string, accessToken: string) => Promise<void>;
  annulerDerniereRestauration: (id: string) => Promise<void>;
  listerSauvegardesDrive: (accessToken: string) => Promise<SauvegardeDrive[]>;
  changerProfilActif: (id: string) => void;
}

const ProfilsContext = createContext<ProfilsContextType | null>(null);

const TYPES_DONNEES: TypeDonneeProfil[] = ["contrats", "formations", "enseignements"];

export function ProfilsProvider({ children }: { children: ReactNode }) {
  const [profils, setProfils] = useState<ProfilIntermittent[]>([]);
  const [profilActifId, setProfilActifId] = useState<string | null>(null);
  const [chargementTermine, setChargementTermine] = useState(false);
  const [versionDonneesExternes, setVersionDonneesExternes] = useState(0);
  const profilsRef = useRef(profils);
  profilsRef.current = profils;

  useEffect(() => {
    Promise.all([
      charger<ProfilIntermittent[]>("profils"),
      charger<string>("profilActifId"),
    ])
      .then(([profilsCharges, idActif]) => {
        if (profilsCharges) {
          let aMigre = false;
          const migres = profilsCharges.map((p) => {
            if (p.aOuvertDroits === undefined) {
              aMigre = true;
              return { ...p, aOuvertDroits: true } as ProfilIntermittent;
            }
            return p;
          });
          setProfils(migres);
          if (aMigre) sauvegarder("profils", migres);
        }
        if (idActif) setProfilActifId(idActif);
      })
      .finally(() => setChargementTermine(true));
  }, []);

  const persisterProfilActifId = useCallback((id: string | null) => {
    setProfilActifId(id);
    if (id) {
      sauvegarder("profilActifId", id);
    } else {
      supprimer("profilActifId");
    }
  }, []);

  const ajouterProfil = useCallback((donnees: ProfilSansId): string => {
    const id = Crypto.randomUUID();
    const nouveau: ProfilIntermittent = { id, ...donnees };
    setProfils((prev) => {
      const mis = [...prev, nouveau];
      sauvegarder("profils", mis);
      return mis;
    });
    persisterProfilActifId(id);
    return id;
  }, [persisterProfilActifId]);

  const modifierProfil = useCallback((id: string, donnees: ProfilSansId) => {
    setProfils((prev) => {
      const mis = prev.map((p) => (p.id === id ? { id, ...donnees } : p));
      sauvegarder("profils", mis);
      return mis;
    });
  }, []);

  const supprimerProfil = useCallback((id: string) => {
    Promise.all(TYPES_DONNEES.map((type) => supprimerParCle(cleProfilData(id, type))));
    supprimerParCle(cleBackupRestauration(id));

    setProfils((prev) => {
      const mis = prev.filter((p) => p.id !== id);
      sauvegarder("profils", mis);
      return mis;
    });

    setProfilActifId((prevId) => {
      if (prevId !== id) return prevId;
      const autre = profilsRef.current.find((p) => p.id !== id);
      const nouvelId = autre?.id ?? null;
      if (nouvelId) {
        sauvegarder("profilActifId", nouvelId);
      } else {
        supprimer("profilActifId");
      }
      return nouvelId;
    });
  }, []);

  const dupliquerProfil = useCallback(async (id: string, nouveauNom: string) => {
    const source = profilsRef.current.find((p) => p.id === id);
    if (!source) return;

    const nouvelId = Crypto.randomUUID();
    const copie: ProfilIntermittent = { ...source, id: nouvelId, nom: nouveauNom };

    setProfils((prev) => {
      const mis = [...prev, copie];
      sauvegarder("profils", mis);
      return mis;
    });

    await Promise.all(
      TYPES_DONNEES.map(async (type) => {
        const donnees = await chargerParCle(cleProfilData(id, type));
        if (donnees) {
          await sauvegarderParCle(cleProfilData(nouvelId, type), donnees);
        }
      })
    );
  }, []);

  const construireExportProfil = useCallback(async (id: string) => {
    const source = profilsRef.current.find((p) => p.id === id);
    if (!source) return null;

    return {
      version: "1.0",
      profil: source,
      contrats: await chargerParCle(cleProfilData(id, "contrats")) || [],
      formations: await chargerParCle(cleProfilData(id, "formations")) || [],
      enseignements: await chargerParCle(cleProfilData(id, "enseignements")) || [],
    };
  }, []);

  const exporterProfil = useCallback(async (id: string) => {
    const exportData = await construireExportProfil(id);
    if (!exportData) return;

    try {
      const safeNom = exportData.profil.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `export_intermittence_${safeNom}.json`;

      // Gestion spécifique pour le Web (téléchargement direct)
      if (Platform.OS === 'web') {
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // Gestion Native (iOS / Android)
      const baseDir = FileSystem.cacheDirectory ?? "";
      const fileUri = baseDir.endsWith('/') ? `${baseDir}${fileName}` : `${baseDir}/${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 3. Partager le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { 
          mimeType: 'application/json', 
          dialogTitle: `Exporter le profil ${exportData.profil.nom}`,
          UTI: 'public.json' // Recommandé pour iOS
        });
      } else {
        alerterInfo("Erreur", "Le partage n'est pas disponible sur cet appareil.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      alerterInfo("Erreur", `Impossible d'exporter le profil: ${message}.`);
    }
  }, [construireExportProfil]);

  const importerProfil = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      let content: string;

      // Sur Web, FileSystem ne peut pas lire l'URI du DocumentPicker directement
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        if (!response.ok) {
          throw new Error(`Erreur HTTP lors de la récupération du fichier: ${response.status} ${response.statusText}`);
        }
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (!content) throw new Error("Le fichier est vide ou n'a pas pu être lu.");

      const data = JSON.parse(content);

      // Validation basique
      if (!data.profil || !data.profil.nom || !data.version) {
        throw new Error("Format de fichier invalide: 'profil', 'profil.nom' ou 'version' manquant.");
      }

      // 1. Créer le nouveau profil (avec un nouvel ID pour éviter les conflits)
      const nouvelId = Crypto.randomUUID();
      const nouveauProfil: ProfilIntermittent = {
        ...data.profil,
        id: nouvelId,
        nom: `${data.profil.nom} (Importé)`,
      };

      // 2. Sauvegarder les données associées
      if (data.contrats) await sauvegarderParCle(cleProfilData(nouvelId, "contrats"), data.contrats);
      if (data.formations) await sauvegarderParCle(cleProfilData(nouvelId, "formations"), data.formations);
      if (data.enseignements) await sauvegarderParCle(cleProfilData(nouvelId, "enseignements"), data.enseignements);

      // 3. Ajouter à la liste des profils
      setProfils((prev) => {
        const mis = [...prev, nouveauProfil];
        sauvegarder("profils", mis);
        return mis;
      });

      alerterInfo("Succès", `Le profil "${data.profil.nom}" a été importé.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      alerterInfo("Erreur", `Impossible d'importer le fichier: ${message}. Vérifiez qu'il s'agit bien d'un export valide.`);
    }
  }, []);

  const sauvegarderProfilSurDrive = useCallback(async (id: string, accessToken: string) => {
    const exportData = await construireExportProfil(id);
    if (!exportData) return;

    try {
      const dossierId = await trouverOuCreerDossier(accessToken, "Intermittence");
      const fichierIdExistant = await trouverFichierProfil(accessToken, dossierId, id);
      const nomFichier = `${exportData.profil.nom}.json`;

      await televerserFichier(
        accessToken,
        dossierId,
        id,
        nomFichier,
        JSON.stringify(exportData),
        fichierIdExistant
      );

      alerterInfo("Succès", `Le profil "${exportData.profil.nom}" a été sauvegardé sur Google Drive.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      alerterInfo("Erreur", `Impossible de sauvegarder sur Google Drive: ${message}.`);
    }
  }, [construireExportProfil]);

  const restaurerProfilDepuisDrive = useCallback(async (id: string, accessToken: string) => {
    try {
      const dossierId = await trouverOuCreerDossier(accessToken, "Intermittence");
      const fichierId = await trouverFichierProfil(accessToken, dossierId, id);
      if (!fichierId) {
        throw new Error("Aucune sauvegarde trouvée sur Google Drive pour ce profil.");
      }

      const contenu = await telechargerFichier(accessToken, fichierId);
      const data = JSON.parse(contenu);

      if (!data.profil || !data.profil.nom || !data.version) {
        throw new Error("Format de sauvegarde invalide.");
      }

      const snapshotAvantRestauration = await construireExportProfil(id);
      if (snapshotAvantRestauration) {
        await sauvegarderParCle(cleBackupRestauration(id), snapshotAvantRestauration);
      }

      const profilRestaure: ProfilIntermittent = { ...data.profil, id };

      setProfils((prev) => {
        const existe = prev.some((p) => p.id === id);
        const mis = existe
          ? prev.map((p) => (p.id === id ? profilRestaure : p))
          : [...prev, profilRestaure];
        sauvegarder("profils", mis);
        return mis;
      });

      if (data.contrats) await sauvegarderParCle(cleProfilData(id, "contrats"), data.contrats);
      if (data.formations) await sauvegarderParCle(cleProfilData(id, "formations"), data.formations);
      if (data.enseignements) await sauvegarderParCle(cleProfilData(id, "enseignements"), data.enseignements);

      setVersionDonneesExternes((v) => v + 1);
      alerterInfo("Succès", `Le profil "${data.profil.nom}" a été restauré depuis Google Drive.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      alerterInfo("Erreur", `Impossible de restaurer depuis Google Drive: ${message}.`);
    }
  }, [construireExportProfil]);

  const annulerDerniereRestauration = useCallback(async (id: string) => {
    try {
      const snapshot = await chargerParCle<{
        profil: ProfilIntermittent;
        contrats: unknown;
        formations: unknown;
        enseignements: unknown;
      }>(cleBackupRestauration(id));

      if (!snapshot || !snapshot.profil || !snapshot.profil.nom) {
        alerterInfo("Info", "Aucune restauration à annuler pour ce profil.");
        return;
      }

      const profilRestaure: ProfilIntermittent = { ...snapshot.profil, id };

      setProfils((prev) => {
        const mis = prev.map((p) => (p.id === id ? profilRestaure : p));
        sauvegarder("profils", mis);
        return mis;
      });

      await sauvegarderParCle(cleProfilData(id, "contrats"), snapshot.contrats);
      await sauvegarderParCle(cleProfilData(id, "formations"), snapshot.formations);
      await sauvegarderParCle(cleProfilData(id, "enseignements"), snapshot.enseignements);
      await supprimerParCle(cleBackupRestauration(id));

      setVersionDonneesExternes((v) => v + 1);
      alerterInfo("Succès", `La dernière restauration de "${profilRestaure.nom}" a été annulée.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      alerterInfo("Erreur", `Impossible d'annuler la restauration: ${message}.`);
    }
  }, []);

  const listerSauvegardesDrive = useCallback(async (accessToken: string) => {
    const dossierId = await trouverOuCreerDossier(accessToken, "Intermittence");
    return listerSauvegardes(accessToken, dossierId);
  }, []);

  const changerProfilActif = useCallback((id: string) => {
    persisterProfilActifId(id);
  }, [persisterProfilActifId]);

  const profilActif = useMemo(
    () => profils.find((p) => p.id === profilActifId) ?? null,
    [profils, profilActifId]
  );

  const valeur = useMemo<ProfilsContextType>(
    () => ({
      profils,
      profilActifId,
      profilActif,
      chargementTermine,
      versionDonneesExternes,
      ajouterProfil,
      modifierProfil,
      supprimerProfil,
      dupliquerProfil,
      exporterProfil,
      importerProfil,
      sauvegarderProfilSurDrive,
      restaurerProfilDepuisDrive,
      annulerDerniereRestauration,
      listerSauvegardesDrive,
      changerProfilActif,
    }),
    [profils, profilActifId, profilActif, chargementTermine, versionDonneesExternes, ajouterProfil, modifierProfil, supprimerProfil, dupliquerProfil, exporterProfil, importerProfil, sauvegarderProfilSurDrive, restaurerProfilDepuisDrive, annulerDerniereRestauration, listerSauvegardesDrive, changerProfilActif]
  );

  return (
    <ProfilsContext.Provider value={valeur}>
      {children}
    </ProfilsContext.Provider>
  );
}

export function useProfils() {
  const context = useContext(ProfilsContext);
  if (!context) {
    throw new Error("useProfils doit être utilisé dans un ProfilsProvider");
  }
  return context;
}
