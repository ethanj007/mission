import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, ScrollView, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../components/Theme';

export default function HomeScreen({ onSelectRole }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Card pop-in scale animations
  const duduScale = useRef(new Animated.Value(1)).current;
  const bubuScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handlePressIn = (scaleVar) => {
    Animated.spring(scaleVar, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scaleVar) => {
    Animated.spring(scaleVar, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.subtitle}>Welcome to</Text>
          <Text style={styles.title}>Mission Bubu</Text>
        </Animated.View>

        {/* Roles Cards */}
        <Animated.View style={[styles.cardsContainer, { opacity: fadeAnim }]}>
          
          {/* Dudu Card (Admin) */}
          <Animated.View style={{ transform: [{ scale: duduScale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={() => handlePressIn(duduScale)}
              onPressOut={() => handlePressOut(duduScale)}
              onPress={() => onSelectRole('dudu')}
              style={[styles.card, styles.duduCard]}
            >
              <View style={styles.characterWrapper}>
                <Image
                  source={require('../../assets/gif6.gif')}
                  style={{ width: 110, height: 110, borderRadius: BORDER_RADIUS.medium }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.cardInfo}>
                <View style={[styles.badge, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: COLORS.primaryDark }]}>Mentor Mode</Text>
                </View>
                <Text style={styles.cardTitle}>Dudu 🟣</Text>
                <Text style={styles.cardDescription}>
                  Create daily missions, assign tasks, and monitor Bubu's progress. (Password required)
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Bubu Card (Student) */}
          <Animated.View style={{ transform: [{ scale: bubuScale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={() => handlePressIn(bubuScale)}
              onPressOut={() => handlePressOut(bubuScale)}
              onPress={() => onSelectRole('bubu')}
              style={[styles.card, styles.bubuCard]}
            >
              <View style={styles.characterWrapper}>
                <Image
                  source={require('../../assets/gif7.gif')}
                  style={{ width: 110, height: 110, borderRadius: BORDER_RADIUS.medium }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.cardInfo}>
                <View style={[styles.badge, { backgroundColor: COLORS.successLight }]}>
                  <Text style={[styles.badgeText, { color: COLORS.successDark }]}>Student Mode</Text>
                </View>
                <Text style={styles.cardTitle}>Bubu 🟢</Text>
                <Text style={styles.cardDescription}>
                  View today's mission, mark tasks completed, and maintain your daily streak!
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: SPACING.xs,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
  },
  cardsContainer: {
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 2,
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  duduCard: {
    borderColor: COLORS.primaryLight,
  },
  bubuCard: {
    borderColor: COLORS.successLight,
  },
  characterWrapper: {
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
  },
  cardInfo: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.small,
    marginBottom: SPACING.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
});
