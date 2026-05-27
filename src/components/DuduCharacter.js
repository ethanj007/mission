import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Text } from 'react-native';
import Svg, { Circle, Path, Ellipse, G, Rect } from 'react-native-svg';
import { COLORS } from './Theme';

const AnimatedG = Animated.createAnimatedComponent(G);

const DUDU_COLOR = '#A37E65'; // Soft warm teddy-bear brown
const DUDU_BORDER = '#876249';

export default function DuduCharacter({ state = 'idle', size = 120 }) {
  // Animation drivers
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const headAnim = useRef(new Animated.Value(0)).current;
  const armAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Idle Breathing Animation (looping)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Blink Animation (periodic timer)
    const blinkInterval = setInterval(() => {
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
    }, 4500);

    // 3. State-based Animations
    if (state === 'waving') {
      // Loop wave rotation
      Animated.loop(
        Animated.sequence([
          Animated.timing(armAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(armAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'writing') {
      // Small pencil shaking animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(armAnim, {
            toValue: 0.5,
            duration: 150,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(armAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Small head bob
      Animated.loop(
        Animated.sequence([
          Animated.timing(headAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(headAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'nodding') {
      // Happy nodding
      Animated.sequence([
        Animated.timing(headAnim, { toValue: 4, duration: 200, useNativeDriver: true }),
        Animated.timing(headAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(headAnim, { toValue: 4, duration: 200, useNativeDriver: true }),
        Animated.timing(headAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      // Reset animations
      armAnim.setValue(0);
      headAnim.setValue(0);
    }

    return () => {
      clearInterval(blinkInterval);
    };
  }, [state, breatheAnim, blinkAnim, armAnim, headAnim]);

  // Interpolations
  const bodyScaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const bodyScaleX = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  const headMoveY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const finalHeadY = Animated.add(headMoveY, headAnim);

  const waveRotate = armAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '-60deg'],
  });

  const writeTranslateY = armAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [0, 3],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* Shadow */}
        <Ellipse cx="50" cy="88" rx="28" ry="5.5" fill="#000000" fillOpacity="0.06" />

        {/* Body */}
        <AnimatedG
          style={{
            transform: [
              { scaleX: bodyScaleX },
              { scaleY: bodyScaleY },
            ],
          }}
        >
          {/* Chubby Brown Body */}
          <Rect x="29" y="56" width="42" height="28" rx="16" fill={DUDU_COLOR} stroke={DUDU_BORDER} strokeWidth="2" />
          
          {/* Belly Badge */}
          <Ellipse cx="50" cy="72" rx="12" ry="8" fill="#F8EFEB" />

          {/* Left Foot */}
          <Circle cx="34" cy="83" r="6.5" fill={DUDU_COLOR} stroke={DUDU_BORDER} strokeWidth="2" />
          {/* Right Foot */}
          <Circle cx="66" cy="83" r="6.5" fill={DUDU_COLOR} stroke={DUDU_BORDER} strokeWidth="2" />
        </AnimatedG>

        {/* Left Arm (holding planning clipboard when writing) */}
        <G>
          {state === 'writing' ? (
            <G>
              {/* Arm reaching inward */}
              <Path
                d="M29,64 C29,64 36,66 40,66 C42,66 42,61 38,61 C34,61 29,62 29,62"
                fill={DUDU_COLOR}
                stroke={DUDU_BORDER}
                strokeWidth="2"
              />
              {/* Mini Clipboard */}
              <Rect x="37" y="60" width="10" height="13" rx="1" fill="#E8ECEF" stroke="#909AA6" strokeWidth="1" />
              <Rect x="37" y="60" width="10" height="3" fill="#A37E65" />
            </G>
          ) : (
            // Default resting left arm
            <Path
              d="M19,64 C19,58 29,58 29,64 C29,70 19,70 19,64 Z"
              fill={DUDU_COLOR}
              stroke={DUDU_BORDER}
              strokeWidth="2"
            />
          )}
        </G>

        {/* Right Arm (Waving or Writing) */}
        <AnimatedG
          style={{
            transform: state === 'waving' ? [
              { translateX: 71 },
              { translateY: 64 },
              { rotate: waveRotate },
              { translateX: -71 },
              { translateY: -64 },
            ] : state === 'writing' ? [
              { translateY: writeTranslateY }
            ] : [],
          }}
        >
          {state === 'waving' ? (
            // Arm rotated up for wave
            <Path
              d="M71,64 C71,64 79,48 83,48 C87,48 87,54 81,59 C78,62 71,64 71,64"
              fill={DUDU_COLOR}
              stroke={DUDU_BORDER}
              strokeWidth="2"
            />
          ) : state === 'writing' ? (
            // Arm holding pen, writing on clipboard
            <G>
              <Path
                d="M71,64 C71,64 62,65 54,66 C50,66 50,60 55,60 C60,60 71,62 71,62"
                fill={DUDU_COLOR}
                stroke={DUDU_BORDER}
                strokeWidth="2"
              />
              {/* Tiny yellow/pink pencil */}
              <Path d="M51,66 L47,67 L48,63 Z" fill="#F49097" />
              <Rect x="48" y="62" width="6" height="3" fill="#F4D35E" rotate="-15" />
            </G>
          ) : (
            // Default resting arm
            <Path
              d="M71,64 C71,58 81,58 81,64 C81,70 71,70 71,64 Z"
              fill={DUDU_COLOR}
              stroke={DUDU_BORDER}
              strokeWidth="2"
            />
          )}
        </AnimatedG>

        {/* Head & Ears */}
        <AnimatedG
          style={{
            transform: [
              { translateY: finalHeadY },
            ],
          }}
        >
          {/* Left Ear */}
          <Circle cx="27" cy="25" r="8.5" fill={DUDU_COLOR} stroke={DUDU_BORDER} strokeWidth="2" />
          <Circle cx="27" cy="25" r="4.5" fill="#FFAAAA" />

          {/* Right Ear */}
          <Circle cx="73" cy="25" r="8.5" fill={DUDU_COLOR} stroke={DUDU_BORDER} strokeWidth="2" />
          <Circle cx="73" cy="25" r="4.5" fill="#FFAAAA" />

          {/* Head Body */}
          <Circle cx="50" cy="38" r="27.5" fill={DUDU_COLOR} stroke={DUDU_BORDER} strokeWidth="2" />

          {/* Cute pink cheek spots */}
          <Circle cx="31" cy="46" r="3" fill="#FFAAAA" fillOpacity="0.7" />
          <Circle cx="69" cy="46" r="3" fill="#FFAAAA" fillOpacity="0.7" />

          {/* Eyes (blinking support) */}
          <G>
            <AnimatedG style={{ transform: [{ scaleY: blinkAnim }] }}>
              <Circle cx="38" cy="38" r="3" fill="#2C283E" />
            </AnimatedG>
            <AnimatedG style={{ transform: [{ scaleY: blinkAnim }] }}>
              <Circle cx="62" cy="38" r="3" fill="#2C283E" />
            </AnimatedG>
            {/* Eye Shine */}
            <Circle cx="37.2" cy="37.2" r="0.8" fill={COLORS.white} />
            <Circle cx="61.2" cy="37.2" r="0.8" fill={COLORS.white} />
          </G>

          {/* Snout Cream Patch */}
          <Ellipse cx="50" cy="45" rx="5" ry="3.5" fill="#FBF4EE" />

          {/* Smile and Nose */}
          <Path d="M49,43.8 Q50,42.5 51,43.8" fill="none" stroke="#2C283E" strokeWidth="1.5" strokeLinecap="round" />
          <Path
            d="M48,46 Q49.5,47.2 50,46 Q50.5,47.2 52,46"
            fill="none"
            stroke="#2C283E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </AnimatedG>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
