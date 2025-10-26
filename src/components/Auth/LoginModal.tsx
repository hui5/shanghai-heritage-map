"use client";

import { Github, Mail, X } from "lucide-react";
import { useId, useState } from "react";
import { useAuthStore } from "../../helper/supabase/authStore";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGithub, signInWithEmailOTP, verifyEmailOTP, isLoading } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const emailId = useId();
  const otpId = useId();

  const handleClose = () => {
    setEmail("");
    setOtpToken("");
    setEmailSent(false);
    setError("");
    setMessage("");
    setIsGithubLoading(false);
    setIsEmailLoading(false);
    onClose();
  };

  const handleGithubLogin = async () => {
    console.log("GitHub login clicked");
    setError("");
    setIsGithubLoading(true);

    try {
      const { error } = await signInWithGithub();
      console.log("GitHub login result:", error);

      if (error) {
        setError("GitHub 登录失败，请重试");
        setIsGithubLoading(false);
      }
      // 如果没有错误，页面会重定向到 GitHub
      // loading 状态会保持在 true，直到用户从 GitHub 返回或关闭模态框
    } catch (err) {
      console.error("GitHub login error:", err);
      setError("GitHub 登录失败，请重试");
      setIsGithubLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }

    setIsEmailLoading(true);
    try {
      const { error } = await signInWithEmailOTP(email);
      if (error) {
        setError("发送验证码失败，请重试");
      } else {
        setMessage("验证码已发送，请查收邮件");
        setEmailSent(true);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpToken.trim()) {
      setError("请输入验证码");
      return;
    }

    setIsEmailLoading(true);
    try {
      const { error } = await verifyEmailOTP(email, otpToken);
      if (error) {
        setError("验证码错误，请重试");
      } else {
        handleClose();
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setOtpToken("");

    const { error } = await signInWithEmailOTP(email);
    if (error) {
      setError("重新发送失败，请重试");
    } else {
      setMessage("验证码已重新发送");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <button
        type="button"
        className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md z-[2000] border-0 cursor-default transition-all duration-300"
        onClick={handleClose}
        aria-label="关闭登录窗口"
      />

      {/* 弹窗内容 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-[90vw] max-w-[450px] bg-white rounded-[24px] shadow-lg border border-gray-200 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* 头部 */}
        <div className="relative flex items-center justify-between px-8 py-3 border-b border-gray-200">
          {/* 左上角柔和阴影 */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-gray-200/30 rounded-full blur-3xl pointer-events-none" />
          {/* 右上角柔和阴影 */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gray-200/30 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-xl font-medium text-gray-900 tracking-tight relative z-10">
            登录
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative z-10"
            title="关闭"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="relative p-8 space-y-7">
          {/* GitHub 登录 */}
          <div className="space-y-5">
            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={isGithubLoading}
              className="group w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl hover:from-gray-800 hover:to-gray-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGithubLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
              <span>使用 GitHub 登录</span>
            </button>

            {/* 分割线 */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  或使用邮箱登录
                </span>
              </div>
            </div>
          </div>

          {/* 邮箱验证码登录 */}
          <form
            onSubmit={emailSent ? handleVerify : handleSendCode}
            className="space-y-5"
          >
            {/* 邮箱输入 */}
            <div className="space-y-3">
              <label
                htmlFor={emailId}
                className="block text-sm font-semibold text-gray-700"
              >
                邮箱地址
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-transform group-focus-within:-translate-y-[60%] group-focus-within:scale-90">
                  <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  id={emailId}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="your@email.com"
                  disabled={emailSent || isEmailLoading}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50/50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white focus:shadow-lg transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 text-gray-800 font-medium"
                  required
                />
              </div>
            </div>

            {/* 验证码输入 */}
            {emailSent && (
              <div className="space-y-3 animate-in slide-in-from-top-3 duration-300">
                <label
                  htmlFor={otpId}
                  className="block text-sm font-semibold text-gray-700"
                >
                  验证码
                </label>
                <input
                  type="text"
                  id={otpId}
                  value={otpToken}
                  onChange={(e) => {
                    setOtpToken(e.target.value);
                    setError("");
                  }}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white focus:shadow-lg transition-all duration-200 text-center text-2xl tracking-[0.5em] font-bold font-mono text-gray-800 placeholder:text-gray-300"
                  required
                />
                <p className="text-xs text-gray-500 flex items-center gap-1.5 justify-center">
                  <span>未收到验证码？</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 hover:underline-offset-4 transition-all"
                  >
                    重新发送
                  </button>
                </p>
              </div>
            )}

            {/* 错误和成功消息 */}
            {error && (
              <div className="text-red-700 text-sm bg-red-50 p-4 rounded-2xl border-2 border-red-100 animate-in slide-in-from-top-2 duration-200 font-medium shadow-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="text-green-700 text-sm bg-green-50 p-4 rounded-2xl border-2 border-green-100 animate-in slide-in-from-top-2 duration-200 font-medium shadow-sm">
                {message}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isEmailLoading}
              className="group w-full px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isEmailLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{emailSent ? "验证中..." : "发送中..."}</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>{emailSent ? "验证登录" : "发送验证码"}</span>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
