import React from 'react';
import { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useRtl } from '@/context/DirectionContext';

type IconName =
  | 'home' | 'library' | 'heart' | 'settings' | 'file' | 'plus' | 'link'
  | 'search' | 'chevronRight' | 'back' | 'share' | 'trash' | 'moon'
  | 'shield' | 'clock' | 'pages' | 'rotate' | 'snap'
  | 'check' | 'close' | 'download' | 'info' | 'tools' | 'reorder'
  | 'camera' | 'image' | 'edit' | 'watermark' | 'compress' | 'print' | 'split';

type Props = { name: IconName; size?: number; color?: ColorValue; strokeWidth?: number };

export function AppIcon({ name, size = 22, color = '#F8FAFC', strokeWidth = 1.9 }: Props) {
  const rtl = useRtl();
  const mirror = rtl && (name === 'chevronRight' || name === 'back');
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={mirror ? { transform: [{ scaleX: -1 }] } : undefined}>
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
      {name === 'shield' && <><Path {...p} d="M12 2 20 5v6c0 5-3.2 8.7-8 11-4.8-2.3-8-6-8-11V5z"/><Path {...p} d="m9 12 2 2 4-5"/></>}
      {name === 'clock' && <><Circle {...p} cx="12" cy="12" r="9"/><Path {...p} d="M12 7v5l3 2"/></>}
      {name === 'pages' && <><Rect {...p} x="5" y="3" width="12" height="16" rx="1"/><Path {...p} d="M8 22h11V6"/></>}
      {name === 'rotate' && <><Path {...p} d="M20 7v5h-5"/><Path {...p} d="M19 12a7 7 0 1 0-2 5"/></>}
      {name === 'snap' && <><Path {...p} d="M4 3v5M4 16v5M20 3v5M20 16v5"/><Rect {...p} x="7" y="6" width="10" height="12" rx="1"/></>}
      {name === 'check' && <Path {...p} d="m5 12 4 4L19 6"/>}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6 6 18"/>}
      {name === 'download' && <><Path {...p} d="M12 3v12M7 10l5 5 5-5"/><Path {...p} d="M5 21h14"/></>}
      {name === 'info' && <><Circle {...p} cx="12" cy="12" r="9"/><Path {...p} d="M12 11v6M12 7h.01"/></>}
      {name === 'tools' && <><Path {...p} d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L20 16.4a2.5 2.5 0 0 1-3.6 3.6l-7.7-7.7a4 4 0 0 0-5-5L6 9.6 8.4 7 6.1 4.7"/><Circle {...p} cx="18" cy="18" r=".7"/></>}
      {name === 'reorder' && <><Path {...p} d="M8 6h12M8 12h12M8 18h12"/><Path {...p} d="m3 7 2-2 2 2M5 5v14m-2-2 2 2 2-2"/></>}
      {name === 'camera' && <><Path {...p} d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><Circle {...p} cx="12" cy="13" r="3.5"/></>}
      {name === 'image' && <><Rect {...p} x="3" y="4" width="18" height="16" rx="2"/><Circle {...p} cx="8.5" cy="9" r="1.5"/><Path {...p} d="m4 17 5-5 3.5 3.5 2.5-2.5 5 5"/></>}
      {name === 'edit' && <><Path {...p} d="M4 20h4L19 9l-4-4L4 16z"/><Path {...p} d="m13.5 6.5 4 4M4 20h16"/></>}
      {name === 'watermark' && <><Path {...p} d="M4 4h16v16H4z"/><Path {...p} d="m7 15 3-7 3 7 3-7 2 7M6 18h12"/></>}
      {name === 'compress' && <><Path {...p} d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5"/><Path {...p} d="m8 8-5-5M16 8l5-5M8 16l-5 5M16 16l5 5"/></>}
      {name === 'print' && <><Path {...p} d="M7 9V3h10v6M7 18H4V10h16v8h-3"/><Rect {...p} x="7" y="15" width="10" height="6"/><Path {...p} d="M17 12h.01"/></>}
      {name === 'split' && <><Rect {...p} x="3" y="4" width="7" height="16" rx="1"/><Rect {...p} x="14" y="4" width="7" height="16" rx="1"/><Path {...p} d="M12 3v18"/></>}
    </Svg>
  );
}
