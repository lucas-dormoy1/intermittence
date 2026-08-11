import { Alert, Platform } from "react-native";

export function alerterInfo(titre: string, message: string): void {
  if (Platform.OS === "web") {
    window.alert(`${titre}\n\n${message}`);
  } else {
    Alert.alert(titre, message);
  }
}
