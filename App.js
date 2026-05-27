import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import PasswordScreen from './src/screens/PasswordScreen';
import DuduScreen from './src/screens/DuduScreen';
import BubuScreen from './src/screens/BubuScreen';
import { seedInitialTasksIfEmpty } from './src/storage';
import { COLORS } from './src/components/Theme';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

  useEffect(() => {
    // Seed initial mock tasks on mount so the user has immediate content
    const initApp = async () => {
      await seedInitialTasksIfEmpty();
    };
    initApp();
  }, []);

  const handleRoleSelection = (role) => {
    if (role === 'dudu') {
      setCurrentScreen('password');
    } else {
      setCurrentScreen('bubu');
    }
  };

  const handlePasswordSuccess = () => {
    setCurrentScreen('dudu');
  };

  const handleGoBack = () => {
    setCurrentScreen('home');
  };

  // Basic Routing Switcher
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onSelectRole={handleRoleSelection} />;
      case 'password':
        return (
          <PasswordScreen
            onSuccess={handlePasswordSuccess}
            onBack={handleGoBack}
          />
        );
      case 'dudu':
        return <DuduScreen onBack={handleGoBack} />;
      case 'bubu':
        return <BubuScreen onBack={handleGoBack} />;
      default:
        return <HomeScreen onSelectRole={handleRoleSelection} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor={COLORS.card} />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
