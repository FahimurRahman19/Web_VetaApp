import { useRef, useState, useEffect, useCallback } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { 
  ImageIcon, 
  SendIcon, 
  XIcon, 
  VideoIcon, 
  SmileIcon,
  SparklesIcon,
  LanguagesIcon,
  FileTextIcon
} from "lucide-react";

const EMOJI_PICKER_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖",
  "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯",
  "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔",
  "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦",
  "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴",
  "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿",
  "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖",
  "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘",
  "👌", "🤏", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐",
  "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💪", "🦵",
  "🦶", "👂", "🦻", "👃", "👶", "👧", "🧒", "👦", "👩", "🧑",
  "👨", "👩‍🦱", "👨‍🦱", "👩‍🦰", "👨‍🦰", "👱‍♀️", "👱", "👩‍🦳", "👨‍🦳", "👩‍🦲",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️",
  "✝️", "☪️", "🕉", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐",
  "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐",
  "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳",
  "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️",
  "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️",
  "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️",
  "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❓", "❕",
  "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️",
  "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠",
  "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🈳", "🈂️", "🛂",
  "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶",
  "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🔢", "🔟", "🔢", "🔢",
];

function MessageInput({ replyingTo, onCancelReply }) {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSmartFeatures, setShowSmartFeatures] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, isSoundEnabled, selectedUser, sendTypingIndicator, stopTypingIndicator, getSmartReplies, translateMessage, summarizeMessages } = useChatStore();
  const { authUser } = useAuthStore();

  // Handle typing indicator
  useEffect(() => {
    if (text.trim() && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTypingIndicator();
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, isTyping, sendTypingIndicator, stopTypingIndicator]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageFile && !videoFile) return;

    if (isSoundEnabled) playRandomKeyStrokeSound();

    await sendMessage({
      text: text.trim(),
      imageFile,
      videoFile,
      replyTo: replyingTo?._id,
    });

    setText("");
    setImagePreview(null);
    setVideoPreview(null);
    setImageFile(null);
    setVideoFile(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (onCancelReply) onCancelReply();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size should be less than 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImageFile(file);
    setVideoFile(null);
    setVideoPreview(null);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video size should be less than 50MB");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    setVideoFile(file);
    setImageFile(null);
    setImagePreview(null);

    const reader = new FileReader();
    reader.onloadend = () => setVideoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSmartReplies = async () => {
    try {
      const replies = await getSmartReplies(selectedUser._id);
      setSmartReplies(replies);
      setShowSmartFeatures(true);
    } catch (error) {
      toast.error("Failed to get smart replies");
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) {
      toast.error("Please enter text to translate");
      return;
    }
    setIsTranslating(true);
    try {
      const translated = await translateMessage(text, "en");
      setTranslatedText(translated);
      setShowSmartFeatures(true);
    } catch (error) {
      toast.error("Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSummarize = async () => {
    try {
      const summary = await summarizeMessages(selectedUser._id);
      toast.success(`Summary: ${summary}`, { duration: 5000 });
    } catch (error) {
      toast.error("Failed to summarize conversation");
    }
  };

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 pt-3 pb-2 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-cyan-500 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-cyan-400">Replying to</span>
                <span className="text-xs text-slate-300">
                  {(replyingTo.senderId === authUser._id || 
                    replyingTo.senderId?._id === authUser._id ||
                    replyingTo.senderId?.toString() === authUser._id?.toString()) 
                    ? "You" 
                    : selectedUser?.fullName || "User"}
                </span>
              </div>
              <p className="text-sm text-slate-400 truncate">
                {replyingTo.text || (replyingTo.image ? "📷 Image" : replyingTo.video ? "🎥 Video" : "")}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="ml-2 p-1 hover:bg-slate-700 rounded transition-colors"
              type="button"
            >
              <XIcon className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Smart Features Panel */}
      {showSmartFeatures && (smartReplies.length > 0 || translatedText) && (
        <div className="px-4 pb-2 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            {smartReplies.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-2 font-semibold">Smart Replies:</p>
                <div className="flex flex-wrap gap-2">
                  {smartReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setText(reply);
                        setSmartReplies([]);
                        setShowSmartFeatures(false);
                      }}
                      className="text-xs px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {translatedText && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-semibold">Translation:</p>
                <p className="text-sm text-slate-300">{translatedText}</p>
                <button
                  onClick={() => {
                    setText(translatedText);
                    setTranslatedText("");
                    setShowSmartFeatures(false);
                  }}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Use translation
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowSmartFeatures(false);
                setSmartReplies([]);
                setTranslatedText("");
              }}
              className="mt-2 text-xs text-slate-400 hover:text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Media Previews */}
      {(imagePreview || videoPreview) && (
        <div className="px-4 pb-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-700"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 border border-slate-700"
                  type="button"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            {videoPreview && (
              <div className="relative">
                <video
                  src={videoPreview}
                  className="w-24 h-24 object-cover rounded-lg border border-slate-700"
                  controls={false}
                />
                <button
                  onClick={() => {
                    setVideoPreview(null);
                    setVideoFile(null);
                    if (videoInputRef.current) videoInputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 border border-slate-700"
                  type="button"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 max-w-4xl mx-auto">
        <div className="flex items-end gap-2">
          {/* Emoji Picker Button */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <SmileIcon className="w-5 h-5" />
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 w-80 h-64 bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-3 overflow-y-auto z-50">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_PICKER_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-1.5 hover:bg-slate-700 rounded text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (isSoundEnabled) playRandomKeyStrokeSound();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 placeholder-slate-500"
            placeholder={replyingTo ? "Type your reply..." : "Type your message..."}
            rows={1}
          />

          {/* Media Buttons */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            onChange={handleVideoChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors ${
              imageFile ? "text-cyan-500" : ""
            }`}
            title="Upload image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className={`p-2 bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors ${
              videoFile ? "text-cyan-500" : ""
            }`}
            title="Upload video"
          >
            <VideoIcon className="w-5 h-5" />
          </button>

          {/* Smart Features Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowSmartFeatures(!showSmartFeatures)}
              className="p-2 bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Smart features"
            >
              <SparklesIcon className="w-5 h-5" />
            </button>
            {showSmartFeatures && (
              <div className="absolute bottom-full mb-2 right-0 bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-2 z-50 min-w-48">
                <button
                  type="button"
                  onClick={handleSmartReplies}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded text-sm text-slate-300 text-left"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Smart Replies
                </button>
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating || !text.trim()}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded text-sm text-slate-300 text-left disabled:opacity-50"
                >
                  <LanguagesIcon className="w-4 h-4" />
                  {isTranslating ? "Translating..." : "Translate"}
                </button>
                <button
                  type="button"
                  onClick={handleSummarize}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded text-sm text-slate-300 text-left"
                >
                  <FileTextIcon className="w-4 h-4" />
                  Summarize Chat
                </button>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!text.trim() && !imageFile && !videoFile}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;
