import { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(() => {
    return localStorage.getItem('selectedUser') || "";
  });

  const getActivePracticeId = () => {
    if (typeof window === 'undefined') return '1';
    return localStorage.getItem('docudent_practice_id') || '1';
  };

  // Load users from Firebase with real-time updates
  useEffect(() => {
    let unsubscribe = () => { };

    const setupListener = async () => {
      try {
        const practiceId = getActivePracticeId();
        const usersRef = collection(db, "Praxen", practiceId, "Benutzer");

        unsubscribe = onSnapshot(usersRef, (snapshot) => {
          const userList = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              role: data.role || data.Rolle || "Behandler",
              avatarColor: data.avatarColor || "#94a3b8"
            };
          });
          setUsers(userList);
        }, (error) => {
          console.error("Fehler beim Laden der Benutzer (onSnapshot):", error);
        });

      } catch (error) {
        console.error("Fehler beim Setup des Listeners:", error);
      }
    };

    setupListener();

    return () => unsubscribe();
  }, []);

  // Save selectedUser to localStorage
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem('selectedUser', selectedUser);
    }
  }, [selectedUser]);

  return (
    <UserContext.Provider value={{ users, selectedUser, setSelectedUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

