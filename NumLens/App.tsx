import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition } from 'react-native-vision-camera-text-recognition';
import { runOnJS } from 'react-native-reanimated';
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

  // Edit Mode Flag: 수동 수정 모달이 팝업되면 카메라 실시간 업데이트를 일시중단함.
  const isEditing = !!selectedBlock;

  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Google ML Kit Text Recognition Hook (Latin 랭귀지 지정으로 한글 배제, 숫자 초정밀 타게팅)
  const { scanText } = useTextRecognition({ language: 'latin' });

  // 메인 UI 쓰레드로 데이터 쏘기
  const handleRecognizedData = (data: any) => {
    if (isEditing) return; // 수정 중일 때 결과 교란 방지

    const blocks = data?.blocks || [];
    const parsedBlocks = OCRProcessor.processBlocks(blocks, sumMode);
    
    setOcrBlocks(parsedBlocks);
    setResult(OCRProcessor.calculateTotalSum(parsedBlocks).toString());
  };

  // 백그라운드 프레임 프로세서 (매 60fps 마다 On-Device 연산)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const textData = scanText(frame);
    runOnJS(handleRecognizedData)(textData);
  }, [scanText, isEditing, sumMode]);

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
        isActive={!isEditing} // 수정 중에는 카메라 프레임 홀드
        torch={torch}
        frameProcessor={frameProcessor}
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
