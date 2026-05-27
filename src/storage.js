import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, CHANNEL_ID } from './firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const KEYS = {
  TASKS: 'mission_bubu_tasks',
  PASSWORD: 'mission_bubu_password',
  STREAK: 'mission_bubu_streak',
  HISTORY: 'mission_bubu_history',
};

// Helper: Get local date string YYYY-MM-DD
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Get yesterday's date string YYYY-MM-DD
export const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
};

// --- FIRESTORE UTILS (Non-blocking background calls) ---

const saveTaskToFirestore = (task) => {
  const taskRef = doc(db, 'channels', CHANNEL_ID, 'tasks', task.id);
  setDoc(taskRef, task, { merge: true }).catch(error => {
    console.error('Error saving task to Firestore', error);
  });
};

const deleteTaskFromFirestore = (taskId) => {
  const taskRef = doc(db, 'channels', CHANNEL_ID, 'tasks', taskId);
  deleteDoc(taskRef).catch(error => {
    console.error('Error deleting task from Firestore', error);
  });
};

export const saveProgressToFirestore = (streak, history) => {
  const progressRef = doc(db, 'channels', CHANNEL_ID, 'progress', 'data');
  setDoc(progressRef, { streak, history }, { merge: true }).catch(error => {
    console.error('Error saving progress to Firestore', error);
  });
};

// --- TASKS API ---

export const getTasks = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error fetching tasks from local storage', error);
    return [];
  }
};

export const saveTasks = async (tasks) => {
  try {
    await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to local storage', error);
  }
};

export const addTask = async (task) => {
  const tasks = await getTasks();
  const newTask = {
    id: String(Date.now() + Math.random().toString(36).substr(2, 9)),
    completed: false,
    ...task
  };
  tasks.push(newTask);
  
  await saveTasks(tasks);
  saveTaskToFirestore(newTask); // fire and forget in background
  
  return newTask;
};

export const updateTask = async (updatedTask) => {
  const tasks = await getTasks();
  const index = tasks.findIndex(t => t.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updatedTask };
    await saveTasks(tasks);
    saveTaskToFirestore(tasks[index]); // fire and forget in background
  }
  return tasks;
};

export const deleteTask = async (taskId) => {
  let tasks = await getTasks();
  tasks = tasks.filter(t => t.id !== taskId);
  
  await saveTasks(tasks);
  deleteTaskFromFirestore(taskId); // fire and forget in background
  
  return tasks;
};

// --- PASSWORD API ---

export const getPassword = async () => {
  try {
    const password = await AsyncStorage.getItem(KEYS.PASSWORD);
    return password !== null ? password : '1234';
  } catch (error) {
    console.error('Error reading password', error);
    return '1234';
  }
};

export const savePassword = async (newPassword) => {
  try {
    await AsyncStorage.setItem(KEYS.PASSWORD, newPassword);
  } catch (error) {
    console.error('Error saving password', error);
  }
};

// --- STREAK & HISTORY API ---

export const getStreakData = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.STREAK);
    return data ? JSON.parse(data) : { streakCount: 0, lastCompletedDate: '' };
  } catch (error) {
    console.error('Error reading streak', error);
    return { streakCount: 0, lastCompletedDate: '' };
  }
};

export const getHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading history', error);
    return [];
  }
};

export const saveHistory = async (history) => {
  try {
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving history', error);
  }
};

export const updateDailyProgress = async (dateStr) => {
  const tasks = await getTasks();
  const dayTasks = tasks.filter(t => t.assignedDate === dateStr);
  
  if (dayTasks.length === 0) {
    return { streakCount: 0, isAllCompleted: false };
  }

  const completedCount = dayTasks.filter(t => t.completed).length;
  const totalCount = dayTasks.length;
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  let history = await getHistory();
  const existingHistoryIndex = history.findIndex(h => h.date === dateStr);
  
  const historyEntry = {
    date: dateStr,
    completedCount,
    totalCount,
    isCompleted: isAllCompleted
  };

  if (existingHistoryIndex !== -1) {
    history[existingHistoryIndex] = historyEntry;
  } else {
    history.push(historyEntry);
  }
  
  history.sort((a, b) => b.date.localeCompare(a.date));
  await saveHistory(history);

  const streak = await getStreakData();
  let { streakCount, lastCompletedDate } = streak;
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  if (isAllCompleted) {
    if (lastCompletedDate === today) {
      // Already marked completed today
    } else if (lastCompletedDate === yesterday) {
      streakCount += 1;
      lastCompletedDate = today;
    } else {
      streakCount = 1;
      lastCompletedDate = today;
    }
  } else {
    if (lastCompletedDate === today) {
      const yesterdayEntry = history.find(h => h.date === yesterday);
      if (yesterdayEntry && yesterdayEntry.isCompleted) {
        streakCount = Math.max(0, streakCount - 1);
        lastCompletedDate = yesterday;
      } else {
        streakCount = 0;
        lastCompletedDate = '';
      }
    }
  }

  const newStreak = { streakCount, lastCompletedDate };
  await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(newStreak));

  saveProgressToFirestore(newStreak, history); // fire and forget in background

  return {
    streakCount,
    isAllCompleted,
    history
  };
};

export const seedInitialTasksIfEmpty = async () => {
  try {
    const tasks = await getTasks();
    if (tasks.length === 0) {
      const today = getLocalDateString();
      const yesterday = getYesterdayDateString();
      
      const initialTasks = [
        {
          id: 'mock-1',
          title: 'Complete 5 Python programs',
          description: 'Practice List comprehension and dictionary exercises.',
          assignedDate: today,
          completed: false,
        },
        {
          id: 'mock-2',
          title: 'Study For Loop notes',
          description: 'Read the Notion page on loop ranges and break statements.',
          assignedDate: today,
          completed: false,
        },
        {
          id: 'mock-3',
          title: 'Practice 3 scenario questions',
          description: 'Write solutions for the interview prep sheet.',
          assignedDate: today,
          completed: false,
        },
        {
          id: 'mock-yesterday-1',
          title: 'Read chapter 4 of code architecture',
          description: 'Design patterns overview.',
          assignedDate: yesterday,
          completed: true,
          completedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'mock-yesterday-2',
          title: 'Write a basic calculator app',
          description: 'Use basic views and text inputs.',
          assignedDate: yesterday,
          completed: true,
          completedAt: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
      
      await saveTasks(initialTasks);
      
      const initialStreak = { streakCount: 1, lastCompletedDate: yesterday };
      await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(initialStreak));
      
      const initialHistory = [{
        date: yesterday,
        completedCount: 2,
        totalCount: 2,
        isCompleted: true
      }];
      await saveHistory(initialHistory);

      // Async writeBatch for background setup
      const batch = writeBatch(db);
      initialTasks.forEach((task) => {
        const taskRef = doc(db, 'channels', CHANNEL_ID, 'tasks', task.id);
        batch.set(taskRef, task);
      });
      const progressRef = doc(db, 'channels', CHANNEL_ID, 'progress', 'data');
      batch.set(progressRef, { streak: initialStreak, history: initialHistory });
      
      batch.commit().catch(e => console.error("Error committing initial batch", e));
    }
  } catch (error) {
    console.error('Error seeding tasks', error);
  }
};
