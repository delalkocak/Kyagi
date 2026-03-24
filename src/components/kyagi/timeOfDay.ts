type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface TimeTheme {
  period: TimeOfDay;
  greeting: string;
  gradient: string;
  headerColor: string;
  textColor: string;
  bellStroke: string;
  cardBorder: string;
  cardTextPrimary: string;
  cardTextSecondary: string;
  cardBackground?: string;
}

const themes: Record<TimeOfDay, Omit<TimeTheme, "period" | "greeting">> = {
  morning: {
    headerColor: "#F0A868",
    gradient: "linear-gradient(180deg, #F0A868 0%, #F2BE80 12%, #F5D0A0 25%, #F8DDB8 38%, #FAE6CC 50%, #F8E8D0 62%, #F6EBDA 75%, #F4EDD8 90%, #F4EDD8 100%)",
    textColor: "#5C2E10",
    bellStroke: "#8C5020",
    cardBorder: "#D8C4A8",
    cardTextPrimary: "#7A6A50",
    cardTextSecondary: "#A09480",
  },
  afternoon: {
    headerColor: "#90BEE0",
    gradient: "linear-gradient(180deg, #90BEE0 0%, #A4CCE8 12%, #B8D8EE 25%, #CCE2F2 38%, #DCE9F2 50%, #E4ECEA 62%, #ECEDE2 75%, #F4EDD8 90%, #F4EDD8 100%)",
    textColor: "#1E3448",
    bellStroke: "#4A6E88",
    cardBorder: "#B8C8D4",
    cardTextPrimary: "#5A7080",
    cardTextSecondary: "#8A9AA4",
  },
  evening: {
    headerColor: "#E8B8A0",
    gradient: "linear-gradient(180deg, #E8B8A0 0%, #E4BAB0 12%, #DBBCC4 25%, #DCC4D0 38%, #E4CCDA 50%, #ECD8E0 62%, #EEE4DC 75%, #F4EDD8 90%, #F4EDD8 100%)",
    textColor: "#4A2535",
    bellStroke: "#8A5565",
    cardBorder: "#D4C0C4",
    cardTextPrimary: "#7A5A64",
    cardTextSecondary: "#A08A90",
  },
  night: {
    headerColor: "#3E4460",
    gradient: "linear-gradient(180deg, #3E4460 0%, #444A64 15%, #4E5470 30%, #586078 45%, #64687E 55%, #8A8A90 68%, #B8B4AE 80%, #F4EDD8 95%, #F4EDD8 100%)",
    textColor: "#D8D4E0",
    bellStroke: "#9498B0",
    cardBorder: "rgba(255, 255, 255, 0.45)",
    cardTextPrimary: "#FFFFFF",
    cardTextSecondary: "rgba(255, 255, 255, 0.85)",
    cardBackground: "rgba(50, 54, 72, 0.55)",
  },
};

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function getTimeTheme(): TimeTheme {
  const period = getTimeOfDay();
  const greetings: Record<TimeOfDay, string> = {
    morning: "good morning",
    afternoon: "good afternoon",
    evening: "good evening",
    night: "good night",
  };
  return { period, greeting: greetings[period], ...themes[period] };
}
