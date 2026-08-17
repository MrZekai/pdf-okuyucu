import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { palette } from '@/constants/theme';

export function UrlModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (url: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!value.trim()) return;
    setBusy(true); setError('');
    try {
      await onSubmit(value.trim());
      setValue(''); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('url.error'));
    } finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}/>
        <View style={styles.card}>
          <View style={styles.head}><View style={styles.icon}><AppIcon name="link" color={palette.cyan}/></View><View style={{ flex: 1 }}><Text style={styles.title}>{t('url.title')}</Text><Text style={styles.caption}>{t('url.caption')}</Text></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('a11y.close')}><AppIcon name="close" color={palette.muted}/></Pressable></View>
          <TextInput
            autoCapitalize="none" autoCorrect={false} keyboardType="url" value={value} onChangeText={setValue}
            placeholder={t('url.placeholder')} placeholderTextColor="#64748B" style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}>
            {busy ? <ActivityIndicator color="#fff"/> : <><AppIcon name="download" size={19}/><Text style={styles.buttonText}>{t('url.submit')}</Text></>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,3,4,0.82)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: palette.metal, borderRadius: 24, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: palette.redGlow, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.white, fontWeight: '800', fontSize: 18 },
  caption: { color: palette.muted, fontSize: 12, marginTop: 3 },
  input: { color: palette.white, backgroundColor: palette.ink, borderColor: palette.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 50, fontSize: 14 },
  error: { color: palette.danger, fontSize: 12 },
  button: { height: 50, borderRadius: 14, backgroundColor: palette.pdfRed, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' }
});
