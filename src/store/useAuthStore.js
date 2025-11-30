import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isRequestingReset: false,
  isVerifyingCode: false,
  isResettingPassword: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });

      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response.data.message);
    }
  },

  forgotPassword: async (email) => {
    set({ isRequestingReset: true });
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "Reset code sent to your email");
      return true;
    } catch (error) {
      // Show more specific error messages
      const errorMessage = error.response?.data?.message || error.message || "Failed to send reset code";
      
      // Check for sender verification error
      if (errorMessage.toLowerCase().includes("sender address not verified") || 
          errorMessage.toLowerCase().includes("not verified")) {
        toast.error(
          "Email sender not verified. For testing, use 'onboarding@resend.dev' in your .env file. Check RESEND_SETUP.md for details.",
          { duration: 8000 }
        );
      } else if (error.response?.data?.error === "EMAIL_SEND_FAILED") {
        toast.error(errorMessage, { duration: 5000 });
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please check your email configuration or try again later.", { duration: 5000 });
      } else {
        toast.error(errorMessage, { duration: 5000 });
      }
      
      console.error("Forgot password error:", error);
      return false;
    } finally {
      set({ isRequestingReset: false });
    }
  },

  verifyResetCode: async (email, code) => {
    set({ isVerifyingCode: true });
    try {
      const res = await axiosInstance.post("/auth/verify-reset-code", { email, code });
      toast.success(res.data.message || "Code verified successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired code");
      return false;
    } finally {
      set({ isVerifyingCode: false });
    }
  },

  resetPassword: async (email, code, newPassword) => {
    set({ isResettingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/reset-password", { email, code, newPassword });
      toast.success(res.data.message || "Password reset successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      return false;
    } finally {
      set({ isResettingPassword: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      withCredentials: true, // this ensures cookies are sent with the connection
    });

    socket.connect();

    set({ socket });

    // listen for online users event
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
