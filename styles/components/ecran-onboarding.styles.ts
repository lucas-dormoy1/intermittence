import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSubtle,
    padding: 20,
  },
  titre: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  sousTitre: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  btnDrive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  btnDriveTexte: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  listeSauvegardes: {
    gap: 8,
    marginBottom: 16,
  },
  sauvegardeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sauvegardeItemTexte: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textDark,
  },
});
