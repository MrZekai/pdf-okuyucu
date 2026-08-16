import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Text as SvgText } from 'react-native-svg';
import { palette } from '@/constants/theme';

type Props = {
  /** Rozetin kenar uzunlugu (px). Varsayilan 44. */
  size?: number;
  /** Rozetin yanına bir ürün adı eklensin mi. */
  withWordmark?: boolean;
  /** Yerelleştirilmiş ürün adı. Verilmezse global varsayılan kullanılır. */
  wordmark?: string;
  /** Wordmark altinda gosterilecek kisa aciklama. */
  tagline?: string;
};

/**
 * Uygulamanin marka rozeti: launcher ikonuyla birebir ayni gorsel dil.
 * Kirmizi belge + beyaz "PDF" -> kullanici anasayfada da ayni sinyali gorur.
 */
export function PdfBrandMark({ size = 44, withWordmark = false, wordmark = 'PDF Reader', tagline }: Props) {
  const mark = (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="pdfBrandRed" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF564C" />
          <Stop offset="1" stopColor="#C2101A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M280 130 h332 l152 152 v568 a48 48 0 0 1 -48 48 H280 a48 48 0 0 1 -48 -48 V178 a48 48 0 0 1 48 -48 z"
        fill="url(#pdfBrandRed)"
      />
      <Path d="M612 130 l152 152 h-116 a36 36 0 0 1 -36 -36 z" fill="#FFC3BE" />
      <SvgText
        x="498"
        y="620"
        fontSize="228"
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
      >
        PDF
      </SvgText>
      <Rect x="330" y="690" width="336" height="22" rx="11" fill="#FFFFFF" opacity={0.6} />
      <Rect x="330" y="742" width="240" height="22" rx="11" fill="#FFFFFF" opacity={0.38} />
    </Svg>
  );

  if (!withWordmark) return mark;

  return (
    <View style={styles.row}>
      {mark}
      <View style={styles.textBlock}>
        <Text style={styles.wordmark}>{wordmark}</Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textBlock: { flexShrink: 1 },
  wordmark: { color: palette.white, fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  tagline: { color: palette.muted, fontSize: 13, marginTop: 2 },
});

export default PdfBrandMark;
