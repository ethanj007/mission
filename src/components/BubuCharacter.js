import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Text } from 'react-native';
import Svg, { Circle, Path, Ellipse, G, Rect } from 'react-native-svg';
import { COLORS } from './Theme';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function BubuCharacter({ state = 'sleepy', size = 120 }) {
  // Animation drivers
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const armAnim = useRef(new Animated.Value(0)).current;
  const zzzAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Idle Breathing Animation (looping)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: state === 'sleepy' ? 2000 : 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: state === 'sleepy' ? 2000 : 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Blink Animation (periodic timer)
    const blinkInterval = setInterval(() => {
      if (state !== 'sleepy') {
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 4000);

    // 3. State-specific animations
    if (state === 'excited' || state === 'celebration') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -15,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(100),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(armAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(armAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'focused') {
      // Small bobbing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -4,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'sleepy') {
      // Floating ZZZ animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(zzzAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(zzzAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // reset
      bounceAnim.setValue(0);
      armAnim.setValue(0);
      zzzAnim.setValue(0);
    }

    return () => {
      clearInterval(blinkInterval);
    };
  }, [state, breatheAnim, blinkAnim, bounceAnim, armAnim, zzzAnim]);

  // Interpolations
  const scaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const scaleX = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const headMoveY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.5],
  });

  const leftArmRotate = armAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg'],
  });

  const rightArmRotate = armAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const zzzTranslateY = zzzAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -25],
  });

  const zzzOpacity = zzzAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const zzzScale = zzzAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.2],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Floating ZZZ for sleepy Bubu */}
      {state === 'sleepy' && (
        <Animated.View
          style={[
            styles.zzzContainer,
            {
              transform: [
                { translateY: zzzTranslateY },
                { scale: zzzScale },
              ],
              opacity: zzzOpacity,
            },
          ]}
        >
          <Text style={styles.zzzText}>Zzz...</Text>
        </Animated.View>
      )}

      <Animated.View
        style={{
          transform: [
            { translateY: bounceAnim },
          ],
        }}
      >
        <Svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
        >
          {/* Shadow */}
          <Ellipse cx="50" cy="88" rx="30" ry="6" fill="#000000" fillOpacity="0.06" />

          {/* Body */}
          <AnimatedG
            style={{
              transform: [
                { scaleX: scaleX },
                { scaleY: scaleY },
              ],
            }}
          >
            {/* Chubby White Body */}
            <Rect x="28" y="55" width="44" height="30" rx="18" fill={COLORS.white} stroke="#D4D0E3" strokeWidth="2" />
            
            {/* Little belly */}
            <Ellipse cx="50" cy="72" rx="14" ry="10" fill="#F6F5FC" />
            
            {/* Left Foot */}
            <Circle cx="33" cy="83" r="7" fill={COLORS.white} stroke="#D4D0E3" strokeWidth="2" />
            <Circle cx="33" cy="83" r="4" fill="#F0EEF8" />
            
            {/* Right Foot */}
            <Circle cx="67" cy="83" r="7" fill={COLORS.white} stroke="#D4D0E3" strokeWidth="2" />
            <Circle cx="67" cy="83" r="4" fill="#F0EEF8" />
          </AnimatedG>

          {/* Left Arm */}
          <AnimatedG
            style={{
              transform: [
                { translateX: 28 },
                { translateY: 63 },
                { rotate: state === 'celebration' || state === 'excited' ? leftArmRotate : '0deg' },
                { translateX: -28 },
                { translateY: -63 },
              ],
            }}
          >
            <Path
              d="M18,63 C18,57 28,57 28,63 C28,69 18,69 18,63 Z"
              fill={COLORS.white}
              stroke="#D4D0E3"
              strokeWidth="2"
            />
          </AnimatedG>

          {/* Right Arm */}
          <AnimatedG
            style={{
              transform: [
                { translateX: 72 },
                { translateY: 63 },
                { rotate: state === 'celebration' || state === 'excited' ? rightArmRotate : '0deg' },
                { translateX: -72 },
                { translateY: -63 },
              ],
            }}
          >
            {state === 'focused' ? (
              // Holding a book or study pencil
              <G>
                <Path
                  d="M72,63 C72,57 82,57 82,63 C82,69 72,69 72,63 Z"
                  fill={COLORS.white}
                  stroke="#D4D0E3"
                  strokeWidth="2"
                />
                {/* Pencil */}
                <Rect x="74" y="52" width="4" height="12" rx="1" fill="#F4D35E" rotate="25" />
                <Path d="M74,52 L76,48 L78,52 Z" fill="#F49097" />
              </G>
            ) : (
              <Path
                d="M72,63 C72,57 82,57 82,63 C82,69 72,69 72,63 Z"
                fill={COLORS.white}
                stroke="#D4D0E3"
                strokeWidth="2"
              />
            )}
          </AnimatedG>

          {/* Head & Ears */}
          <AnimatedG
            style={{
              transform: [
                { translateY: headMoveY },
              ],
            }}
          >
            {/* Left Ear */}
            <Circle cx="26" cy="24" r="9" fill={COLORS.white} stroke="#D4D0E3" strokeWidth="2" />
            <Circle cx="26" cy="24" r="5" fill="#FFD1D1" /> {/* Soft pink inner ear */}

            {/* Right Ear */}
            <Circle cx="74" cy="24" r="9" fill={COLORS.white} stroke="#D4D0E3" strokeWidth="2" />
            <Circle cx="74" cy="24" r="5" fill="#FFD1D1" />

            {/* Main Head */}
            <Circle cx="50" cy="38" r="28" fill={COLORS.white} stroke="#D4D0E3" strokeWidth="2" />

            {/* Blush */}
            <Ellipse cx="30" cy="46" rx="4" ry="2.5" fill="#FFA5A5" fillOpacity="0.6" />
            <Ellipse cx="70" cy="46" rx="4" ry="2.5" fill="#FFA5A5" fillOpacity="0.6" />

            {/* Eyes */}
            {state === 'sleepy' ? (
              // Sleeping curved eyes (^^ but pointing down)
              <G>
                <Path d="M33,39 Q37,42 41,39" fill="none" stroke="#2D283E" strokeWidth="2" strokeLinecap="round" />
                <Path d="M59,39 Q63,42 67,39" fill="none" stroke="#2D283E" strokeWidth="2" strokeLinecap="round" />
              </G>
            ) : state === 'excited' || state === 'celebration' ? (
              // Excited/Happy curved eyes (^^)
              <G>
                <Path d="M33,40 Q37,36 41,40" fill="none" stroke="#2D283E" strokeWidth="2.5" strokeLinecap="round" />
                <Path d="M59,40 Q63,36 67,40" fill="none" stroke="#2D283E" strokeWidth="2.5" strokeLinecap="round" />
              </G>
            ) : (
              // Standard blinking/focused eyes
              <G>
                <AnimatedG style={{ transform: [{ scaleY: blinkAnim }] }}>
                  <Circle cx="37" cy="38" r="3.2" fill="#2D283E" />
                </AnimatedG>
                <AnimatedG style={{ transform: [{ scaleY: blinkAnim }] }}>
                  <Circle cx="63" cy="38" r="3.2" fill="#2D283E" />
                </AnimatedG>
                {/* Cute white reflection dots in eyes */}
                <Circle cx="36" cy="37" r="1" fill={COLORS.white} />
                <Circle cx="62" cy="37" r="1" fill={COLORS.white} />
              </G>
            )}

            {/* Nose & Snout */}
            <Ellipse cx="50" cy="45" rx="5" ry="3.5" fill="#F5F4FA" />
            <Path d="M48,44 Q50,42 52,44" fill="none" stroke="#2D283E" strokeWidth="1.5" strokeLinecap="round" />
            {state === 'sleepy' ? (
              // Small sleepy mouth
              <Circle cx="50" cy="48" r="1.5" fill="#2D283E" />
            ) : (
              // Bubu cute cat-mouth (w)
              <Path
                d="M48,46.5 Q49.5,48 50,46.5 Q50.5,48 52,46.5"
                fill="none"
                stroke="#2D283E"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}

            {/* Glasses for focused Bubu */}
            {state === 'focused' && (
              <G>
                <Circle cx="37" cy="38" r="8" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
                <Circle cx="63" cy="38" r="8" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
                <Path d="M45,38 L55,38" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
              </G>
            )}
          </AnimatedG>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  zzzContainer: {
    position: 'absolute',
    top: -15,
    right: 5,
    zIndex: 10,
    backgroundColor: '#EAE6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7BDFF',
  },
  zzzText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7A6BC7',
  },
});
