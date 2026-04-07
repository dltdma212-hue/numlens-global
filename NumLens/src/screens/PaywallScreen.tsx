import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { tokens } from '../theme/tokens';
import { LucideCheckCircle, LucideX } from 'lucide-react-native';

interface PaywallScreenProps {
  onClose: () => void;
  onSubscribe: () => void;
}

/**
 * NumLens Paywall Screen
 * Design: Jony Ive Minimalism
 * Strategy: Sheryl Sandberg Profit Focus
 */
export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onClose, onSubscribe }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <LucideX color={tokens.colors.white} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>NUM LENS PREMIUM</Text>
        <Text style={styles.title}>Unlock Infinite{"\n"}Calculations</Text>
        
        <View style={styles.features}>
          <FeatureItem text="Unlimited Real-time OCR" />
          <FeatureItem text="Advanced Math Constants" />
          <FeatureItem text="Ad-free Experience" />
          <FeatureItem text="Priority 0.01s Processing" />
        </View>

        <View style={styles.pricingCard}>
          <Text style={styles.price}>$4.99</Text>
          <Text style={styles.period}>per month</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.subscribeButton} onPress={onSubscribe}>
          <Text style={styles.buttonText}>Start Subscription</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Cancel anytime. Secure payment via PayPal.</Text>
      </View>
    </View>
  );
};

const FeatureItem = ({ text }: { text: string }) => (
  <View style={styles.featureItem}>
    <LucideCheckCircle color={tokens.colors.accent} size={20} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.black,
    padding: tokens.spacing.padding,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 40,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  eyebrow: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.labelSize,
    fontWeight: tokens.typography.weightBold as any,
    letterSpacing: 3,
    marginBottom: 16,
  },
  title: {
    color: tokens.colors.white,
    fontSize: 40,
    fontWeight: tokens.typography.weightLight as any,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 48,
  },
  features: {
    width: '100%',
    gap: 16,
    marginBottom: 60,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: tokens.colors.textSecondary,
    fontSize: 16,
  },
  pricingCard: {
    backgroundColor: tokens.colors.glass,
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.colors.glassBorder,
    alignItems: 'center',
  },
  price: {
    color: tokens.colors.white,
    fontSize: 32,
    fontWeight: tokens.typography.weightBold as any,
  },
  period: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  subscribeButton: {
    backgroundColor: tokens.colors.white,
    width: '100%',
    padding: 20,
    borderRadius: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: tokens.colors.black,
    fontSize: 18,
    fontWeight: tokens.typography.weightBold as any,
  },
  footerNote: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  }
});
