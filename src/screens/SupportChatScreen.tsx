import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Stack } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Alert, Spinner, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useBrand, useBrandColor } from '../brand/BrandProvider';
import { useSupportChat } from '../support/SupportChatProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 15_000;

type Pending = { uri: string; name: string; type: string; size: number };

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeOf(value: any) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayOf(value: any) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SupportChatScreen() {
  const { t } = usePreferences();
  const { top, bottom } = useSafeAreaInsets();
  const color = useBrandColor();
  const { supportTopics } = useBrand();
  const thread = useApi<any>('/me/support-chat');
  const support = useSupportChat();
  const scroll = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);
  const [body, setBody] = useState('');
  const bodyRef = useRef('');
  const sendingRef = useRef(false);
  const [files, setFiles] = useState<Pending[]>([]);
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => void thread.reload(true), POLL_MS);
    return () => clearInterval(timer);
  }, [thread.reload]);

  useEffect(() => {
    support.setChatOpen(true);
    return () => support.setChatOpen(false);
  }, [support.setChatOpen]);

  const messages: any[] = thread.data?.messages ?? [];
  const conversation = thread.data?.conversation;
  const hasOpen = conversation?.status === 'open';
  const showTopics = Boolean(thread.data) && !hasOpen && supportTopics.length > 0;

  useEffect(() => {
    if (messages.length) support.markSeen(Math.max(...messages.map((message) => message.id)));
  }, [messages.length]);

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length, showTopics]);

  const addFiles = (incoming: Pending[]) => {
    const next = [...files];
    let message = '';
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        message = t('You can attach up to 5 files');
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        message ||= t('Each attachment must be 10 MB or smaller');
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    setError(message);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    addFiles(result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    })));
  };

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: 'application/pdf' });
    if (result.canceled) return;
    addFiles(result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/pdf',
      size: asset.size ?? 0,
    })));
  };

  const send = async () => {
    const message = bodyRef.current.trim();
    if ((!message && !files.length) || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('body', message);
      if (!hasOpen && subject) form.append('subject', subject);
      files.forEach((file) => form.append('files', { uri: file.uri, name: file.name, type: file.type } as any));
      await api.postForm('/me/support-chat/messages', form);
      bodyRef.current = '';
      setBody('');
      setFiles([]);
      setSubject('');
      await thread.reload(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Request failed');
    }
    sendingRef.current = false;
    setSending(false);
  };

  const newTopic = async () => {
    setSubject('');
    try {
      await api.post(`/me/support-chat/${conversation.id}/close`);
      await thread.reload(true);
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Request failed');
    }
  };

  const download = async (attachment: any) => {
    setError('');
    try {
      const bytes = await api.getBytes(`/support-chat/attachments/${attachment.id}`);
      const safeName = String(attachment.name).replace(/[^\w.\-]+/g, '_');
      // The module's typings resolve to the DOM File here, so the native API is reached through a cast.
      const file = new File(Paths.cache, `${Date.now()}-${safeName}`) as any;
      await file.write(new Uint8Array(bytes));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri as string, { dialogTitle: attachment.name });
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Request failed');
    }
  };

  const online = Boolean(thread.data?.supportOnline);
  const title = hasOpen
    ? t(conversation.subject)
    : subject ? t(subject) : conversation ? t('New conversation') : t('General question');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background" style={{ paddingTop: top + 44 }}>
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Support chat') }} />
      <View className="flex-row items-center gap-3 border-b border-border px-5 pb-3 pt-2">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Ionicons color={color} name="headset-outline" size={24} />
          <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background" style={{ backgroundColor: online ? '#16a34a' : '#9ca3af' }} />
        </View>
        <View className="flex-1">
          <Text weight="semibold">{t('BankDash Support')}</Text>
          <Text size="xs" style={online ? { color: '#16a34a' } : undefined} muted={!online}>
            {online ? t('Support is online now') : t('Support is offline')}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2 bg-accent px-5 py-2">
        <Ionicons color={color} name="business-outline" size={16} />
        <Text className="flex-1" numberOfLines={1} size="sm" weight="medium">{title}</Text>
        {hasOpen ? <Text className="text-primary" onPress={newTopic} size="sm" weight="medium">{t('New topic')}</Text> : null}
      </View>

      <ScrollView contentContainerClassName="gap-2 px-5 py-4" keyboardShouldPersistTaps="handled" ref={scroll as any}>
        {thread.loading && !thread.data ? <View className="items-center py-10"><Spinner /></View> : null}
        {thread.error && !thread.data ? (
          <View className="items-center gap-2 py-6">
            <Text muted>{t(thread.error)}</Text>
            <Text className="text-primary" onPress={() => void thread.reload()}>{t('Try again')}</Text>
          </View>
        ) : null}
        {thread.data && messages.length === 0 ? (
          <Text className="py-6 text-center" size="sm" muted>{t('Send us a message and our team will reply here.')}</Text>
        ) : null}
        {messages.map((message, index) => {
          const own = message.senderRole === 'customer';
          const day = dayOf(message.createdAt);
          const showDay = day && day !== (index > 0 ? dayOf(messages[index - 1].createdAt) : null);
          return (
            <View className="gap-2" key={message.id}>
              {showDay ? <Text className="py-2 text-center" size="xs" muted>{day}</Text> : null}
              <View className={own ? 'items-end' : 'items-start'}>
                <View className={`max-w-[85%] gap-1 rounded-2xl px-3 py-2 ${own ? 'bg-primary' : 'bg-card'}`}>
                  {message.body ? <Text className={own ? 'text-white' : undefined} selectable>{message.body}</Text> : null}
                  {message.attachments?.map((attachment: any) => (
                    <Pressable className="flex-row items-center gap-2" key={attachment.id} onPress={() => void download(attachment)}>
                      <Ionicons color={own ? '#ffffff' : color} name="attach" size={18} />
                      <Text className={own ? 'flex-1 text-white' : 'flex-1'} numberOfLines={1} size="sm">
                        {`${attachment.name} · ${formatFileSize(attachment.sizeBytes)}`}
                      </Text>
                    </Pressable>
                  ))}
                  <Text className={`self-end ${own ? 'text-white' : ''}`} size="xs" muted={!own}>{timeOf(message.createdAt)}</Text>
                </View>
              </View>
            </View>
          );
        })}
        {showTopics ? (
          <View className="gap-2 pt-2">
            <Text size="sm" muted>
              {messages.length ? t('Start a new conversation. Choose a topic:') : t('Choose a topic for your question:')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {supportTopics.map((topic) => (
                <Pressable
                  className={`rounded-full border px-3 py-2 ${subject === topic ? 'border-primary bg-primary' : 'border-border bg-card'}`}
                  key={topic}
                  onPress={() => setSubject(subject === topic ? '' : topic)}
                >
                  <Text className={subject === topic ? 'text-white' : undefined} size="sm">{t(topic)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View className="gap-2 border-t border-border px-4 pt-2" style={{ paddingBottom: Math.max(bottom, 8) }}>
        <View className="flex-row items-center gap-1">
          <Ionicons color="#718ebf" name="shield-checkmark-outline" size={14} />
          <Text size="xs" muted>{t('Never share your password or verification codes.')}</Text>
        </View>
        {error ? <Alert variant="destructive"><Alert.Content><Alert.Description>{t(error)}</Alert.Description></Alert.Content></Alert> : null}
        {files.length ? (
          <View className="flex-row flex-wrap gap-2">
            {files.map((file, index) => (
              <Pressable
                className="flex-row items-center gap-1 rounded-full bg-accent px-3 py-1"
                key={`${file.uri}-${index}`}
                onPress={() => setFiles((current) => current.filter((_, i) => i !== index))}
              >
                <Text numberOfLines={1} size="xs">{`${file.name} · ${formatFileSize(file.size)}`}</Text>
                <Ionicons color="#718ebf" name="close" size={14} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View className="flex-row items-end gap-2">
          <Pressable accessibilityLabel={t('Attach files')} className="h-11 w-11 items-center justify-center" disabled={sending} onPress={pickImages}>
            <Ionicons color={color} name="image-outline" size={24} />
          </Pressable>
          <Pressable accessibilityLabel={t('Attach files')} className="h-11 w-11 items-center justify-center" disabled={sending} onPress={pickDocuments}>
            <Ionicons color={color} name="attach" size={26} />
          </Pressable>
          <TextInput
            accessibilityLabel={t('Message')}
            className="max-h-28 min-h-11 flex-1 rounded-2xl bg-accent px-4 py-3 text-foreground"
            maxLength={2000}
            multiline
            onChangeText={(text) => {
              bodyRef.current = text;
              setBody(text);
            }}
            placeholder={t('Write a message...')}
            placeholderTextColor="#718ebf"
            value={body}
          />
          <Pressable
            accessibilityLabel={t('Send message')}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            disabled={(!body.trim() && !files.length) || sending}
            hitSlop={8}
            onPressIn={() => void send()}
            style={{ opacity: (!body.trim() && !files.length) || sending ? 0.5 : 1 }}
          >
            {sending ? <Spinner /> : <Ionicons color="#ffffff" name="send" size={20} />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
