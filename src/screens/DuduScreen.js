import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import DuduCharacter from '../components/DuduCharacter';
import { db, CHANNEL_ID } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import {
  getTasks,
  saveTasks,
  addTask,
  updateTask,
  deleteTask,
  getLocalDateString,
  updateDailyProgress,
  savePassword
} from '../storage';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../components/Theme';

export default function DuduScreen({ onBack }) {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [duduState, setDuduState] = useState('waving');

  // Add/Edit Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Change Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState('');

  // Bubu's sync progress state (streak & history)
  const [bubuProgress, setBubuProgress] = useState({ streak: { streakCount: 0 }, history: [] });

  const [restDurationInput, setRestDurationInput] = useState('60');
  const [isEditingRestDuration, setIsEditingRestDuration] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Horizontal Calendar dates (7 days range)
  const [calendarDates, setCalendarDates] = useState([]);

  const todayStr = getLocalDateString();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize Calendar Dates: yesterday, today, and 5 future days
  const setupCalendar = () => {
    const dates = [];
    for (let i = -1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(getLocalDateString(d));
    }
    setCalendarDates(dates);
    setSelectedDate(todayStr);
  };

  useEffect(() => {
    setupCalendar();
    
    // 1. Listen to Firestore tasks collection in real-time
    const tasksCollectionRef = collection(db, 'channels', CHANNEL_ID, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksCollectionRef, async (querySnapshot) => {
      const fbTasks = [];
      querySnapshot.forEach((doc) => {
        fbTasks.push(doc.data());
      });
      
      setTasks(fbTasks);
      await saveTasks(fbTasks);
    });

    // 2. Listen to Bubu's progress (streak & history) in real-time
    const progressDocRef = doc(db, 'channels', CHANNEL_ID, 'progress', 'data');
    const unsubscribeProgress = onSnapshot(progressDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBubuProgress(docSnap.data());
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => setDuduState('idle'), 2500);

    const ticker = setInterval(() => {
      setNowTime(Date.now());
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(ticker);
      unsubscribeTasks();
      unsubscribeProgress();
    };
  }, [fadeAnim]);

  useEffect(() => {
    if (bubuProgress && bubuProgress.restDuration !== undefined && !isEditingRestDuration) {
      setRestDurationInput(String(bubuProgress.restDuration));
    }
  }, [bubuProgress?.restDuration, isEditingRestDuration]);

  const updateRestDuration = async (seconds) => {
    try {
      const progressRef = doc(db, 'channels', CHANNEL_ID, 'progress', 'data');
      await setDoc(progressRef, { restDuration: Number(seconds) }, { merge: true });
      setDuduState('nodding');
      setTimeout(() => setDuduState('idle'), 1500);
    } catch (e) {
      console.error("Error updating rest duration:", e);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const renderCalendarDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // 1. Previous Month Padding Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    // 2. Current Month Days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNum: i, dateStr, isCurrentMonth: true });
    }

    // 3. Next Month Padding Days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNum: i, dateStr, isCurrentMonth: false });
    }

    return days.map((day, idx) => {
      const isSelected = day.dateStr === selectedDate;
      const isToday = day.dateStr === todayStr;

      // Find history entry to draw dot indicators
      const historyEntry = bubuProgress.history?.find(h => h.date === day.dateStr);
      const isCompleted = historyEntry?.isCompleted;
      const hasTasks = historyEntry && historyEntry.totalCount > 0;

      return (
        <TouchableOpacity
          key={idx}
          style={[
            styles.calendarDayCell,
            !day.isCurrentMonth && styles.calendarDayOutside,
            isSelected && styles.calendarDayCellActive,
            isToday && !isSelected && styles.calendarDayCellToday,
          ]}
          onPress={() => {
            setSelectedDate(day.dateStr);
            setIsCalendarOpen(false);
          }}
        >
          <Text style={[
            styles.calendarDayText,
            !day.isCurrentMonth && { color: COLORS.textSecondary, opacity: 0.5 },
            isSelected && { color: COLORS.white, fontWeight: '700' },
            isToday && !isSelected && { color: COLORS.primary, fontWeight: '700' }
          ]}>
            {day.dayNum}
          </Text>

          {/* Progress Dot Indicators */}
          {hasTasks && (
            <View style={[
              styles.calDayDot,
              isCompleted ? styles.calDayDotSuccess : styles.calDayDotPartial
            ]} />
          )}
        </TouchableOpacity>
      );
    });
  };

  // Handler: Change selected day
  const handleSelectDay = (dateStr) => {
    setSelectedDate(dateStr);
    setDuduState('idle');
  };

  // Toggle Task Completion
  const handleToggleTask = async (task) => {
    try {
      const updated = { ...task, completed: !task.completed };
      await updateTask(updated);
      await updateDailyProgress(task.assignedDate);
      setDuduState('nodding');
      setTimeout(() => setDuduState('idle'), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  // Open modal to add a new task
  const openAddTask = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDesc('');
    setIsModalOpen(true);
    setDuduState('writing');
  };

  // Open modal to edit an existing task
  const openEditTask = (task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setIsModalOpen(true);
    setDuduState('writing');
  };

  // Save Add/Edit Task
  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      alert('Task title is required 🧸');
      return;
    }

    // Capture values and close modal IMMEDIATELY to prevent double submits
    const titleVal = taskTitle;
    const descVal = taskDesc;
    const isEdit = !!editingTaskId;
    const editId = editingTaskId;

    setIsModalOpen(false); // Close instantly!
    setTaskTitle('');
    setTaskDesc('');
    setEditingTaskId(null);
    
    setDuduState('nodding');
    setTimeout(() => setDuduState('idle'), 2000);

    try {
      if (isEdit) {
        const updated = {
          id: editId,
          title: titleVal,
          description: descVal,
          assignedDate: selectedDate,
        };
        await updateTask(updated);
      } else {
        await addTask({
          title: titleVal,
          description: descVal,
          assignedDate: selectedDate,
        });
      }
      await updateDailyProgress(selectedDate);
    } catch (e) {
      console.error("Error saving task:", e);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      await updateDailyProgress(selectedDate);
      setDuduState('idle');
    } catch (e) {
      console.error(e);
    }
  };

  // Change Admin password
  const handleChangePassword = async () => {
    if (newPassword.length !== 4 || isNaN(newPassword)) {
      setPasswordFeedback('PIN must be exactly 4 digits! ❌');
      return;
    }
    await savePassword(newPassword);
    setPasswordFeedback('Passcode updated successfully! 🎉');
    setDuduState('nodding');
    setTimeout(() => {
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setPasswordFeedback('');
      setDuduState('idle');
    }, 1500);
  };

  // Create next day plan: copy remaining unfinished tasks to tomorrow
  const handleCreateNextDayPlan = async () => {
    const dayTasks = tasks.filter(t => t.assignedDate === selectedDate);
    const incompleteTasks = dayTasks.filter(t => !t.completed);

    if (incompleteTasks.length === 0) {
      alert('No incomplete tasks to roll over for this day! 🧸');
      return;
    }

    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    const tomorrowStr = getLocalDateString(current);

    try {
      // Create duplicate tasks
      for (const t of incompleteTasks) {
        await addTask({
          title: t.title,
          description: t.description || '',
          assignedDate: tomorrowStr,
        });
      }
      await updateDailyProgress(tomorrowStr);

      alert(`Successfully rolled over ${incompleteTasks.length} tasks to ${formatDayLabel(tomorrowStr)}! 🚀`);
      setDuduState('nodding');
      setTimeout(() => setDuduState('idle'), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper formatting dates in calendar
  const formatDayLabel = (dateStr) => {
    if (dateStr === todayStr) return "Today";
    const date = new Date(dateStr + 'T00:00:00');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === getLocalDateString(yesterday)) return "Yest.";

    const options = { weekday: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Filter tasks for active selected calendar day
  const filteredTasks = tasks.filter(t => t.assignedDate === selectedDate);

  // Calculate today's progress percentage
  const totalCount = filteredTasks.length;
  const completedCount = filteredTasks.filter(t => t.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isBubuResting = !!(bubuProgress?.restStartTime && 
    (nowTime - new Date(bubuProgress.restStartTime).getTime() < (bubuProgress.restDuration || 60) * 1000));

  const isBubuStudying = !!bubuProgress?.isStudying;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Exit Desk</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dudu Desk</Text>
          <View style={styles.headerRight}>
            <View style={styles.bubuStreakBadge}>
              <Text style={styles.bubuStreakText}>🔥 Bubu: {bubuProgress.streak?.streakCount || 0}</Text>
            </View>
            <TouchableOpacity 
              style={styles.keyButton} 
              onPress={() => setIsPasswordModalOpen(true)}
            >
              <Text style={styles.keyButtonText}>🔑 PIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Calendar Strip */}
        <View style={styles.calendarStripContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip} style={{ flex: 1 }}>
              {calendarDates.map((dateStr) => {
                const isActive = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                
                // Find tasks count for this day
                const dayTasks = tasks.filter(t => t.assignedDate === dateStr);
                const dayTotal = dayTasks.length;
                const dayDone = dayTasks.filter(t => t.completed).length;

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => handleSelectDay(dateStr)}
                    activeOpacity={0.8}
                    style={[
                      styles.calendarDayButton,
                      isActive && styles.calendarDayActive,
                      isToday && !isActive && styles.calendarDayToday
                    ]}
                  >
                    <Text style={[
                      styles.calendarDayLabel,
                      isActive && styles.calendarDayLabelActive,
                      isToday && !isActive && { color: COLORS.primary }
                    ]}>
                      {formatDayLabel(dateStr)}
                    </Text>
                    
                    {/* Small Dot Status indicator */}
                    {dayTotal > 0 && (
                      <View style={[
                        styles.dayDot,
                        dayDone === dayTotal ? styles.dayDotAllDone : styles.dayDotPartial
                      ]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.calendarModalBtn}
              activeOpacity={0.8}
              onPress={() => setIsCalendarOpen(true)}
            >
              <Text style={styles.calendarModalBtnText}>📅 Picker</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mascot & Status Card */}
        <View style={styles.mascotDeskCard}>
          <DuduCharacter state={duduState} size={110} />
          <View style={styles.mascotDeskInfo}>
            <Text style={styles.mascotDeskTitle}>
              {selectedDate === todayStr ? "Planning Today's Schedule" : `Planning for ${formatDayLabel(selectedDate)}`}
            </Text>
            {totalCount > 0 ? (
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  Progress: {completedCount}/{totalCount} completed ({progressPercent}%)
                </Text>
                <View style={styles.deskProgressBg}>
                  <View style={[styles.deskProgressFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            ) : (
              <Text style={styles.statsTextEmpty}>No study tasks scheduled yet 📝</Text>
            )}

            {/* Bubu Activity Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {isBubuResting && (
                <View style={styles.restingStatusBadge}>
                  <Text style={styles.restingStatusText}>💤 Bubu is resting! 💤</Text>
                </View>
              )}
              {isBubuStudying && !isBubuResting && (
                <View style={styles.studyingStatusBadge}>
                  <Text style={styles.studyingStatusText}>✏️ Bubu is studying! ✏️</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Rest Settings Card */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>🌸 Bubu's Rest Settings 🌸</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Duration:</Text>
            <TextInput
              style={styles.settingsInput}
              keyboardType="numeric"
              value={restDurationInput}
              onChangeText={(text) => {
                setIsEditingRestDuration(true);
                setRestDurationInput(text);
              }}
              onBlur={() => setIsEditingRestDuration(false)}
              placeholder="60"
            />
            <Text style={styles.settingsUnit}>seconds</Text>
            <TouchableOpacity
              style={styles.saveSettingsBtn}
              onPress={async () => {
                const secs = parseInt(restDurationInput, 10);
                if (isNaN(secs) || secs <= 0) {
                  alert("Please enter a valid number of seconds! 🧸");
                  return;
                }
                await updateRestDuration(secs);
                setIsEditingRestDuration(false);
              }}
            >
              <Text style={styles.saveSettingsBtnText}>Set</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickDurationContainer}>
            {['10s', '30s', '1m', '5m', '10m'].map((label) => {
              let secs = 60;
              if (label === '10s') secs = 10;
              else if (label === '30s') secs = 30;
              else if (label === '1m') secs = 60;
              else if (label === '5m') secs = 300;
              else if (label === '10m') secs = 600;
              const isSelected = bubuProgress?.restDuration === secs;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.quickDurationBtn, isSelected && styles.quickDurationBtnActive]}
                  onPress={() => {
                    updateRestDuration(secs);
                    setRestDurationInput(String(secs));
                  }}
                >
                  <Text style={[styles.quickDurationText, isSelected && styles.quickDurationTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Task List</Text>
            <TouchableOpacity style={styles.addTaskBtn} onPress={openAddTask}>
              <Text style={styles.addTaskBtnText}>+ Add Task</Text>
            </TouchableOpacity>
          </View>

          {filteredTasks.length === 0 ? (
            <View style={styles.emptyTasksDesk}>
              <Text style={styles.emptyTasksDeskText}>
                No tasks assigned for this day. Click "+ Add Task" to create a study plan. 🧸
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.tasksScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.tasksList}>
                {filteredTasks.map((item) => (
                  <View key={item.id} style={styles.taskCard}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleToggleTask(item)}
                      style={[
                        styles.checkbox,
                        item.completed && styles.checkboxChecked
                      ]}
                    >
                      {item.completed && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    
                    <View style={styles.taskTextContainer}>
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

                    {/* Action buttons */}
                    <View style={styles.actionsContainer}>
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => openEditTask(item)}
                      >
                        <Text style={styles.actionIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.deleteBtn]} 
                        onPress={() => handleDeleteTask(item.id)}
                      >
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>

        {/* Copy Next Day Plan Button */}
        {filteredTasks.filter(t => !t.completed).length > 0 && (
          <TouchableOpacity 
            style={styles.rolloverBtn} 
            onPress={handleCreateNextDayPlan}
            activeOpacity={0.8}
          >
            <Text style={styles.rolloverBtnText}>Copy Incomplete Tasks to Tomorrow ➡️</Text>
          </TouchableOpacity>
        )}

      </Animated.View>

      {/* Task Create / Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        onRequestClose={() => {
          setIsModalOpen(false);
          setDuduState('idle');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTaskId ? 'Edit Study Mission' : 'Create Study Mission'}
            </Text>
            
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Complete 5 Python programs"
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Practice Loops and conditional branches"
              multiline
              numberOfLines={3}
              value={taskDesc}
              onChangeText={setTaskDesc}
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsModalOpen(false);
                  setDuduState('idle');
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveTask}
              >
                <Text style={styles.modalBtnSaveText}>Save Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isPasswordModalOpen}
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Admin Password</Text>
            <Text style={styles.inputLabel}>New 4-digit PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5678"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={COLORS.textSecondary}
            />

            {passwordFeedback !== '' && (
              <Text style={styles.feedbackText}>{passwordFeedback}</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsPasswordModalOpen(false);
                  setNewPassword('');
                  setPasswordFeedback('');
                }}
              >
                <Text style={styles.modalBtnCancelText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleChangePassword}
              >
                <Text style={styles.modalBtnSaveText}>Update PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Monthly Calendar Grid Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isCalendarOpen}
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 350 }]}>
            {/* Header with Nav */}
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Days of Week Headers */}
            <View style={styles.calendarGridRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: SPACING.md }]}
              onPress={() => setIsCalendarOpen(false)}
            >
              <Text style={styles.modalBtnCancelText}>Close Calendar</Text>
            </TouchableOpacity>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  bubuStreakBadge: {
    backgroundColor: COLORS.goldLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: '#FFEFA7',
  },
  bubuStreakText: {
    color: '#D4A017',
    fontSize: 11,
    fontWeight: '700',
  },
  keyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.primaryLight,
    minHeight: 44,
    justifyContent: 'center',
  },
  keyButtonText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  calendarStripContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  calendarStrip: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  calendarDayButton: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 70,
  },
  calendarDayActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  calendarDayToday: {
    borderColor: COLORS.primaryLight,
    borderWidth: 2,
  },
  calendarDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarDayLabelActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  dayDotAllDone: {
    backgroundColor: COLORS.success,
  },
  dayDotPartial: {
    backgroundColor: COLORS.textSecondary,
  },
  mascotDeskCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  mascotDeskInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  mascotDeskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  statsContainer: {
    marginTop: 6,
  },
  statsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statsTextEmpty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  deskProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  deskProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  tasksSection: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  addTaskBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    minHeight: 44,
    justifyContent: 'center',
  },
  addTaskBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyTasksDesk: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.inner,
  },
  emptyTasksDeskText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  tasksScroll: {
    flex: 1,
  },
  tasksList: {
    gap: SPACING.sm,
  },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.inner,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  taskTextContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  taskDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtn: {
    padding: 10,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 38,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerLight,
    borderColor: '#FFD5D7',
  },
  rolloverBtn: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primaryLight,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: SPACING.md,
    margin: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  rolloverBtnText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalBtnSave: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSaveText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  feedbackText: {
    color: COLORS.successDark,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginVertical: 4,
  },
  settingsLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    width: 60,
    textAlign: 'center',
  },
  settingsUnit: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  saveSettingsBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveSettingsBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  quickDurationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  quickDurationBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickDurationBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  quickDurationText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickDurationTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  restingStatusBadge: {
    backgroundColor: '#FFEAEF', // Soft pink tint matching Bubu
    borderColor: '#FCD6DD',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  restingStatusText: {
    color: '#B23A50', // Dark rose text matching Bubu
    fontSize: 10,
    fontWeight: '700',
  },
  studyingStatusBadge: {
    backgroundColor: '#FFEAEF', // Soft pink tint matching Bubu
    borderColor: '#FCD6DD',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  studyingStatusText: {
    color: '#D15873', // Dark pink text matching Bubu
    fontSize: 10,
    fontWeight: '700',
  },
  calendarModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.medium,
    minHeight: 44,
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    ...SHADOWS.inner,
  },
  calendarModalBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  calNavBtn: {
    padding: 6,
  },
  calNavText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    fontWeight: 'bold',
  },
  calendarGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  calendarDayHeader: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  calendarDayOutside: {
    backgroundColor: 'transparent',
  },
  calendarDayCellActive: {
    backgroundColor: COLORS.primary,
  },
  calendarDayCellToday: {
    borderColor: COLORS.primaryLight,
    borderWidth: 1.5,
  },
  calendarDayText: {
    fontSize: 13,
    color: COLORS.text,
  },
  calDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 3,
  },
  calDayDotSuccess: {
    backgroundColor: COLORS.success,
  },
  calDayDotPartial: {
    backgroundColor: COLORS.primaryDark,
  },
});
