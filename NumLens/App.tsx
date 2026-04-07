import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { Camera, useCameraDevices, CameraProps } from 'react-native-vision-camera';
import { CameraOverlay } from './src/components/CameraOverlay';
import { useNumLensOCR, OCRProcessor } from './src/modules/ocr/OCRProcessor';
import { shareResult } from './src/modules/social/ViralHook';
import { PaymentProvider } from './src/modules/payments/PaymentProvider';
import { TrialManager } from './src/modules/trial/TrialManager';
import { PaywallScreen } from './src/screens/PaywallScreen';

/**
 * NumLens Main Entry Point
 * 🏢 Jeff Bezos (Sangmu) - Orchestration
 * 🛠️ John Carmack - Performance Core
 * 🎨 Jony Ive - Minimal UI
 */
export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const devices = useCameraDevices();
  const device = devices.back;

  const { handleFrame } = useNumLensOCR();

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  if (!hasPermission) return <Text>Camera permission is required.</Text>;
  if (device == null) return <Text>Loading camera...</Text>;

  const handleCalculate = async (newResult: string) => {
    const hasAccess = await TrialManager.checkAccess();
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }
    setResult(newResult);
    await TrialManager.incrementTrial();
  };

  if (showPaywall) {
    return (
      <PaywallScreen 
        onClose={() => setShowPaywall(false)}
        onSubscribe={async () => {
          const success = await PaymentProvider.requestPayment('Subscription');
          if (success) {
            await TrialManager.setSubscribed(true);
            setShowPaywall(false);
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        // Carmack says: Native Frame Processor for 0.05s latency
        frameProcessor={handleFrame}
        frameProcessorFps={30}
      />
      
      <CameraOverlay 
        result={result}
        onShare={() => shareResult(result || "0")}
        onPay={() => PaymentProvider.requestPayment('Subscription')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
