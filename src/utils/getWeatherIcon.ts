import manifestRaw from "../assets/weather/weather_icons.csv";
import clear_day from "../assets/weather/clear_day.svg";
import clear_night from "../assets/weather/clear_night.svg";
import partly_cloudy_night from "../assets/weather/partly_cloudy_night.svg";

interface IconRow {
  id: string;
  filename: string;
  description: string;
  conditions: string;
  day_or_night: "day" | "night";
}

const manifest = manifestRaw as unknown as IconRow[];

const iconMap: Record<string, string> = {
    clear_day,
    clear_night,
  partly_cloudy_night,

};
export function getWeatherIcon(code: string, isNight: boolean): string {
  const row = manifest.find((m: IconRow) =>
    m.conditions.split(",").map(s => s.trim()).includes(code)
  );

  if (!row) {
    return isNight ? iconMap["clear_night"] : iconMap["clear_day"];
  }

  return iconMap[row.id];
}