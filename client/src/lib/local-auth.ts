// Local authentication fallback when Supabase is not configured
export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'organizer';
  createdAt: string;
}

export const localAuth = {
  // Get all users from localStorage
  getUsers: (): LocalUser[] => {
    const users = localStorage.getItem('blocktix_users');
    return users ? JSON.parse(users) : [];
  },

  // Save users to localStorage
  saveUsers: (users: LocalUser[]) => {
    localStorage.setItem('blocktix_users', JSON.stringify(users));
  },

  // Sign up a new user
  signup: (email: string, password: string, name: string, role: 'user' | 'organizer') => {
    const users = localAuth.getUsers();
    
    // Check if user already exists
    const existing = users.find(u => u.email === email);
    if (existing) {
      throw new Error('Email already registered');
    }

    // Create new user
    const newUser: LocalUser = {
      id: crypto.randomUUID(),
      email,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    // Save password separately (in real app, this should be hashed)
    const passwords = JSON.parse(localStorage.getItem('blocktix_passwords') || '{}');
    passwords[email] = password;
    localStorage.setItem('blocktix_passwords', JSON.stringify(passwords));

    // Save user
    users.push(newUser);
    localAuth.saveUsers(users);

    return newUser;
  },

  // Login user
  login: (email: string, password: string) => {
    const users = localAuth.getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const passwords = JSON.parse(localStorage.getItem('blocktix_passwords') || '{}');
    if (passwords[email] !== password) {
      throw new Error('Invalid email or password');
    }

    return user;
  },

  // Get current user
  getCurrentUser: (): LocalUser | null => {
    const currentUser = localStorage.getItem('blocktix_current_user');
    return currentUser ? JSON.parse(currentUser) : null;
  },

  // Set current user (login)
  setCurrentUser: (user: LocalUser) => {
    localStorage.setItem('blocktix_current_user', JSON.stringify(user));
  },

  // Logout
  logout: () => {
    localStorage.removeItem('blocktix_current_user');
  },

  // Check if user is logged in
  isAuthenticated: () => {
    return localAuth.getCurrentUser() !== null;
  }
};
