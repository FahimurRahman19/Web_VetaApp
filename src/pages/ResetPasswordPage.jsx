import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { LockIcon, LoaderIcon, ArrowLeftIcon, KeyIcon, MailIcon, RefreshCwIcon } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const [formData, setFormData] = useState({ email: emailFromUrl, code: "", newPassword: "", confirmPassword: "" });
  const [step, setStep] = useState(1); // 1: verify code, 2: reset password
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { verifyResetCode, resetPassword, forgotPassword, isVerifyingCode, isResettingPassword, isRequestingReset } = useAuthStore();

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    const success = await verifyResetCode(formData.email, formData.code);
    if (success) {
      setStep(2);
      setError("");
    } else {
      setError("Invalid or expired code. Please try again or request a new code.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const success = await resetPassword(formData.email, formData.code, formData.newPassword);
    if (success) {
      navigate("/login");
    } else {
      setError("Failed to reset password. The code may have expired. Please request a new code.");
      // Go back to step 1 to allow resending code
      setStep(1);
      setFormData({ ...formData, code: "", newPassword: "", confirmPassword: "" });
    }
  };

  const handleResendCode = async () => {
    setError("");
    setFormData({ ...formData, code: "" });
    const success = await forgotPassword(formData.email);
    if (success) {
      // Code will be sent, user can try again
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setError("");
    setFormData({ ...formData, code: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-6xl md:h-[800px] h-[650px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row">
            {/* FORM COLUMN - LEFT SIDE */}
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                {/* HEADING TEXT */}
                <div className="text-center mb-8">
                  <KeyIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">
                    {step === 1 ? "Verify Reset Code" : "Reset Password"}
                  </h2>
                  <p className="text-slate-400">
                    {step === 1
                      ? "Enter the code sent to your email"
                      : "Enter your new password"}
                  </p>
                </div>

                {/* STEP 1: VERIFY CODE */}
                {step === 1 && (
                  <form onSubmit={handleVerifyCode} className="space-y-6">
                    {/* EMAIL INPUT */}
                    <div>
                      <label className="auth-input-label">Email</label>
                      <div className="relative">
                        <MailIcon className="auth-input-icon" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            setError("");
                          }}
                          className="input"
                          placeholder="johndoe@gmail.com"
                          required
                        />
                      </div>
                    </div>

                    {/* CODE INPUT */}
                    <div>
                      <label className="auth-input-label">Reset Code</label>
                      <div className="relative">
                        <KeyIcon className="auth-input-icon" />
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => {
                            setFormData({ ...formData, code: e.target.value.replace(/\D/g, "").slice(0, 6) });
                            setError("");
                          }}
                          className="input text-center text-2xl tracking-widest font-mono"
                          placeholder="000000"
                          maxLength={6}
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Enter the 6-digit code from your email</p>
                    </div>

                    {/* ERROR MESSAGE */}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button className="auth-btn" type="submit" disabled={isVerifyingCode || formData.code.length !== 6}>
                      {isVerifyingCode ? (
                        <LoaderIcon className="w-full h-5 animate-spin text-center" />
                      ) : (
                        "Verify Code"
                      )}
                    </button>

                    {/* RESEND CODE BUTTON */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isRequestingReset || !formData.email}
                        className="text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                      >
                        {isRequestingReset ? (
                          <>
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <RefreshCwIcon className="w-4 h-4" />
                            Resend Code
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: RESET PASSWORD */}
                {step === 2 && (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    {/* NEW PASSWORD INPUT */}
                    <div>
                      <label className="auth-input-label">New Password</label>
                      <div className="relative">
                        <LockIcon className="auth-input-icon" />
                        <input
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => {
                            setFormData({ ...formData, newPassword: e.target.value });
                            setError("");
                          }}
                          className="input"
                          placeholder="Enter new password"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    {/* CONFIRM PASSWORD INPUT */}
                    <div>
                      <label className="auth-input-label">Confirm Password</label>
                      <div className="relative">
                        <LockIcon className="auth-input-icon" />
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => {
                            setFormData({ ...formData, confirmPassword: e.target.value });
                            setError("");
                          }}
                          className="input"
                          placeholder="Confirm new password"
                          required
                          minLength={6}
                        />
                      </div>
                      {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                        <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    {/* ERROR MESSAGE */}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button
                      className="auth-btn"
                      type="submit"
                      disabled={isResettingPassword || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 6}
                    >
                      {isResettingPassword ? (
                        <LoaderIcon className="w-full h-5 animate-spin text-center" />
                      ) : (
                        "Reset Password"
                      )}
                    </button>

                    {/* BACK BUTTON */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleBackToStep1}
                        disabled={isResettingPassword}
                        className="text-sm text-slate-400 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Code Verification
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 text-center space-y-2">
                  <Link to="/login" className="auth-link flex items-center justify-center gap-2">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>

            {/* FORM ILLUSTRATION - RIGHT SIDE */}
            <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div>
                <img
                  src="/login.png"
                  alt="Password reset"
                  className="w-full h-auto object-contain"
                />
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-medium text-cyan-400">Secure Password Reset</h3>

                  <div className="mt-4 flex justify-center gap-4">
                    <span className="auth-badge">Secure</span>
                    <span className="auth-badge">Verified</span>
                    <span className="auth-badge">Protected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}
export default ResetPasswordPage;

