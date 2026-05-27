import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import Confetti from '../components/Confetti';
import { supabase, CHANNEL_ID } from '../supabase';
import { getTasks, updateDailyProgress, getStreakData, getHistory, getLocalDateString, updateTask, saveTasks } from '../storage';
import { SHADOWS, BORDER_RADIUS, SPACING } from '../components/Theme';

// Configure foreground notifications handler safely
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn("Failed to set notification handler:", e);
  }
}

// Bubu's Pink Theme System
const COLORS = {
  primary: '#F28DA4',       // Cute pastel pink primary
  primaryLight: '#FFF0F2',  // Very soft rose/pink background tint
  primaryDark: '#D15873',   // Muted dark pink/rose for buttons and labels
  success: '#E87D90',       // Rose pink checked state
  successLight: '#FFEAEF',  // Rose pink background tint
  successDark: '#B23A50',   // Dark rose pink text
  danger: '#F49097',
  dangerLight: '#FFE9EB',
  background: '#FFF5F6',    // Warm blush pink background for Bubu's desk
  card: '#FFFFFF',
  border: '#FCD6DD',        // Soft pink borders
  text: '#3D2F33',          // Soft dark rose-charcoal
  textSecondary: '#8F757C', // Secondary rose-gray text
  white: '#FFFFFF',
  gold: '#F4D35E',
  goldLight: '#FFFBE6',
};

const KISS_GIF_DATA = [
  {
    gif: require('../../assets/kiss_attack_1.gif'),
    title: "yayyy bubu finished ..",
    subtitle: "now its kissie attack timee.."
  },
  {
    gif: require('../../assets/kiss_attack_2.gif'),
    title: "yayyy bubu finished ..",
    subtitle: "now its bum massage timee..."
  }
];

// Helper: Get tomorrow's date string YYYY-MM-DD
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BubuScreen({ onBack }) {
  const [tasks, setTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);
  const [streak, setStreak] = useState({ streakCount: 0, lastCompletedDate: '' });
  const [history, setHistory] = useState([]);
  
  // Confetti trigger
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(false);

  // Selected history day modal
  const [selectedHistoryDay, setSelectedHistoryDay] = useState(null);
  const [historyTasks, setHistoryTasks] = useState([]);

  // Kiss attack state
  const [showKissAttack, setShowKissAttack] = useState(false);
  const [currentKissGif, setCurrentKissGif] = useState(null);
  const [kissTitle, setKissTitle] = useState("🎉 Yayy Bubu finished! 💋");
  const [kissSubtitle, setKissSubtitle] = useState("Now kissie attack!!!");
  const kissScale = useRef(new Animated.Value(0.3)).current;
  const kissOpacity = useRef(new Animated.Value(0)).current;

  const [restDuration, setRestDuration] = useState(60);
  const [restStartTime, setRestStartTime] = useState(null);
  const [isStudying, setIsStudying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showHistoryListModal, setShowHistoryListModal] = useState(false);
  const [showRevisePopup, setShowRevisePopup] = useState(false);

  const reviseScale = useRef(new Animated.Value(0.3)).current;
  const reviseOpacity = useRef(new Animated.Value(0)).current;

  const todayStr = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initial stats loader
  const loadStats = async () => {
    const streakData = await getStreakData();
    setStreak(streakData);

    const historyData = await getHistory();
    setHistory(historyData);
  };

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.log('Notification permissions not granted');
          }
        } catch (e) {
          console.warn('Failed to request notification permissions:', e);
        }
      }
    };
    requestPermissions();
  }, []);

  // Rest Timer Active check
  const isRestActive = !!(restStartTime && 
    (Date.now() - new Date(restStartTime).getTime() < restDuration * 1000));

  useEffect(() => {
    if (!restStartTime || !restDuration) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const elapsedMs = Date.now() - new Date(restStartTime).getTime();
      const durationMs = restDuration * 1000;
      const remainingSecs = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
      return remainingSecs;
    };

    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    if (initial <= 0) return;

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        // Clear restStartTime in Supabase when timer ends
        supabase
          .from('progress')
          .upsert({ id: CHANNEL_ID, restStartTime: null })
          .then(() => {
            Alert.alert("Break time over! 🧸", "Back to study mode, Bubu! 💕");
          }).catch(err => {
            console.error("Error clearing restStartTime:", err);
            Alert.alert("Break time over! 🧸", "Back to study mode, Bubu! 💕");
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [restStartTime, restDuration]);

  useEffect(() => {
    loadStats();

    const handleTasksUpdated = async (fbTasks) => {
      const todayTasks = fbTasks.filter(t => t.assignedDate === todayStr);
      const tomTasks = fbTasks.filter(t => t.assignedDate === tomorrowStr);
      
      setTasks(todayTasks);
      setTomorrowTasks(tomTasks);

      // Keep local AsyncStorage in sync
      await saveTasks(fbTasks);

      // Automatically recalculate stats in background on task change
      const { streakCount, history: updatedHistory } = await updateDailyProgress(todayStr);
      setStreak(prev => ({ ...prev, streakCount }));
      setHistory(updatedHistory);

      // Trigger celebration confetti if transitioned to fully completed
      const completedCount = todayTasks.filter(t => t.completed).length;
      const totalCount = todayTasks.length;
      const isAllDone = completedCount === totalCount && totalCount > 0;
      
      if (isAllDone && !prevCompleted) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
      setPrevCompleted(isAllDone);
    };

    const handleProgressUpdated = (data) => {
      if (data.restDuration !== undefined) {
        setRestDuration(data.restDuration);
      }
      if (data.restStartTime !== undefined) {
        setRestStartTime(data.restStartTime);
      }
      if (data.isStudying !== undefined) {
        setIsStudying(data.isStudying);
      }
    };

    // Fetch initial tasks
    supabase
      .from('tasks')
      .select('*')
      .then(({ data }) => {
        if (data) handleTasksUpdated(data);
      });

    // Fetch initial progress
    supabase
      .from('progress')
      .select('*')
      .eq('id', CHANNEL_ID)
      .single()
      .then(({ data }) => {
        if (data) handleProgressUpdated(data);
      });

    // Listen to Supabase tasks collection in real-time
    const tasksChannel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        supabase.from('tasks').select('*').then(({ data }) => {
          if (data) handleTasksUpdated(data);
        });
      })
      .subscribe();

    // Listen to Bubu's progress/settings document in real-time
    const progressChannel = supabase
      .channel('progress-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress', filter: `id=eq.${CHANNEL_ID}` }, (payload) => {
        if (payload.new) {
          handleProgressUpdated(payload.new);
        }
      })
      .subscribe();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(progressChannel);
    };
  }, [fadeAnim, prevCompleted]);

  const triggerKissAttack = () => {
    const randomIndex = Math.floor(Math.random() * KISS_GIF_DATA.length);
    const selected = KISS_GIF_DATA[randomIndex];
    setCurrentKissGif(selected.gif);
    setKissTitle(selected.title);
    setKissSubtitle(selected.subtitle);
    setShowKissAttack(true);

    kissScale.setValue(0.3);
    kissOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(kissScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(kissOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const triggerRevisePopup = () => {
    setShowRevisePopup(true);
    reviseScale.setValue(0.3);
    reviseOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(reviseScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(reviseOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const proceedWithToggle = async (taskId, nextState) => {
    const allTasks = await getTasks();
    const updatedTasks = allTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: nextState,
          completedAt: nextState ? new Date().toISOString() : null
        };
      }
      return t;
    });

    const changedTask = updatedTasks.find(t => t.id === taskId);
    if (changedTask) {
      const todayTasks = updatedTasks.filter(t => t.assignedDate === todayStr);
      const totalToday = todayTasks.length;
      const completedToday = todayTasks.filter(t => t.completed).length;

      if (changedTask.completed) {
        triggerKissAttack();
      }

      // If all tasks are completed, exit study mode and reset rest
      if (completedToday === totalToday && totalToday > 0) {
        supabase
          .from('progress')
          .upsert({ id: CHANNEL_ID, isStudying: false, restStartTime: null })
          .catch(e => console.error(e));
      }

      await updateTask(changedTask);
    }
  };

  // Toggle completed status with review confirmation
  const handleToggleTask = async (taskId) => {
    const allTasks = await getTasks();
    const taskToToggle = allTasks.find(t => t.id === taskId);
    if (!taskToToggle) return;

    if (!taskToToggle.completed) {
      Alert.alert(
        "Review Mission 🧸",
        "Bubu, have you understood everything and completed properly?",
        [
          {
            text: "No ❌",
            onPress: () => {
              triggerRevisePopup();
            },
            style: "cancel"
          },
          {
            text: "Yes! Yes! ✅",
            onPress: async () => {
              await proceedWithToggle(taskId, true);
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      await proceedWithToggle(taskId, false);
    }
  };

  const handleStartStudying = () => {
    try {
      supabase
        .from('progress')
        .upsert({ id: CHANNEL_ID, isStudying: true })
        .catch(e => console.error(e));
    } catch (e) {
      console.error("Error starting study mode:", e);
    }
  };

  const handleTakeBreak = async () => {
    try {
      supabase
        .from('progress')
        .upsert({ id: CHANNEL_ID, restStartTime: new Date().toISOString() })
        .catch(e => console.error(e));

      // Schedule background push notification
      if (Platform.OS !== 'web') {
        try {
          await Notifications.cancelAllScheduledNotificationsAsync();
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Break time over! 🧸",
              body: "Back to study mode, Bubu! 💕",
              sound: true,
            },
            trigger: {
              seconds: Number(restDuration),
            },
          });
        } catch (e) {
          console.warn("Failed to schedule background notification:", e);
        }
      }
    } catch (e) {
      console.error("Error starting break:", e);
    }
  };

  // View details of a past day in a modal
  const handleViewHistoryDay = async (historyEntry) => {
    const allTasks = await getTasks();
    const dayTasks = allTasks.filter(t => t.assignedDate === historyEntry.date);
    setHistoryTasks(dayTasks);
    setSelectedHistoryDay(historyEntry);
  };

  // Calculate today's progress percentage
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Determine Bubu character state based on progress
  let bubuState = 'sleepy';
  if (totalCount === 0) {
    bubuState = 'sleepy';
  } else if (progressPercent === 100) {
    bubuState = 'celebration';
  } else if (progressPercent >= 70) {
    bubuState = 'excited';
  } else if (progressPercent >= 30) {
    bubuState = 'focused';
  } else {
    bubuState = 'sleepy';
  }

  // Helper to format date in a cute way
  const formatCuteDate = (dateStr) => {
    if (dateStr === todayStr) return "Today's Mission";
    
    const date = new Date(dateStr + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', weekday: 'short' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden preloader for kiss/mascot GIFs to ensure instant, zero-lag playback */}
      <View style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}>
        <Image source={KISS_GIF_DATA[0].gif} />
        <Image source={KISS_GIF_DATA[1].gif} />
        <Image source={require('../../assets/kiss_attack_3.gif')} />
        <Image source={require('../../assets/gif4.gif')} />
        <Image source={require('../../assets/gif5.gif')} />
        <Image source={require('../../assets/gif8.gif')} />
      </View>

      <Confetti active={showConfetti} />

      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Exit</Text>
          </TouchableOpacity>
          
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streak.streakCount} Day Streak</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Mascot Section */}
          <View style={styles.mascotCard}>
            {isRestActive ? (
              <Image
                source={require('../../assets/kiss_attack_3.gif')}
                style={styles.mascotGif}
                resizeMode="contain"
              />
            ) : progressPercent === 100 && totalCount > 0 ? (
              <Image
                source={require('../../assets/gif5.gif')}
                style={styles.mascotGif}
                resizeMode="contain"
              />
            ) : isStudying ? (
              <Image
                source={require('../../assets/gif4.gif')}
                style={styles.mascotGif}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require('../../assets/gif5.gif')}
                style={styles.mascotGif}
                resizeMode="contain"
              />
            )}

            <Text style={styles.mascotGreeting}>
              {isRestActive
                ? "bubu rest timeee 💤"
                : progressPercent === 100 && totalCount > 0
                ? "🎉 Super Bubu! We did it!"
                : isStudying
                ? "📖 Bubu is studying hard..."
                : totalCount === 0
                ? "💤 No missions assigned today yet!"
                : "😴 Wakey wakey Bubu! Let's study!"}
            </Text>
            
            {isRestActive && timeLeft > 0 && (
              <View style={styles.restingStatusBadge}>
                <Text style={styles.restingStatusText}>🌸 Rest remaining: {timeLeft}s 🌸</Text>
              </View>
            )}

            {totalCount > 0 && progressPercent < 100 && !isStudying && !isRestActive && (
              <TouchableOpacity
                style={styles.startStudyingBtn}
                onPress={handleStartStudying}
                activeOpacity={0.8}
              >
                <Text style={styles.startStudyingBtnText}>Start Studying ✏️</Text>
              </TouchableOpacity>
            )}

            {isStudying && progressPercent < 100 && !isRestActive && (
              <View style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={styles.studyingBadge}>
                  <Text style={styles.studyingBadgeText}>📖 Study mode active!</Text>
                </View>
                <TouchableOpacity
                  style={styles.takeBreakBtn}
                  onPress={handleTakeBreak}
                  activeOpacity={0.8}
                >
                  <Text style={styles.takeBreakBtnText}>Take a Break ☕</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {totalCount > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {completedCount} of {totalCount} missions • {progressPercent}% Done
                </Text>
              </View>
            )}
          </View>

          {/* Celebration Banner */}
          {progressPercent === 100 && totalCount > 0 && (
            <View style={styles.celebrationBanner}>
              <Text style={styles.celebrationTitle}>🎉 Great work Bubu!</Text>
              <Text style={styles.celebrationSubtitle}>You finished all your tasks for today. Dudu is super proud of you! 🧸</Text>
            </View>
          )}

          {/* Today's Tasks Checklist */}
          <Text style={styles.sectionTitle}>Today's Mission checklist</Text>
          {totalCount === 0 ? (
            <View style={styles.emptyTasksCard}>
              <Text style={styles.emptyTasksText}>No tasks assigned for today. Enjoy your free time or ask Dudu for a study plan! 💤</Text>
            </View>
          ) : (
            <View style={styles.taskListContainer}>
              {tasks.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => handleToggleTask(item.id)}
                  style={[
                    styles.taskCard,
                    item.completed && styles.taskCardCompleted
                  ]}
                >
                  <View style={[
                    styles.checkbox,
                    item.completed && styles.checkboxChecked
                  ]}>
                    {item.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.taskTextWrapper}>
                    <Text style={[
                      styles.taskTitle,
                      item.completed && styles.taskTextCompleted
                    ]}>
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text style={[
                        styles.taskDesc,
                        item.completed && styles.taskTextCompleted
                      ]}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tomorrow's Preview (View-only) */}
          {tomorrowTasks.length > 0 && (
            <View style={styles.tomorrowSection}>
              <Text style={styles.sectionTitle}>Tomorrow's Sneak Peek 📝</Text>
              <View style={styles.taskListContainer}>
                {tomorrowTasks.map((item) => (
                  <View key={item.id} style={[styles.taskCard, styles.tomorrowTaskCard]}>
                    <View style={styles.tomorrowClockIconWrapper}>
                      <Text style={styles.tomorrowClockIcon}>✨</Text>
                    </View>
                    <View style={styles.taskTextWrapper}>
                      <Text style={styles.tomorrowTaskTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.tomorrowTaskDesc}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* History Section Button */}
          <View style={{ marginTop: SPACING.md, marginBottom: SPACING.lg }}>
            <TouchableOpacity
              style={styles.viewHistoryButton}
              activeOpacity={0.8}
              onPress={() => setShowHistoryListModal(true)}
            >
              <Text style={styles.viewHistoryButtonText}>📚 View Study History Logs 📚</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

      </Animated.View>

      {/* History Day Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedHistoryDay !== null}
        onRequestClose={() => setSelectedHistoryDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedHistoryDay && formatCuteDate(selectedHistoryDay.date)}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedHistoryDay(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalProgressRow}>
                <Text style={styles.modalProgressText}>
                  Completion Status:
                </Text>
                <View style={[
                  styles.historyStatusBadge,
                  {
                    backgroundColor: selectedHistoryDay?.isCompleted 
                      ? COLORS.successLight 
                      : COLORS.primaryLight
                  }
                ]}>
                  <Text style={[
                    styles.historyStatusText,
                    {
                      color: selectedHistoryDay?.isCompleted 
                        ? COLORS.successDark 
                        : COLORS.primaryDark
                    }
                  ]}>
                    {selectedHistoryDay?.isCompleted ? '100% Done 🎉' : 'Partial'}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalListTitle}>Tasks Assigned:</Text>
              {historyTasks.length === 0 ? (
                <Text style={styles.modalNoTasksText}>No tasks found for this day.</Text>
              ) : (
                historyTasks.map((t) => (
                  <View
                    key={t.id}
                    style={[
                      styles.modalTaskCard,
                      t.completed && styles.modalTaskCardCompleted
                    ]}
                  >
                    <Text style={[
                      styles.modalTaskTitle,
                      t.completed && styles.modalTaskTextCompleted
                    ]}>
                      {t.completed ? '✓ ' : '☐ '} {t.title}
                    </Text>
                    {t.description ? (
                      <Text style={[
                        styles.modalTaskDesc,
                        t.completed && styles.modalTaskTextCompleted
                      ]}>
                        {t.description}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Kiss Attack Modal */}
      {showKissAttack && (
        <Modal
          transparent={true}
          visible={showKissAttack}
          animationType="none"
          onRequestClose={() => setShowKissAttack(false)}
        >
          <View style={styles.kissOverlay}>
            <Animated.View style={[
              styles.kissCard,
              {
                opacity: kissOpacity,
                transform: [{ scale: kissScale }]
              }
            ]}>
              <Text style={styles.kissTitle}>{kissTitle}</Text>
              <Text style={styles.kissSubtitle}>{kissSubtitle}</Text>
              
              {currentKissGif && (
                <Image
                  source={currentKissGif}
                  style={styles.kissGif}
                  resizeMode="contain"
                />
              )}

              <TouchableOpacity
                onPress={() => setShowKissAttack(false)}
                style={styles.kissCloseButton}
              >
                <Text style={styles.kissCloseButtonText}>Close 🌸</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Revise Popup Modal */}
      {showRevisePopup && (
        <Modal
          transparent={true}
          visible={showRevisePopup}
          animationType="none"
          onRequestClose={() => setShowRevisePopup(false)}
        >
          <View style={styles.kissOverlay}>
            <Animated.View style={[
              styles.kissCard,
              {
                opacity: reviseOpacity,
                transform: [{ scale: reviseScale }]
              }
            ]}>
              <Text style={styles.kissTitle}>Study Time 📚</Text>
              <Text style={styles.kissSubtitle}>okay bubu go revise and come</Text>
              
              <Image
                source={require('../../assets/gif8.gif')}
                style={styles.kissGif}
                resizeMode="contain"
              />

              <TouchableOpacity
                onPress={() => setShowRevisePopup(false)}
                style={styles.kissCloseButton}
              >
                <Text style={styles.kissCloseButtonText}>Okay 🌸</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* History List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showHistoryListModal}
        onRequestClose={() => setShowHistoryListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Study History logs 📈</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryListModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <Text style={styles.modalNoTasksText}>No history logs recorded yet.</Text>
              ) : (
                <View style={styles.historyList}>
                  {history.map((item) => (
                    <TouchableOpacity
                      key={item.date}
                      style={styles.historyCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleViewHistoryDay(item);
                      }}
                    >
                      <View style={styles.historyCardLeft}>
                        <Text style={styles.historyDate}>{formatCuteDate(item.date)}</Text>
                        <Text style={styles.historySub}>
                          {item.completedCount} of {item.totalCount} completed
                        </Text>
                      </View>
                      <View style={styles.historyCardRight}>
                        <View style={[
                          styles.historyStatusBadge,
                          {
                            backgroundColor: item.isCompleted 
                              ? COLORS.successLight 
                              : COLORS.primaryLight
                          }
                        ]}>
                          <Text style={[
                            styles.historyStatusText,
                            {
                              color: item.isCompleted 
                                ? COLORS.successDark 
                                : COLORS.primaryDark
                            }
                          ]}>
                            {item.isCompleted ? 'All Done 🎉' : 'Incomplete'}
                          </Text>
                        </View>
                        <Text style={styles.arrowIcon}>→</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  streakBadge: {
    backgroundColor: COLORS.goldLight,
    borderColor: '#FFEFA7',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  streakText: {
    color: '#D4A017',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  mascotCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: '#FCD6DD',
    shadowColor: '#F28DA4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  mascotGreeting: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.round,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  celebrationBanner: {
    backgroundColor: COLORS.successLight,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    borderColor: COLORS.success,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  celebrationTitle: {
    color: COLORS.successDark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  celebrationSubtitle: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  emptyTasksCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: '#FCD6DD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F28DA4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTasksText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  taskListContainer: {
    gap: SPACING.sm,
  },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 2,
    borderColor: '#FCD6DD',
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    shadowColor: '#F28DA4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardCompleted: {
    backgroundColor: '#FAF9FC',
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    backgroundColor: COLORS.card,
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskTextWrapper: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  taskDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  tomorrowSection: {
    marginTop: SPACING.lg,
  },
  tomorrowTaskCard: {
    backgroundColor: '#FFFBFB',
    borderWidth: 2,
    borderColor: '#FEE5EA',
  },
  tomorrowClockIconWrapper: {
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
  },
  tomorrowClockIcon: {
    fontSize: 16,
  },
  tomorrowTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tomorrowTaskDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.8,
    marginTop: 2,
  },
  historyList: {
    gap: SPACING.sm,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 2,
    borderColor: '#FCD6DD',
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    shadowColor: '#F28DA4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  historyCardLeft: {},
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  historySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.small,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  arrowIcon: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    maxHeight: '75%',
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalProgressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalNoTasksText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
  modalTaskCard: {
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  modalTaskCardCompleted: {
    opacity: 0.7,
  },
  modalTaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalTaskDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    paddingLeft: 16,
  },
  modalTaskTextCompleted: {
    textDecorationLine: 'line-through',
  },
  kissOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  kissCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#FFEAEF', // Soft blush pink background
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 2,
    borderColor: '#FCD6DD', // Soft pink border
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  kissTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#B23A50', // Dark rose text
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  kissSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D15873', // Cute primary pink dark
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  kissGif: {
    width: 250,
    height: 250,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  kissCloseButton: {
    backgroundColor: '#F28DA4',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.round,
    ...SHADOWS.inner,
  },
  kissCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  mascotGif: {
    width: 150,
    height: 150,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  startStudyingBtn: {
    backgroundColor: '#F28DA4',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.md,
    ...SHADOWS.inner,
  },
  startStudyingBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  studyingBadge: {
    backgroundColor: '#FFE9EB',
    borderColor: '#FCD6DD',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.md,
  },
  studyingBadgeText: {
    color: '#D15873',
    fontWeight: '700',
    fontSize: 12,
  },
  restingStatusBadge: {
    backgroundColor: '#FFEAEF',
    borderColor: '#FCD6DD',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.round,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: SPACING.md,
  },
  restingStatusText: {
    color: '#B23A50',
    fontWeight: '700',
    fontSize: 12,
  },
  takeBreakBtn: {
    backgroundColor: '#9D8DF1', // Lavender break button
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.round,
    marginTop: 4,
    ...SHADOWS.inner,
  },
  takeBreakBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  viewHistoryButton: {
    backgroundColor: COLORS.primary,
    borderColor: '#FCD6DD',
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F28DA4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  viewHistoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
