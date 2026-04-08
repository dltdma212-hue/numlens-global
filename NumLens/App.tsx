import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { CameraOverlay } from './src/components/CameraOverlay';
import { HighlightOverlay } from './src/components/HighlightOverlay';
import { EditModal } from './src/components/EditModal';
import { OCRBlock, SumMode, OCRProcessor } from './src/modules/ocr/OCRProcessor';
import { shareResult } from './src/modules/social/ViralHook';
import { PaymentProvider } from './src/modules/payments/PaymentProvider';
import { TrialManager } from './src/modules/trial/TrialManager';
import { PaywallScreen } from './src/screens/PaywallScreen';

export default function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [result, setResult] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  
  // OCR Tracking States
  const [ocrBlocks, setOcrBlocks] = useState<OCRBlock[]>([]);
  const [sumMode, setSumMode] = useState<SumMode>('vertical');
  const [selectedBlock, setSelectedBlock] = useState<OCRBlock | null>(null);

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

  const handleBlockTouch = (block: OCRBlock) => {
    setSelectedBlock(block); // 해당 형광펜 블록을 누르면 모달 띄움
  };

  const handleSaveEdit = (newText: string) => {
    if (selectedBlock) {
      // 강제 필터링 엔진을 한 번 태워서 넣음
      const { value } = OCRProcessor.cleanAndExtractValue(newText);
      const updatedValue = value || 0;
      
      setOcrBlocks(prev => 
        prev.map(b => b.id === selectedBlock.id 
          ? { ...b, text: newText, value: updatedValue, isUncertain: false } // 수정한 것은 확신(certain) 처리
          : b
        )
      );
    }
    setSelectedBlock(null);
  };

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        torch={torch}
      />
      <HighlightOverlay 
        blocks={ocrBlocks}
        onBlockTouch={handleBlockTouch}
      />
      <CameraOverlay
        result={result}
        torch={torch}
        sumMode={sumMode}
        onToggleTorch={() => setTorch(t => t === 'on' ? 'off' : 'on')}
        onToggleSumMode={() => setSumMode(m => m === 'vertical' ? 'horizontal' : 'vertical')}
        onShare={() => shareResult(result || '0')}
        onPay={() => PaymentProvider.requestPayment('Subscription')}
      />
      
      <EditModal
        visible={!!selectedBlock}
        block={selectedBlock}
        onSave={handleSaveEdit}
        onClose={() => setSelectedBlock(null)}
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
