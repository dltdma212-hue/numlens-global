import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

/**
 * NumLens Social Viral Hook
 * GaryVee & Elon Musk's Attention Engine.
 * Triggers viral sharing loop.
 */
export async function shareResult(result: string) {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Error", "Sharing is not available on this platform");
    return;
  }

  try {
    const text = `Check out this crazy calculation I did with #NumLens in 0.01s! \n Result: ${result}`;
    // For real app, snapshot the UI (Ive's minimal UI) then share.
    // Here we share text for simplicity.
    await Sharing.shareAsync("", {
      dialogTitle: "Share to Instagram / X",
      UTI: "public.text",
      mimeType: "text/plain"
    });
  } catch (error) {
    console.error("Share failed", error);
  }
}
