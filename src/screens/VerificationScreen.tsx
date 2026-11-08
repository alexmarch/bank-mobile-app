import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Label, Select, Text } from 'panelui-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { PrimaryButton, TextField } from '../components/fields';
import Screen from '../components/Screen';
import { usePreferences } from '../preferences/PreferencesProvider';

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'ID card' },
  { value: 'driver_license', label: 'Driver license' },
];
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type Photo = { uri: string; type: string };

function PhotoPicker({ label, hint, photo, error, onPick }: {
  label: string;
  hint: string;
  photo: Photo | null;
  error?: string;
  onPick: (asset: ImagePicker.ImagePickerAsset) => void;
}) {
  const { t } = usePreferences();

  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) onPick(result.assets[0]);
  };

  return (
    <View className="gap-2">
      <Label>{t(label)}</Label>
      <Pressable
        className="h-44 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card px-4"
        onPress={choose}
      >
        {photo ? (
          <Image resizeMode="cover" source={{ uri: photo.uri }} style={{ height: '100%', width: '100%' }} />
        ) : (
          <View className="items-center gap-2">
            <Ionicons color="#718ebf" name="cloud-upload-outline" size={32} />
            <Text className="text-center" size="sm" muted>{t(hint)}</Text>
          </View>
        )}
      </Pressable>
      {error ? <Text className="text-destructive" size="sm">{t(error)}</Text> : null}
    </View>
  );
}

function StatusCard({ icon, color, title, text }: { icon: any; color: string; title: string; text: string }) {
  return (
    <View className="flex-row items-start gap-3 rounded-2xl bg-card p-4">
      <Ionicons color={color} name={icon} size={28} />
      <View className="flex-1 gap-1">
        <Text weight="semibold">{title}</Text>
        <Text size="sm" muted>{text}</Text>
      </View>
    </View>
  );
}

function VerificationForm({ rejectionReason, onDone }: { rejectionReason?: string; onDone: () => void }) {
  const { t } = usePreferences();
  const [form, setForm] = useState({ documentType: 'passport', documentNumber: '', country: '' });
  const [photos, setPhotos] = useState<{ document: Photo | null; selfie: Photo | null }>({ document: null, selfie: null });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (name: 'document' | 'selfie') => (asset: ImagePicker.ImagePickerAsset) => {
    const type = asset.mimeType ?? 'image/jpeg';
    if (!IMAGE_TYPES.includes(type)) return setErrors((c) => ({ ...c, [name]: 'Use a PNG, JPEG or WebP image' }));
    if (asset.fileSize && asset.fileSize > MAX_BYTES) return setErrors((c) => ({ ...c, [name]: 'The file is larger than 5 MB' }));
    setErrors((c) => ({ ...c, [name]: undefined }));
    setPhotos((c) => ({ ...c, [name]: { uri: asset.uri, type } }));
  };

  const ready = form.documentNumber.trim().length >= 4 && form.country.trim().length >= 2 && photos.document && photos.selfie;

  const upload = async (photo: Photo) => {
    const blob = await (await fetch(photo.uri)).blob();
    return api.upload('/me/kyc/files', blob.type ? blob : new Blob([blob], { type: photo.type }));
  };

  const submit = async () => {
    if (!ready || !photos.document || !photos.selfie) return;
    setBusy(true);
    setError('');
    try {
      const [document, selfie] = await Promise.all([upload(photos.document), upload(photos.selfie)]);
      await api.post('/me/kyc', { ...form, documentFile: document.file, selfieFile: selfie.file });
      onDone();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-4">
      {rejectionReason ? (
        <Alert variant="destructive">
          <Alert.Content><Alert.Description>{`${t('Your previous request was rejected')}: ${rejectionReason}`}</Alert.Description></Alert.Content>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <Alert.Content><Alert.Description>{t(error)}</Alert.Description></Alert.Content>
        </Alert>
      ) : null}
      <View className="gap-2">
        <Label>{t('Document type')}</Label>
        <Select
          onValueChange={(value) => setForm((c) => ({ ...c, documentType: value }))}
          presentation="overlay"
          title={t('Document type')}
          value={form.documentType}
        >
          {DOCUMENT_TYPES.map((item) => <Select.Item key={item.value} label={t(item.label)} value={item.value} />)}
        </Select>
      </View>
      <TextField
        label={t('Document number')}
        maxLength={40}
        onChangeText={(value) => setForm((c) => ({ ...c, documentNumber: value }))}
        value={form.documentNumber}
      />
      <TextField
        label={t('Issuing country')}
        maxLength={60}
        onChangeText={(value) => setForm((c) => ({ ...c, country: value }))}
        value={form.country}
      />
      <PhotoPicker error={errors.document} hint="Tap to upload a photo of your document" label="Document photo" onPick={pick('document')} photo={photos.document} />
      <PhotoPicker error={errors.selfie} hint="Tap to upload a selfie holding your document" label="Selfie with document" onPick={pick('selfie')} photo={photos.selfie} />
      <Text size="sm" muted>{t('PNG, JPEG or WebP, up to 5 MB. Your documents are stored securely and are only visible to bank staff.')}</Text>
      <PrimaryButton disabled={!ready || busy} onPress={submit}>{busy ? t('Uploading...') : t('Submit for review')}</PrimaryButton>
    </View>
  );
}

export default function VerificationScreen() {
  const { t } = usePreferences();
  const { top } = useSafeAreaInsets();
  const { data, error, loading, refresh, reload } = useApi<any>('/me/kyc');

  return (
    <Screen
      error={error}
      icon="shield-checkmark-outline"
      loading={loading && !data}
      onRefresh={refresh}
      refreshing={false}
      title={t('Identity verification (KYC)')}
      topPadding={top + 44}
    >
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Verification') }} />
      {data?.status === 'approved' ? (
        <StatusCard color="#16a34a" icon="checkmark-circle" text={t('Your identity has been verified. Thank you!')} title={t('Identity verified')} />
      ) : null}
      {data?.status === 'pending' ? (
        <StatusCard color="#2d60ff" icon="hourglass-outline" text={t('Your documents are being reviewed. We will notify you once the check is complete.')} title={t('Verification in progress')} />
      ) : null}
      {data?.status === 'not_started' || data?.status === 'rejected' ? (
        <>
          <Text size="sm" muted>
            {t('To comply with banking regulations we need to confirm your identity. Upload a valid document and a selfie.')}
          </Text>
          <VerificationForm onDone={() => void reload(true)} rejectionReason={data.rejectionReason} />
        </>
      ) : null}
    </Screen>
  );
}
