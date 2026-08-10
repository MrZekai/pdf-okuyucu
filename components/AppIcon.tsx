import React from 'react';
import { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type IconName =
  | 'home' | 'library' | 'heart' | 'settings' | 'file' | 'plus' | 'link'
  | 'search' | 'chevronRight' | 'back' | 'share' | 'trash' | 'moon'
  | 'sun' | 'grid' | 'shield' | 'clock' | 'pages' | 'rotate' | 'snap'
  | 'check' | 'close' | 'download' | 'info' | 'sparkles';

type Props = { name: IconName; size?: number; color?: ColorValue; strokeWidth?: number };

export function AppIcon({ name, size = 22, color = '#F8FAFC', strokeWidth = 1.9 }: Props) {
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <><Path {...p} d="M3 10.7 12 3l9 7.7"/><Path {...p} d="M5.5 9.8V21h13V9.8"/><Path {...p} d="M9.5 21v-6h5v6"/></>}
      {name === 'library' && <><Rect {...p} x="4" y="3" width="5" height="18" rx="1"/><Rect {...p} x="10" y="5" width="5" height="16" rx="1"/><Path {...p} d="m16.5 5 3.2-1 3.2 15.5-3.2.7z"/></>}
      {name === 'heart' && <Path {...p} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>}
      {name === 'settings' && <><Circle {...p} cx="12" cy="12" r="3"/><Path {...p} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>}
      {name === 'file' && <><Path {...p} d="M6 2h8l4 4v16H6z"/><Path {...p} d="M14 2v5h5"/><Path {...p} d="M9 13h6M9 17h6"/></>}
      {name === 'plus' && <Path {...p} d="M12 5v14M5 12h14"/>}
      {name === 'link' && <><Path {...p} d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><Path {...p} d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>}
      {name === 'search' && <><Circle {...p} cx="10.5" cy="10.5" r="6.5"/><Line {...p} x1="15.5" y1="15.5" x2="21" y2="21"/></>}
      {name === 'chevronRight' && <Path {...p} d="m9 5 7 7-7 7"/>}
      {name === 'back' && <Path {...p} d="m15 18-6-6 6-6"/>}
      {name === 'share' && <><Circle {...p} cx="18" cy="5" r="2"/><Circle {...p} cx="6" cy="12" r="2"/><Circle {...p} cx="18" cy="19" r="2"/><Path {...p} d="m8 11 8-5M8 13l8 5"/></>}
      {name === 'trash' && <><Path {...p} d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/><Path {...p} d="M10 11v6M14 11v6"/></>}
      {name === 'moon' && <Path {...p} d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/>}
      {name === 'sun' && <><Circle {...p} cx="12" cy="12" r="4"/><Path {...p} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}
      {name === 'grid' && <><Rect {...p} x="3" y="3" width="7" height="7" rx="1"/><Rect {...p} x="14" y="3" width="7" height="7" rx="1"/><Rect {...p} x="3" y="14" width="7" height="7" rx="1"/><Rect {...p} x="14" y="14" width="7" height="7" rx="1"/></>}
      {name === 'shield' && <><Path {...p} d="M12 2 20 5v6c0 5-3.2 8.7-8 11-4.8-2.3-8-6-8-11V5z"/><Path {...p} d="m9 12 2 2 4-5"/></>}
      {name === 'clock' && <><Circle {...p} cx="12" cy="12" r="9"/><Path {...p} d="M12 7v5l3 2"/></>}
      {name === 'pages' && <><Rect {...p} x="5" y="3" width="12" height="16" rx="1"/><Path {...p} d="M8 22h11V6"/></>}
      {name === 'rotate' && <><Path {...p} d="M20 7v5h-5"/><Path {...p} d="M19 12a7 7 0 1 0-2 5"/></>}
      {name === 'snap' && <><Path {...p} d="M4 3v5M4 16v5M20 3v5M20 16v5"/><Rect {...p} x="7" y="6" width="10" height="12" rx="1"/></>}
      {name === 'check' && <Path {...p} d="m5 12 4 4L19 6"/>}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6 6 18"/>}
      {name === 'download' && <><Path {...p} d="M12 3v12M7 10l5 5 5-5"/><Path {...p} d="M5 21h14"/></>}
      {name === 'info' && <><Circle {...p} cx="12" cy="12" r="9"/><Path {...p} d="M12 11v6M12 7h.01"/></>}
      {name === 'sparkles' && <><Path {...p} d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3z"/><Path {...p} d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z"/><Path {...p} d="m5 13 .7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7z"/></>}
    </Svg>
  );
}
