// src/components/WeatherIcons.tsx

interface IconProps {
  size?: number;
  className?: string;
}

// Moon with clouds (partly cloudy night)
export const MoonClouds = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Moon - positioned upper right */}
    <path 
    //   d="M36 4a10 10 0 1 0 10 10A8 8 0 0 1 34 4z" 
    d="M32 0a14 14 0 1 0 14 14A11 11 0 0 1 28 6z" 
      fill="#fbbf24" 
      stroke="#f59e0b" 
      strokeWidth="1"
    />
    {/* Cloud - positioned lower left, overlapping */}
    <path 
      d="M12 36h20a7 7 0 1 0-2-13.5 9 9 0 0 0-17-2.5 8 8 0 0 0 0 16z" 
      fill="#e5e7eb" 
      stroke="#9ca3af" 
      strokeWidth="1"
    />
  </svg>
);

// Moon with few clouds (mostly clear night)
export const MoonFewClouds = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Moon - centered */}
    <path 
      d="M31 6a14 14 0 1 0 14 14A11 11 0 0 1 28 6z" 
      fill="#fbbf24" 
      stroke="#f59e0b" 
      strokeWidth="1"
    />
    {/* Small cloud - bottom corner */}
    <path 
      d="M8 40h14a5 5 0 1 0-1.5-9.8 6.5 6.5 0 0 0-12-1.7A5.5 5.5 0 0 0 8 40z" 
      fill="#e5e7eb" 
      stroke="#9ca3af" 
      strokeWidth="1"
      opacity="0.9"
    />
  </svg>
);

// Clear moon
export const ClearMoon = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path 
      d="M 31.56 3.934 a 16 16 0 1 0 13.58 23.218 A 13 13 0 0 1 31.517 3.844 z" 
      fill="#fbbf24" 
      stroke="#f59e0b" 
      strokeWidth="1.5"
    />
  </svg>
);

// Clear sun
export const ClearSun = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Sun rays */}
    <g stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
      <line x1="24" y1="2" x2="24" y2="8" />
      <line x1="24" y1="40" x2="24" y2="46" />
      <line x1="2" y1="24" x2="8" y2="24" />
      <line x1="40" y1="24" x2="46" y2="24" />
      <line x1="7.5" y1="7.5" x2="11.8" y2="11.8" />
      <line x1="36.2" y1="36.2" x2="40.5" y2="40.5" />
      <line x1="7.5" y1="40.5" x2="11.8" y2="36.2" />
      <line x1="36.2" y1="11.8" x2="40.5" y2="7.5" />
    </g>
    {/* Sun circle */}
    <circle cx="24" cy="24" r="10" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
  </svg>
);

// Sun with clouds (partly cloudy day)
export const SunClouds = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Sun - upper right */}
    <circle cx="34" cy="14" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
    {/* Rays */}
    <g stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round">
      <line x1="34" y1="2" x2="34" y2="5" />
      <line x1="44" y1="14" x2="47" y2="14" />
      <line x1="41" y1="7" x2="43.5" y2="4.5" />
      <line x1="41" y1="21" x2="43.5" y2="23.5" />
    </g>
    {/* Cloud */}
    <path 
      d="M10 38h22a7 7 0 1 0-2-13.5 9 9 0 0 0-17-2.5 8 8 0 0 0-3 16z" 
      fill="#e5e7eb" 
      stroke="#9ca3af" 
      strokeWidth="1"
    />
  </svg>
);

// Overcast / heavy clouds
export const Overcast = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Back cloud */}
    <path 
      d="M10 28h20a6 6 0 1 0-1.5-11.5 7.5 7.5 0 0 0-14-2A6.5 6.5 0 0 0 10 28z" 
      fill="#9ca3af" 
      stroke="#6b7280" 
      strokeWidth="1"
    />
    {/* Front cloud */}
    <path 
      d="M14 40h22a7 7 0 1 0-2-13.5 9 9 0 0 0-17-2.5 8 8 0 0 0-3 16z" 
      fill="#d1d5db" 
      stroke="#9ca3af" 
      strokeWidth="1"
    />
  </svg>
);

// Rain
export const Rain = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Cloud */}
    <path 
      d="M10 28h26a7 7 0 1 0-2-13.5 9 9 0 0 0-17-2.5 8 8 0 0 0-7 16z" 
      fill="#9ca3af" 
      stroke="#6b7280" 
      strokeWidth="1"
    />
    {/* Rain drops */}
    <g stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
      <line x1="14" y1="32" x2="12" y2="40" />
      <line x1="23" y1="32" x2="21" y2="42" />
      <line x1="32" y1="32" x2="30" y2="38" />
    </g>
  </svg>
);

// Snow
export const Snow = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Cloud */}
    <path 
      d="M10 26h26a7 7 0 1 0-2-13.5 9 9 0 0 0-17-2.5 8 8 0 0 0-7 16z" 
      fill="#9ca3af" 
      stroke="#6b7280" 
      strokeWidth="1"
    />
    {/* Snowflakes */}
    <g fill="#bfdbfe">
      <circle cx="14" cy="34" r="2" />
      <circle cx="24" cy="38" r="2.5" />
      <circle cx="34" cy="33" r="2" />
      <circle cx="19" cy="42" r="1.5" />
      <circle cx="30" cy="43" r="1.5" />
    </g>
  </svg>
);

// Fog
export const Fog = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <g stroke="#9ca3af" strokeWidth="3" strokeLinecap="round">
      <line x1="6" y1="16" x2="42" y2="16" />
      <line x1="10" y1="24" x2="38" y2="24" opacity="0.8" />
      <line x1="6" y1="32" x2="42" y2="32" opacity="0.6" />
      <line x1="12" y1="40" x2="36" y2="40" opacity="0.4" />
    </g>
  </svg>
);

// Thunderstorm
export const Thunderstorm = ({ size = 24, className }: IconProps) => (
  <svg 
    viewBox="0 0 48 48" 
    width={size} 
    height={size} 
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    {/* Cloud */}
    <path 
      d="M8 26h30a7 7 0 1 0-2-13.5 9 9 0 0 0-17-2.5 8 8 0 0 0-11 16z" 
      fill="#6b7280" 
      stroke="#4b5563" 
      strokeWidth="1"
    />
    {/* Lightning bolt */}
    <path 
      d="M26 24 L22 34 L28 34 L24 46 L32 32 L26 32 L30 24 Z" 
      fill="#fbbf24" 
      stroke="#f59e0b" 
      strokeWidth="0.5"
    />
  </svg>
);

// Icon type for the mapper
export type WeatherIconType = 
  | 'clear-day' 
  | 'clear-night' 
  | 'partly-cloudy-day' 
  | 'partly-cloudy-night'
  | 'few-clouds-night'
  | 'cloudy' 
  | 'overcast'
  | 'rain' 
  | 'snow' 
  | 'fog' 
  | 'thunderstorm';

// Main component that maps icon type to SVG
export function WeatherIcon({ 
  type, 
  size = 24, 
  className 
}: { 
  type: WeatherIconType | string; 
  size?: number; 
  className?: string;
}) {
  switch (type) {
    case 'clear-day':
      return <ClearSun size={size} className={className} />;
    case 'clear-night':
      return <ClearMoon size={size} className={className} />;
    case 'partly-cloudy-day':
      return <SunClouds size={size} className={className} />;
    case 'partly-cloudy-night':
      return <MoonClouds size={size} className={className} />;
    case 'few-clouds-night':
      return <MoonFewClouds size={size} className={className} />;
    case 'cloudy':
    case 'overcast':
      return <Overcast size={size} className={className} />;
    case 'rain':
      return <Rain size={size} className={className} />;
    case 'snow':
      return <Snow size={size} className={className} />;
    case 'fog':
      return <Fog size={size} className={className} />;
    case 'thunderstorm':
      return <Thunderstorm size={size} className={className} />;
    default:
      // If it's an emoji, just return it as text
      return <span style={{ fontSize: size }}>{type}</span>;
  }
}