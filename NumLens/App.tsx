import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { CameraOverlay } from './src/components/CameraOverlay';
import { shareResult } from './src/modules/social/ViralHook';
import { PaymentProvider } from './src/modules/payments/PaymentProvider';
import { TrialManager } from './src/modules/trial/TrialManager';
import { PaywallScreen } from './src/screens/PaywallScreen';

export default function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [result, setResult] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [torch, setTorch] = useState<'on' | 'off'>('off');

  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleCalculate = async (newResult: string) => {
    const hasAccess = await TrialManager.checkAccess();
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }
    setResult(newResult);
    await TrialManager.incrementTrial();
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라 권한이 필요합니다.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라를 불러오는 중...</Text>
      </View>
    );
  }

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
        torch={torch}
      />
      <CameraOverlay
        result={result}
        torch={torch}
        onToggleTorch={() => setTorch(t => t === 'on' ? 'off' : 'on')}
        onShare={() => shareResult(result || '0')}
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
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});
