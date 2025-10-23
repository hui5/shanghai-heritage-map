"use client";

import { Github, Mail, X } from "lucide-react";
import { useId, useState } from "react";
import { useAuthStore } from "../../helper/store/authStore";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGithub, signInWithEmailOTP, verifyEmailOTP, isLoading } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [step, setStep] = useState<"method" | "email" | "otp">("method");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const emailId = useId();
  const otpId = useId();

  const handleClose = () => {
    setStep("method");
    setEmail("");
    setOtpToken("");
    setMessage("");
    setError("");
    onClose();
  };

  const handleGithubLogin = async () => {
    const { error } = await signInWithGithub();
    if (error) {
      setError("GitHub 登录失败，请重试");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }

    const { error } = await signInWithEmailOTP(email);
    if (error) {
      setError("发送验证码失败，请重试");
    } else {
      setMessage("验证码已发送到您的邮箱，请查收");
      setStep("otp");
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpToken.trim()) {
      setError("请输入验证码");
      return;
    }

    const { error } = await verifyEmailOTP(email, otpToken);
    if (error) {
      setError("验证码错误，请重试");
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] border-0 cursor-default"
        onClick={handleClose}
        aria-label="关闭登录窗口"
      />

      {/* 弹窗内容 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-800">登录</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {step === "method" && (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">选择登录方式</p>

              {/* GitHub 登录 */}
              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <Github className="w-5 h-5" />
                )}
                <span>使用 GitHub 登录</span>
              </button>

              {/* 邮箱 OTP 登录 */}
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>使用邮箱验证码登录</span>
              </button>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  邮箱地址
                </label>
                <input
                  type="email"
                  id={emailId}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入您的邮箱地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("method")}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  返回
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "发送中..." : "发送验证码"}
                </button>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor={otpId}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  验证码
                </label>
                <input
                  type="text"
                  id={otpId}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="请输入6位验证码"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  验证码已发送到 <span className="font-medium">{email}</span>
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtpToken("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  重新发送
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "验证中..." : "验证登录"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
