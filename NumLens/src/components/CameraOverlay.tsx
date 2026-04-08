import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { tokens } from '../theme/tokens';
import { LucideCamera, LucideShare2, LucideCreditCard, LucideFlashlight, LucideFlashlightOff, ArrowDownCircle, ArrowRightCircle } from 'lucide-react-native';
import { SumMode } from '../modules/ocr/OCRProcessor';

interface CameraOverlayProps {
  result: string | null;
  torch: 'on' | 'off';
  sumMode: SumMode;
  onToggleTorch: () => void;
  onToggleSumMode: () => void;
  onShare: () => void;
  onPay: () => void;
}

/**
 * NumLens Camera Overly Component
 * Design Philosophy: Jony Ive Minimalist / Glassmorphism
 * Only essential elements. Floating results.
 */
export const CameraOverlay: React.FC<CameraOverlayProps> = ({ result, torch, sumMode, onToggleTorch, onToggleSumMode, onShare, onPay }) => {
  return (
    <View style={styles.container}>
      {/* Top Bar for Monetization/Profile/Utility */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onToggleTorch} style={[styles.iconButton, torch === 'on' && styles.iconButtonActive]}>
          {torch === 'on' ? (
            <LucideFlashlight color="#000000" size={24} />
          ) : (
            <LucideFlashlightOff color={tokens.colors.white} size={24} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onPay} style={styles.iconButton}>
          <LucideCreditCard color={tokens.colors.white} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={styles.iconButton}>
          <LucideShare2 color={tokens.colors.white} size={24} />
        </TouchableOpacity>
      </View>

      {/* Main Result Display (Jony Ive) */}
      <View style={styles.centerStage}>
        {result ? (
          <View style={styles.glassCard}>
            <Text style={styles.resultLabel}>RESULT</Text>
            <Text style={styles.resultValue}>{result}</Text>
          </View>
        ) : (
          <View style={styles.focusFrame}>
             {/* Invisible but functional focus area */}
          </View>
        )}
      </View>

      {/* Bottom Bar: Action Capture (GaryVee) */}
      <View style={styles.bottomBar}>
        
        {/* Toggle Mode Button (Horizontal vs Vertical Sum) */}
        <TouchableOpacity onPress={onToggleSumMode} style={styles.toggleModeButton}>
           {sumMode === 'vertical' ? (
              <>
                 <ArrowDownCircle color="#FFCC00" size={24} />
                 <Text style={styles.toggleModeText}>⬇️ 세로(열) 강제더하기</Text>
              </>
           ) : (
              <>
                 <ArrowRightCircle color="#FFCC00" size={24} />
                 <Text style={styles.toggleModeText}>➡️ 가로(행) 강제더하기</Text>
              </>
           )}
        </TouchableOpacity>

        <View style={styles.shutterRing}>
           <LucideCamera color="#000000" size={32} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: tokens.spacing.padding,
    justifyContent: 'space-between',
    backgroundColor: 'transparent', // Camera is underneath
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 40,
  },
  iconButton: {
    padding: 12,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButtonActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    alignItems: 'center',
    width: '85%',
  },
  resultLabel: {
    color: '#888888',
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  resultValue: {
    color: '#FFCC00', // DeWalt Accent
    fontSize: 56, // Massive intuitive font
    fontWeight: '900',
  },
  focusFrame: {
    width: 280,
    height: 180,
    borderWidth: 4,
    borderColor: '#FFCC00', // Solid Accent Frame
    borderRadius: 12,
    borderStyle: 'solid',
    backgroundColor: 'rgba(255, 204, 0, 0.05)', // Extremely faint yellow tint inside
  },
  bottomBar: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shutterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    borderColor: '#333333',
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  toggleModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  toggleModeText: {
    color: '#FFCC00',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
