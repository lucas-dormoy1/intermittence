import AsyncStorage from "@react-native-async-storage/async-storage";

const CLES = {
  profils: "intermittence:profils",
  profilActifId: "intermittence:profilActifId",
} as const;

export type CleStorage = keyof typeof CLES;

export async function charger<T>(cle: CleStorage): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(CLES[cle]);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function sauvegarder<T>(cle: CleStorage, valeur: T): Promise<void> {
  try {
    await AsyncStorage.setItem(CLES[cle], JSON.stringify(valeur));
  } catch {
  }
}

export async function supprimer(cle: CleStorage): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLES[cle]);
  } catch {
  }
}

export type TypeDonneeProfil = "contrats" | "formations" | "enseignements";

export function cleProfilData(profilId: string, type: TypeDonneeProfil): string {
  return `intermittence:profil:${profilId}:${type}`;
}

export function cleBackupRestauration(profilId: string): string {
  return `intermittence:profil:${profilId}:backupAvantRestauration`;
}

export async function chargerParCle<T>(cle: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(cle);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function sauvegarderParCle<T>(cle: string, valeur: T): Promise<void> {
  try {
    await AsyncStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
  }
}

export async function supprimerParCle(cle: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cle);
  } catch {
  }
}
