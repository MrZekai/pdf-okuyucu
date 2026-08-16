import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { t } from '@/constants/i18n';
import { palette } from '@/constants/theme';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Root-level guard. Any unexpected render error is caught here so the whole app
 * shows a recoverable fallback instead of a hard crash. Uses the module-level
 * translator because it may render outside AppProvider.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <View style={styles.icon}><AppIcon name="info" size={34} color={palette.danger} /></View>
        <Text style={styles.title}>{t('errorBoundary.title')}</Text>
        <Text style={styles.text}>{t('errorBoundary.text')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('errorBoundary.retry')} onPress={this.reset} style={styles.button}>
          <Text style={styles.buttonText}>{t('errorBoundary.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(248,113,113,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.white, fontSize: 18, fontWeight: '800', marginTop: 6 },
  text: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  button: { backgroundColor: palette.royal, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 13, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '800' }
});
