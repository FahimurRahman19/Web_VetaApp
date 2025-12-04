import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
  typingUsers: [], // Array of user IDs who are typing

  toggleSound: () => {
    const next = !get().isSoundEnabled;
    localStorage.setItem("isSoundEnabled", next);
    set({ isSoundEnabled: next });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load contacts";
      toast.error(message);
      console.error("getAllContacts error:", error);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load chats";
      toast.error(message);
      console.error("getMyChatPartners error:", error);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      const message = error.response?.data?.message || "Something went wrong";
      toast.error(message);
      console.error("getMessagesByUserId error:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();

    if (!selectedUser || !authUser) {
      toast.error("No conversation selected");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const isVideo = messageData.videoFile;
    const isImage = messageData.imageFile;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.imagePreview || null,
      video: messageData.videoPreview || null,
      replyTo: messageData.replyTo || null,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      reactions: {},
    };

    // immediately update the UI
    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const formData = new FormData();
      if (messageData.text) formData.append("text", messageData.text);
      if (messageData.imageFile) formData.append("media", messageData.imageFile);
      if (messageData.videoFile) formData.append("media", messageData.videoFile);
      if (messageData.replyTo) formData.append("replyTo", messageData.replyTo);

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // replace optimistic message with actual message
      set((state) => ({
        messages: state.messages.map((m) => (m._id === tempId ? res.data : m)),
      }));
    } catch (error) {
      // remove optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));

      const message = error.response?.data?.message || "Failed to send message";
      toast.error(message);
      console.error("sendMessage error:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // New message handler
    socket.on("newMessage", (newMessage) => {
      const isMessageFromSelectedUser =
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id;
      if (!isMessageFromSelectedUser) return;

      set((state) => {
        // Check if message already exists (avoid duplicates)
        const exists = state.messages.some((m) => m._id === newMessage._id);
        if (exists) return state;
        return { messages: [...state.messages, newMessage] };
      });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    // Typing indicator handler
    socket.on("userTyping", ({ userId, isTyping }) => {
      if (userId !== selectedUser._id) return;

      set((state) => {
        if (isTyping) {
          return {
            typingUsers: state.typingUsers.includes(userId)
              ? state.typingUsers
              : [...state.typingUsers, userId],
          };
        } else {
          return {
            typingUsers: state.typingUsers.filter((id) => id !== userId),
          };
        }
      });
    });

    // Message reaction handler
    socket.on("messageReaction", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      }));
    });

    // Read receipt handler
    socket.on("messageDelivered", ({ messageId, deliveredAt }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, deliveredAt } : m
        ),
      }));
    });

    socket.on("messagesRead", ({ userId, readAt }) => {
      if (userId !== selectedUser._id) return;

      set((state) => ({
        messages: state.messages.map((m) =>
          m.senderId === useAuthStore.getState().authUser._id &&
          m.receiverId === userId &&
          !m.readAt
            ? { ...m, readAt }
            : m
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("userTyping");
    socket.off("messageReaction");
    socket.off("messageDelivered");
    socket.off("messagesRead");
  },

  sendTypingIndicator: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!selectedUser || !socket) return;

    socket.emit("typing", { receiverId: selectedUser._id });
  },

  stopTypingIndicator: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!selectedUser || !socket) return;

    socket.emit("stopTyping", { receiverId: selectedUser._id });
  },

  addReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, {
        emoji,
      });

      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      }));
    } catch (error) {
      toast.error("Failed to add reaction");
      console.error("addReaction error:", error);
    }
  },

  removeReaction: async (messageId) => {
    try {
      const message = get().messages.find((m) => m._id === messageId);
      if (!message) return;

      const userReaction = message.reactions?.[useAuthStore.getState().authUser._id];
      if (!userReaction) return;

      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, {
        emoji: userReaction,
      });

      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      }));
    } catch (error) {
      toast.error("Failed to remove reaction");
      console.error("removeReaction error:", error);
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.post(`/messages/read/${userId}`);
    } catch (error) {
      console.error("markMessagesAsRead error:", error);
    }
  },

  getSmartReplies: async (userId) => {
    try {
      // Mock smart replies - replace with actual AI integration
      const { messages } = get();
      const recentMessages = messages
        .filter((m) => m.senderId === userId)
        .slice(-3)
        .map((m) => m.text)
        .filter(Boolean);

      // Simple context-based replies
      const smartReplies = [];
      if (recentMessages.length > 0) {
        const lastMessage = recentMessages[recentMessages.length - 1].toLowerCase();
        if (lastMessage.includes("hello") || lastMessage.includes("hi")) {
          smartReplies.push("Hey!", "Hello!", "Hi there!");
        } else if (lastMessage.includes("how are you")) {
          smartReplies.push("I'm doing great, thanks!", "All good!", "Pretty good!");
        } else if (lastMessage.includes("thank")) {
          smartReplies.push("You're welcome!", "No problem!", "Anytime!");
        } else {
          smartReplies.push("Got it!", "Sounds good!", "Okay!");
        }
      }

      return smartReplies.slice(0, 3);
    } catch (error) {
      console.error("getSmartReplies error:", error);
      return [];
    }
  },

  translateMessage: async (text, targetLang = "en") => {
    try {
      // Mock translation - replace with actual translation API (Google Translate, DeepL, etc.)
      // For now, return the same text
      toast.info("Translation feature - integrate with translation API");
      return text;
    } catch (error) {
      console.error("translateMessage error:", error);
      throw error;
    }
  },

  summarizeMessages: async (userId) => {
    try {
      // Mock summarization - replace with actual AI summarization
      const { messages } = get();
      const conversationMessages = messages.filter(
        (m) =>
          (m.senderId === userId || m.receiverId === userId) &&
          m.text
      );

      if (conversationMessages.length === 0) {
        return "No messages to summarize";
      }

      const topics = conversationMessages
        .slice(-10)
        .map((m) => m.text)
        .join(" ");

      // Simple mock summary
      return `Recent conversation includes ${conversationMessages.length} messages. Main topics discussed: ${topics.substring(0, 100)}...`;
    } catch (error) {
      console.error("summarizeMessages error:", error);
      throw error;
    }
  },
}));
