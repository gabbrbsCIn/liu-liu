import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { Button, Field, Label, T, Wordmark } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export default function Login() {
  const t = useTheme();
  const { server: saved, signIn } = useAuth();
  const [server, setServer] = useState(saved);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signIn(server, password);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, gap: 10 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <Wordmark size={40} />
          <T c="fg-2">Seu dinheiro, numa conversa.</T>
        </View>
        <Label>Servidor</Label>
        <Field value={server} onChangeText={setServer} placeholder="liuliu.vercel.app" autoCapitalize="none" autoCorrect={false} keyboardType="url" textContentType="URL" />
        <Label style={{ marginTop: 8 }}>Senha</Label>
        <Field value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
        {err && <T c="neg" accessibilityRole="alert">{err}</T>}
        <Button title={busy ? 'Entrando…' : 'Entrar'} kind="primary" loading={busy} onPress={submit} disabled={!password || !server} style={{ marginTop: 10 }} />
        <T c="fg-3" size={12} center style={{ marginTop: 12 }}>O endereço é o do seu liu liu na Vercel. A senha é a APP_PASSWORD de lá.</T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
