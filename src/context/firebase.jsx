import { createContext, useContext, useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";

const FirebaseContext = createContext(null);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const useFirebase = () => useContext(FirebaseContext);

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const calculateDailyHours = (entries) => {
  if (!entries || entries.length === 0) return 0;

  const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time));
  let totalMinutes = 0;
  let checkInTime = null;

  sorted.forEach((entry) => {
    if (entry.type === "check-in") {
      checkInTime = entry.time;
    } else if (entry.type === "check-out" && checkInTime) {
      const [h1, m1] = checkInTime.split(":").map(Number);
      const [h2, m2] = entry.time.split(":").map(Number);

      const startMins = h1 * 60 + m1;
      const endMins = h2 * 60 + m2;

      totalMinutes += endMins - startMins;
      checkInTime = null;
    }
  });

  return totalMinutes / 60;
};

export const FirebaseProvider = (props) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(firestore, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) setUserData(userSnap.data());
      } else {
        setUser(null);
        setUserData(null);
      }
    });
  }, []);

  // --- AUTH METHODS ---
  const signupUserWithEmailAndPassword = async (name, email, password, role, photoURL) => {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);

    // Save the profile to Firestore
    await setDoc(doc(firestore, "users", result.user.uid), {
      name: name,
      email: email,
      role: role,
      photoURL: photoURL || "",
      createdAt: new Date().toISOString(),
    });
    return result;
  };

  const signinUserWithEmailAndPass = (email, password) => signInWithEmailAndPassword(firebaseAuth, email, password);
  const logoutUser = () => signOut(firebaseAuth);

  const updateUserProfile = async (uid, dataToUpdate) => {
    const userRef = doc(firestore, "users", uid);
    await updateDoc(userRef, dataToUpdate);
  };

  const deleteUserDocument = async (uid) => {
    const userRef = doc(firestore, "users", uid);
    await deleteDoc(userRef);
  };
  // --- TIMESHEET METHODS ---

  const recalculateTotals = async (sheetRef, entriesObj) => {
    let monthlyTotal = 0;
    Object.values(entriesObj).forEach((dayEntries) => {
      monthlyTotal += calculateDailyHours(dayEntries);
    });
    await updateDoc(sheetRef, {
      entries: entriesObj,
      totalHours: monthlyTotal,
    });
  };

  const addTimeEntry = async (dateObj, entryData) => {
    if (!user) return;
    const monthId = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    const sheetRef = doc(firestore, "users", user.uid, "timesheets", monthId);

    const sheetSnap = await getDoc(sheetRef);
    let allEntries = {};

    if (sheetSnap.exists()) {
      allEntries = sheetSnap.data().entries;
    } else {
      await setDoc(sheetRef, { month: monthId, totalHours: 0, entries: {} });
    }
    let currentDayEntries = allEntries[dateKey] || [];

    if (entryData.id) {
      currentDayEntries = currentDayEntries.map((e) => (e.id === entryData.id ? { ...entryData, isEdited: true } : e));
    } else {
      currentDayEntries.push({ ...entryData, id: Date.now() });
    }
    allEntries[dateKey] = currentDayEntries;

    // Save AND Recalculate Totals
    await recalculateTotals(sheetRef, allEntries);
  };

  const deleteTimeEntry = async (dateObj, entryId) => {
    if (!user) return;
    const monthId = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    const sheetRef = doc(firestore, "users", user.uid, "timesheets", monthId);

    const sheetSnap = await getDoc(sheetRef);
    if (!sheetSnap.exists()) return;

    let allEntries = sheetSnap.data().entries;
    let currentDayEntries = allEntries[dateKey] || [];

    // Remove the entry
    currentDayEntries = currentDayEntries.filter((e) => e.id !== entryId);
    allEntries[dateKey] = currentDayEntries;
    await recalculateTotals(sheetRef, allEntries);
  };

  const getMyMonthData = async (dateObj) => {
    if (!user) return null;
    const monthId = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    const sheetRef = doc(firestore, "users", user.uid, "timesheets", monthId);
    const result = await getDoc(sheetRef);
    return result.exists() ? result.data() : null;
  };

  // --- ADMIN METHODS ---
  const getAllStaff = async () => {
    const q = query(collection(firestore, "users"), where("role", "==", "staff"));
    return await getDocs(q);
  };

  const getStaffMonthData = async (staffId, dateObj) => {
    const monthId = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    const sheetRef = doc(firestore, "users", staffId, "timesheets", monthId);
    const result = await getDoc(sheetRef);
    return result.exists() ? result.data() : null;
  };

  return (
    <FirebaseContext.Provider
      value={{
        signupUserWithEmailAndPassword,
        signinUserWithEmailAndPass,
        updateUserProfile,
        deleteUserDocument,
        logoutUser,
        isLoggedIn: !!user,
        user,
        userData,
        addTimeEntry,
        deleteTimeEntry,
        getMyMonthData,
        getAllStaff,
        getStaffMonthData,
      }}
    >
      {props.children}
    </FirebaseContext.Provider>
  );
};
