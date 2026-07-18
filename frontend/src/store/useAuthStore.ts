import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  login: (username: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
            
            login: async (username, password) => {
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);

                try {
                    const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login/access-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.detail || "Authentication Failed");
                    }
                    
                    const { access_token } = await response.json();
                    set({ token: access_token, isAuthenticated: true });
                    
                    // Fetch profile immediately
                    await get().fetchMe();
                } catch (err: any) {
                    console.error("Login Failure:", err);
                    throw err;
                }
            },

            fetchMe: async () => {
                const { token } = get();
                if (!token) return;
                
                try {
                    const response = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error("Session Expired");
                    const user = await response.json();
                    set({ user, isAuthenticated: true });
                } catch (err) {
                    set({ user: null, token: null, isAuthenticated: false });
                }
            },

            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: 'codeaps-auth-storage',
        }
    )
);
