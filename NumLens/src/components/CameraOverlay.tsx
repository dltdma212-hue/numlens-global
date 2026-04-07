import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { tokens } from '../theme/tokens';
import { LucideCamera, LucideShare2, LucideCreditCard } from 'lucide-react-native';

interface CameraOverlayProps {
  result: string | null;
  onShare: () => void;
  onPay: () => void;
}

/**
 * NumLens Camera Overly Component
 * Design Philosophy: Jony Ive Minimalist / Glassmorphism
 * Only essential elements. Floating results.
 */
export const CameraOverlay: React.FC<CameraOverlayProps> = ({ result, onShare, onPay }) => {
  return (
    <View style={styles.container}>
      {/* Top Bar for Monetization/Profile (Sheryl Sandberg) */}
      <View style={styles.topBar}>
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
        <View style={styles.shutterRing}>
           <LucideCamera color={tokens.colors.white} size={32} />
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
    padding: 10,
    backgroundColor: tokens.colors.glass,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: tokens.colors.glassBorder,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    backgroundColor: tokens.colors.glass,
    padding: 32,
    borderRadius: tokens.spacing.borderRadius,
    borderWidth: 1,
    borderColor: tokens.colors.glassBorder,
    alignItems: 'center',
    width: '80%',
    backdropFilter: 'blur(10px)', // For platforms supporting it
  },
  resultLabel: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.labelSize,
    letterSpacing: 2,
    marginBottom: 8,
  },
  resultValue: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.titleSize,
    fontWeight: tokens.typography.weightLight as any,
  },
  focusFrame: {
    width: 250,
    height: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  bottomBar: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: tokens.colors.white,
    backgroundColor: tokens.colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
