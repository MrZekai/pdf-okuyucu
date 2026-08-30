import { requireNativeView } from 'expo';
import React from 'react';
import { NativeSyntheticEvent, StyleSheet, ViewProps } from 'react-native';

/**
 * App owned wrapper around the KJExpoPdf native view.
 *
 * The wrapper shipped with @kishannareshpal/expo-pdf forwards a fixed list of
 * props, so the `page` prop added by plugins/withExpoPdfFixes for BUG-14 would
 * be dropped before it ever reached the native side. Talking to the registered
 * native view directly keeps that patch to the Kotlin sources only: no
 * JavaScript file inside node_modules has to be rewritten, and TypeScript sees
 * the real prop list without depending on patch ordering.
 *
 * Prop names, event names and the default background colour are identical to
 * the upstream wrapper, so rendering is unchanged.
 */

export type PdfContentPadding = { top?: number; right?: number; bottom?: number; left?: number };
export type PdfFitMode = 'width' | 'height' | 'both';
export type PdfErrorCode = 'invalid_uri' | 'invalid_document' | 'password_required' | 'password_incorrect';

export type PdfLoadCompletePayload = { pageCount: number };
export type PdfPageChangedPayload = { pageIndex: number; pageCount: number };
export type PdfErrorPayload = { code: PdfErrorCode; message: string };

type SharedProps = ViewProps & {
  uri: string;
  password?: string;
  /** Zero based logical page to jump to. Clearing it does not reload. */
  page?: number;
  pagingEnabled?: boolean;
  doubleTapToZoom?: boolean;
  horizontal?: boolean;
  pageGap?: number;
  contentPadding?: PdfContentPadding;
  fitMode?: PdfFitMode;
  autoScale?: boolean;
  pageColorInverted?: boolean;
};

type NativeProps = SharedProps & {
  onLoadComplete?: (event: NativeSyntheticEvent<PdfLoadCompletePayload>) => void;
  onPageChanged?: (event: NativeSyntheticEvent<PdfPageChangedPayload>) => void;
  onError?: (event: NativeSyntheticEvent<PdfErrorPayload>) => void;
};

export type PdfViewerProps = SharedProps & {
  onLoadComplete?: (payload: PdfLoadCompletePayload) => void;
  onPageChanged?: (payload: PdfPageChangedPayload) => void;
  onError?: (payload: PdfErrorPayload) => void;
};

const NativePdfView: React.ComponentType<NativeProps> = requireNativeView('KJExpoPdf');

function forward<T>(handler?: (payload: T) => void) {
  if (!handler) return undefined;
  return (event: NativeSyntheticEvent<T>) => { handler(event.nativeEvent); };
}

export function PdfViewer({ style, onLoadComplete, onPageChanged, onError, ...props }: PdfViewerProps) {
  return (
    <NativePdfView
      style={[styles.container, style]}
      uri={props.uri}
      password={props.password}
      page={props.page}
      doubleTapToZoom={props.doubleTapToZoom}
      horizontal={props.horizontal}
      pageGap={props.pageGap}
      pagingEnabled={props.pagingEnabled}
      contentPadding={props.contentPadding}
      fitMode={props.fitMode}
      autoScale={props.autoScale}
      pageColorInverted={props.pageColorInverted}
      onLoadComplete={forward(onLoadComplete)}
      onPageChanged={forward(onPageChanged)}
      onError={forward(onError)}
    />
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#eeeeee' }
});
