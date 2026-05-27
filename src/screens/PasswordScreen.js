import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import DuduCharacter from '../components/DuduCharacter';
import { getPassword } from '../storage';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../components/Theme';

export default function PasswordScreen({ onSuccess, onBack }) {
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [duduState, setDuduState] = useState('idle');
  
  // Animation for shaking PIN dots on error
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Read local password
    const loadPassword = async () => {
      const stored = await getPassword();
      setCorrectPin(stored);
    };
    loadPassword();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Shake animation trigger
  const triggerShake = () => {
    setDuduState('nodding');
    setErrorMsg('Incorrect Password! Try again 🧸');
    
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setPin('');
      setDuduState('idle');
    });
  };

  const handleKeyPress = (num) => {
    if (pin.length >= 4) return;
    setErrorMsg('');
    const newPin = pin + num;
    setPin(newPin);

    // If it reaches 4, check validation
    if (newPin.length === 4) {
      if (newPin === correctPin) {
        setDuduState('nodding');
        setTimeout(() => {
          onSuccess();
        }, 300);
      } else {
        setTimeout(() => {
          triggerShake();
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const renderKey = (num) => (
    <TouchableOpacity
      key={num}
      onPress={() => handleKeyPress(num)}
      style={styles.keypadButton}
      activeOpacity={0.7}
    >
      <Text style={styles.keypadText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Roles</Text>
        </TouchableOpacity>

        {/* Mascot */}
        <View style={styles.mascotContainer}>
          <Image
            source={require('../../assets/gif9.gif')}
            style={{ width: 140, height: 140, borderRadius: BORDER_RADIUS.medium }}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Dudu Verification</Text>
        <Text style={styles.subtitle}>Enter passcode to enter mentor dashboard</Text>

        {/* Passcode dots container */}
        <Animated.View 
          style={[
            styles.dotsContainer, 
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                pin.length > index && styles.dotFilled
              ]}
            />
          ))}
        </Animated.View>

        {/* Error text */}
        <View style={styles.errorContainer}>
          {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}
        </View>

        {/* Custom keypad */}
        <View style={styles.keypadContainer}>
          <View style={styles.row}>
            {['1', '2', '3'].map(renderKey)}
          </View>
          <View style={styles.row}>
            {['4', '5', '6'].map(renderKey)}
          </View>
          <View style={styles.row}>
            {['7', '8', '9'].map(renderKey)}
          </View>
          <View style={styles.row}>
            {/* Blank placeholder */}
            <View style={styles.keypadButtonEmpty} />
            {renderKey('0')}
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.keypadButton, styles.deleteButton]}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  innerContainer: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.lg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  mascotContainer: {
    marginBottom: SPACING.md,
    height: 140,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
    height: 24,
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.card,
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  errorContainer: {
    height: 24,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 280,
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  keypadButton: {
    flex: 1,
    aspectRatio: 1.4,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.inner,
  },
  keypadButtonEmpty: {
    flex: 1,
    aspectRatio: 1.4,
  },
  keypadText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  deleteButton: {
    backgroundColor: COLORS.dangerLight,
    borderColor: '#FFD5D7',
  },
  deleteText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
