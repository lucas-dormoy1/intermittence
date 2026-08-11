import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { formatDateISO } from "../utils/date";
import { styles } from "./DateRangePicker.styles";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";

LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ],
  monthNamesShort: [
    "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
    "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
  ],
  dayNames: [
    "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
  ],
  dayNamesShort: ["D", "L", "M", "M", "J", "V", "S"],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

type MarkedDates = Record<string, {
  startingDay?: boolean;
  endingDay?: boolean;
  color: string;
  textColor: string;
}>;

type Props = {
  initialStart?: Date;
  initialEnd?: Date;
  onConfirm: (debut: Date, fin: Date) => void;
  onCancel: () => void;
};

function buildMarkedDates(start: string, end?: string): MarkedDates {
  if (!end || start === end) {
    return {
      [start]: {
        startingDay: true,
        endingDay: true,
        color: colors.primary,
        textColor: colors.textOnPrimary,
      },
    };
  }

  const marked: MarkedDates = {};
  const current = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");

  while (current <= last) {
    const dateStr = formatDateISO(current);
    marked[dateStr] = {
      color: dateStr === start || dateStr === end ? colors.primary : colors.primaryBg,
      textColor: dateStr === start || dateStr === end ? colors.textOnPrimary : colors.primary,
      startingDay: dateStr === start,
      endingDay: dateStr === end,
    };
    current.setDate(current.getDate() + 1);
  }
  return marked;
}

export default function DateRangePicker({ initialStart, initialEnd, onConfirm, onCancel }: Props) {
  const [startDate, setStartDate] = useState<string | null>(
    initialStart ? formatDateISO(initialStart) : null
  );
  const [endDate, setEndDate] = useState<string | null>(
    initialEnd ? formatDateISO(initialEnd) : null
  );
  const [markedDates, setMarkedDates] = useState<MarkedDates>(
    initialStart
      ? buildMarkedDates(formatDateISO(initialStart), initialEnd ? formatDateISO(initialEnd) : undefined)
      : {}
  );

  const onDayPress = useCallback((day: DateData) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate(null);
      setMarkedDates(buildMarkedDates(day.dateString));
    } else {
      if (day.dateString < startDate) {
        setStartDate(day.dateString);
        setEndDate(null);
        setMarkedDates(buildMarkedDates(day.dateString));
      } else {
        // Cette partie gère maintenant les dates après OU égales à la date de début
        setEndDate(day.dateString);
        setMarkedDates(buildMarkedDates(startDate, day.dateString));
      }
    }
  }, [startDate, endDate]);

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(
        new Date(startDate + "T00:00:00"),
        new Date(endDate + "T00:00:00")
      );
    }
  };

  const canConfirm = !!(startDate && endDate);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Calendar
          markingType="period"
          markedDates={markedDates}
          onDayPress={onDayPress}
          firstDay={1}
          theme={{
            backgroundColor: colors.bgBase,
            calendarBackground: colors.bgBase,
            textSectionTitleColor: colors.textMuted,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.textOnPrimary,
            todayTextColor: colors.primary,
            dayTextColor: colors.textDark,
            textDisabledColor: colors.textFaint,
            arrowColor: colors.primary,
            monthTextColor: colors.textDark,
            textDayFontFamily: fonts.regular,
            textMonthFontFamily: fonts.bold,
            textDayHeaderFontFamily: fonts.medium,
            textDayFontSize: 15,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 13,
          }}
        />
      </ScrollView>
      <View style={styles.actions}>
        <Pressable style={styles.btnAnnuler} onPress={onCancel}>
          <Text style={styles.btnAnnulerText}>Annuler</Text>
        </Pressable>
        <Pressable
          style={[styles.btnConfirmer, !canConfirm && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
        >
          <Text style={[styles.btnConfirmerText, !canConfirm && styles.btnDisabledText]}>
            Sélectionner
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
