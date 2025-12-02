import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import Message from "./Message";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    markMessagesAsRead,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollTimeoutRef = useRef(null);

  // Check if user is near bottom of scroll
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < threshold);
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  }, []);

  // Load messages and subscribe
  useEffect(() => {
    if (!selectedUser?._id) return;
    
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    markMessagesAsRead(selectedUser._id);

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages, markMessagesAsRead]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Only auto-scroll if user is near bottom or if it's their own message
      const lastMessage = messages[messages.length - 1];
      const shouldAutoScroll = isNearBottom || lastMessage.senderId === authUser._id;
      
      if (shouldAutoScroll) {
        // Clear any pending scroll
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Small delay to ensure DOM is updated
        scrollTimeoutRef.current = setTimeout(() => {
          scrollToBottom(true);
        }, 100);
      }
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, isNearBottom, authUser._id, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isMessagesLoading && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isMessagesLoading, scrollToBottom]);

  // Handle reply
  const handleReply = useCallback((message) => {
    setReplyingTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt);
      const dateKey = messageDate.toDateString();

      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = {
          date: dateKey,
          dateLabel: formatDateLabel(messageDate),
          messages: [],
        };
        groups.push(currentGroup);
      }

      currentGroup.messages.push(message);
    });

    return groups;
  };

  const formatDateLabel = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <>
      <ChatHeader />
      
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={checkScrollPosition}
        className="flex-1 px-4 md:px-6 overflow-y-auto py-4 scroll-smooth"
      >
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-6">
                  <div className="px-4 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <span className="text-xs text-slate-400 font-medium">
                      {group.dateLabel}
                    </span>
                  </div>
                </div>

                {/* Messages in this group */}
                <div className="space-y-1">
                  {group.messages.map((msg) => (
                    <Message
                      key={msg._id}
                      message={{
                        ...msg,
                        senderName: msg.senderId === authUser._id 
                          ? authUser.fullName 
                          : selectedUser?.fullName || "User",
                      }}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.includes(selectedUser?._id) && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {selectedUser?.fullName?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser?.fullName} />
        )}
      </div>

      {/* Message Input */}
      <MessageInput 
        replyingTo={replyingTo} 
        onCancelReply={handleCancelReply}
      />
    </>
  );
}

export default ChatContainer;
