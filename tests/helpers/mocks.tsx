import { fireEvent, screen, act } from "@testing-library/react-native";

export type MockPickerCallback = (event: any, date?: Date) => void;

export const mockPickerCallbacksByTestID: Record<string, MockPickerCallback> = {};

export const resetPickerCallbacks = () => {
  Object.keys(mockPickerCallbacksByTestID).forEach(
    (key) => delete mockPickerCallbacksByTestID[key]
  );
  mockCalendarOnDayPress = null;
};

export const selectDatePicker = (btnTestID: string, pickerTestID: string, isoDate: string) => {
  fireEvent.press(screen.getByTestId(btnTestID));
  const callback = mockPickerCallbacksByTestID[pickerTestID];
  act(() => {
    callback({ type: "set" }, new Date(isoDate + "T00:00:00"));
  });
};

export const mockDateTimePickerFactory = () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) => {
      if (props.testID) {
        mockPickerCallbacksByTestID[props.testID] = props.onChange;
      }
      return (
        <View testID={props.testID ?? "datetime-picker"}>
          <Text testID="picker-value">{props.value?.toISOString()}</Text>
        </View>
      );
    },
  };
};

let mockCalendarOnDayPress: ((day: any) => void) | null = null;

export const simulateDayPress = (isoDate: string) => {
  if (!mockCalendarOnDayPress) throw new Error("Calendar onDayPress not registered");
  const [year, month, day] = isoDate.split("-").map(Number);
  act(() => {
    mockCalendarOnDayPress!({
      dateString: isoDate,
      day,
      month,
      year,
      timestamp: new Date(isoDate + "T00:00:00").getTime(),
    });
  });
};

export const mockObtenirToken = jest.fn().mockResolvedValue("mock-access-token");

export const mockGoogleAuthContextFactory = () => ({
  GoogleAuthProvider: ({ children }: { children: any }) => children,
  useGoogleAuth: () => ({ obtenirToken: mockObtenirToken, seDeconnecter: jest.fn() }),
});

export const mockCalendarsFactory = () => {
  const { View, Text } = require("react-native");
  return {
    Calendar: (props: any) => {
      mockCalendarOnDayPress = props.onDayPress;
      return (
        <View testID="mock-calendar">
          <Text>Calendar</Text>
        </View>
      );
    },
    LocaleConfig: { locales: {}, defaultLocale: "" },
    DateData: {},
  };
};
