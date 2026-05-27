import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#9D8DF1', // Lavender
  '#70C1B3', // Soft green
  '#F49097', // Soft pink
  '#F4D35E', // Yellow gold
  '#3A86C8', // Soft blue
  '#E197F4', // Pink purple
];

const SHAPES = ['circle', 'square', 'emoji-star', 'emoji-party', 'emoji-bubu'];

function ConfettiParticle({ index }) {
  const [animation] = useState(() => new Animated.Value(0));
  
  // Random configurations for varied movement
  const [config] = useState(() => {
    const angle = (Math.PI / 180) * (240 + Math.random() * 60); // Angle between 240 and 300 degrees (pointing upwards)
    const velocity = 8 + Math.random() * 12; // Explosive upward velocity
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = 8 + Math.random() * 12;
    const startX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 60; // Spawn near center
    const startY = SCREEN_HEIGHT * 0.75; // Spawn lower middle area (close to button/Bubu)
    const drift = (Math.random() - 0.5) * 150; // Side-to-side wind drift
    const rotationCount = 1 + Math.floor(Math.random() * 3); // Rotations
    
    return { angle, velocity, shape, color, size, startX, startY, drift, rotationCount };
  });

  useEffect(() => {
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 2500 + Math.random() * 1000,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  // Interpolate physics (gravity and velocity)
  // Y goes: starts at startY -> goes up due to velocity -> falls down due to gravity
  const translateY = animation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [
      config.startY,
      config.startY - Math.sin(config.angle) * config.velocity * 20, // Peak height
      SCREEN_HEIGHT + 50 // Falls off screen
    ]
  });

  // X goes: starts at startX -> drifts sideways
  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startX, config.startX + config.drift],
  });

  // Rotation animation
  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${config.rotationCount * 360}deg`],
  });

  // Scale: starts small, expands, shrinks when falling out
  const scale = animation.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Opacity: fades out at the bottom
  const opacity = animation.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  if (config.shape.startsWith('emoji-')) {
    let emoji = '🎉';
    if (config.shape === 'emoji-star') emoji = '⭐';
    if (config.shape === 'emoji-bubu') emoji = '🐼';
    
    return (
      <Animated.Text
        style={[
          styles.emoji,
          {
            fontSize: config.size + 8,
            transform: [
              { translateX },
              { translateY },
              { rotate },
              { scale },
            ],
            opacity,
          },
        ]}
      >
        {emoji}
      </Animated.Text>
    );
  }

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          backgroundColor: config.color,
          borderRadius: config.shape === 'circle' ? config.size / 2 : 2,
          transform: [
            { translateX },
            { translateY },
            { rotate },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
}

export default function Confetti({ active }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      // Spawn particles
      const count = 45;
      const newParticles = Array.from({ length: count }).map((_, i) => i);
      setParticles(newParticles);

      // Clean up after animation finishes
      const timer = setTimeout(() => {
        setParticles([]);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((id) => (
        <ConfettiParticle key={id} index={id} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99,
  },
  emoji: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99,
    textAlign: 'center',
  },
});
