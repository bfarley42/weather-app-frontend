import { Sun, CloudSun, Cloud, CloudRain, Snowflake, CloudFog, CloudLightning } from 'lucide-react';

export const getConditionEmoji = (condition: string | null) => {
  // Default / Fallback
  if (!condition) return <CloudSun className="w-6 h-6 text-gray-500" />;

  const c = condition.toLowerCase();
  if (c.includes('thunder')) {
    return <CloudLightning className="w-6 h-6 text-purple-500" />;
  }
  if (c.includes('snow')) {
    return <Snowflake className="w-6 h-6 text-cyan-300" />;
  }
  if (c.includes('rain')) {
    return <CloudRain className="w-6 h-6 text-blue-400" />;
  }

  if (c.includes('clear') || c.includes('sunny')) {
    return <Sun className="w-6 h-6 text-yellow-500" />;
  }
  if (c.includes('partly')) {
    return <CloudSun className="w-6 h-6 text-yellow-500" />;
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return <Cloud className="w-6 h-6 text-gray-400" />;
  }
  if (c.includes('fog')) {
    return <CloudFog className="w-6 h-6 text-gray-300" />;
  }

  return <CloudSun className="w-6 h-6 text-gray-500" />;
};
