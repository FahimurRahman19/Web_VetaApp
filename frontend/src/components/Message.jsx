import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { 
  SmileIcon, 
  ReplyIcon, 
  CheckIcon, 
  CheckCheckIcon,
  PlayIcon,
  DownloadIcon,
  XIcon
} from "lucide-react";

const EMOJI_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢", "🔥"];

function Message({ message, onReply }) {
  const { authUser } = useAuthStore();
  const { addReaction, removeReaction } = useChatStore();
  const [showReactions, setShowReactions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const isOwnMessage = message.senderId === authUser._id || message.senderId?._id === authUser._id;
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;
  // Handle both string and ObjectId comparisons
  const userReaction = message.reactions?.[authUser._id] || message.reactions?.[authUser._id?.toString()];

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = messageDate.getTime() === today.getTime();
    const isYesterday = messageDate.getTime() === yesterday.getTime();

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    const dateStr = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${dateStr} at ${timeStr}`;
    }
  };

  const handleReactionClick = (emoji) => {
    if (userReaction === emoji) {
      removeReaction(message._id);
    } else {
      addReaction(message._id, emoji);
    }
    setShowReactions(false);
  };

  const handleImageClick = () => {
    if (message.image && !imageError) {
      window.open(message.image, "_blank");
    }
  };

  const handleVideoClick = () => {
    if (message.video && !videoError) {
      window.open(message.video, "_blank");
    }
  };

  return (
    <div
      className={`group flex flex-col mb-4 ${
        isOwnMessage ? "items-end" : "items-start"
      }`}
    >
      {/* Reply Preview */}
      {message.replyTo && (
        <div
          className={`mb-1 px-3 py-2 rounded-lg border-l-4 ${
            isOwnMessage
              ? "bg-cyan-500/20 border-cyan-500 text-cyan-200"
              : "bg-slate-700/50 border-slate-500 text-slate-300"
          } max-w-md text-sm`}
        >
          <div className="flex items-center gap-1 mb-1">
            <ReplyIcon className="w-3 h-3" />
            <span className="font-semibold text-xs">
              {(message.replyTo.senderId === authUser._id || 
                message.replyTo.senderId?._id === authUser._id ||
                message.replyTo.senderId?.toString() === authUser._id?.toString()) 
                ? "You" 
                : message.replyTo.senderName || "User"}
            </span>
          </div>
          <p className="text-xs truncate">
            {message.replyTo.text || (message.replyTo.image ? "📷 Image" : message.replyTo.video ? "🎥 Video" : "")}
          </p>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`relative flex gap-2 max-w-[70%] md:max-w-[60%] ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar (optional, only for received messages) */}
        {!isOwnMessage && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {message.senderName?.[0]?.toUpperCase() || "U"}
          </div>
        )}

        {/* Message Content */}
        <div
          className={`relative rounded-2xl px-4 py-2 shadow-lg ${
            isOwnMessage
              ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-br-sm"
              : "bg-slate-800 text-slate-200 rounded-bl-sm"
          }`}
        >
          {/* Media Content */}
          {(message.image || message.video) && (
            <div className="mb-2 -mx-4 -mt-2">
              {message.image && !imageError ? (
                <div className="relative group/media">
                  <img
                    src={message.image}
                    alt="Shared"
                    className="max-w-full max-h-96 w-auto h-auto object-contain rounded-t-2xl cursor-pointer"
                    onClick={handleImageClick}
                    onError={() => setImageError(true)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/20 transition-colors rounded-t-2xl flex items-center justify-center opacity-0 group-hover/media:opacity-100">
                    <DownloadIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : message.video && !videoError ? (
                <div className="relative group/media">
                  <video
                    src={message.video}
                    controls
                    className="max-w-full max-h-96 w-auto h-auto rounded-t-2xl"
                    onError={() => setVideoError(true)}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm opacity-75">
                  Failed to load media
                </div>
              )}
            </div>
          )}

          {/* Text Content */}
          {message.text && (
            <p className={`whitespace-pre-wrap break-words ${message.image || message.video ? "mt-2" : ""}`}>
              {message.text}
            </p>
          )}

          {/* Timestamp and Read Receipt */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs opacity-75">
              {formatTimestamp(message.createdAt)}
            </span>
            {isOwnMessage && (
              <div className="ml-1">
                {message.readAt ? (
                  <CheckCheckIcon className="w-4 h-4 text-blue-300" title="Read" />
                ) : message.deliveredAt ? (
                  <CheckCheckIcon className="w-4 h-4 opacity-50" title="Delivered" />
                ) : (
                  <CheckIcon className="w-4 h-4 opacity-50" title="Sent" />
                )}
              </div>
            )}
          </div>

          {/* Reactions */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-2 -mb-1">
              {Object.entries(message.reactions).map(([userId, emoji]) => (
                <span
                  key={userId}
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    userId === authUser._id
                      ? "bg-white/20"
                      : isOwnMessage
                      ? "bg-white/10"
                      : "bg-slate-700/50"
                  }`}
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons (shown on hover) */}
          <div
            className={`absolute top-0 ${
              isOwnMessage ? "-left-20" : "-right-20"
            } flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Add reaction"
              >
                <SmileIcon className="w-4 h-4" />
              </button>

              {/* Emoji Picker Dropdown */}
              {showReactions && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 rounded-lg p-2 shadow-xl border border-slate-700 flex gap-1 z-10">
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className={`p-1.5 rounded hover:bg-slate-700 text-lg transition-colors ${
                        userReaction === emoji ? "bg-cyan-500/20" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  {userReaction && (
                    <button
                      onClick={() => handleReactionClick(userReaction)}
                      className="p-1.5 rounded hover:bg-slate-700 text-sm transition-colors border border-slate-600"
                      title="Remove reaction"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reply"
            >
              <ReplyIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Message;

