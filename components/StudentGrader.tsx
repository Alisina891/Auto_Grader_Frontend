"use client";

import { useState, type FormEvent } from "react";
import { gradeStudentExcel } from "../lib/api";

interface StudentGraderProps {
  grade: string;
}

interface GradeResult {
  success: boolean;
  student_name: string;
  attendance_number: string;
  email?: string;
  grade: string;
  filename: string;
  project_id: string;
  score: number;
  max_score: number;
  status: string;
  passed: boolean;

  checks?: {
    passed: number;
    total: number;
  };

  score_details?: unknown;
  errors?: unknown[];
  student_feedback?: unknown[];
  ai_feedback?: unknown;
  summary?: string;

  google_drive?: {
    uploaded: boolean;
    file_id?: string;
    file_name?: string;
    web_view_link?: string;
  };
}

const TOP_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2200&q=90";

export default function StudentGrader({
  grade,
}: StudentGraderProps) {
  const [studentName, setStudentName] = useState("");
  const [attendanceNumber, setAttendanceNumber] = useState("");
  const [email, setEmail] = useState("");
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);

  function getAIFeedback(data: GradeResult): string {
    if (!data.ai_feedback) {
      return "";
    }

    if (typeof data.ai_feedback === "string") {
      return data.ai_feedback;
    }

    if (
      typeof data.ai_feedback === "object" &&
      data.ai_feedback !== null
    ) {
      const feedback =
        data.ai_feedback as Record<string, unknown>;

      const fields = [
        "message",
        "feedback",
        "text",
        "content",
        "output_text",
      ];

      for (const field of fields) {
        if (typeof feedback[field] === "string") {
          return feedback[field] as string;
        }
      }
    }

    return "";
  }

  function getStudentFeedback(data: GradeResult): string {
    if (!Array.isArray(data.student_feedback)) {
      return "";
    }

    return data.student_feedback
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          typeof item === "object" &&
          item !== null
        ) {
          const obj =
            item as Record<string, unknown>;

          if (typeof obj.message === "string") {
            return obj.message;
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  function getFriendlyErrorMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    const duplicateEmail =
      lowerMessage.includes("email") &&
      (
        lowerMessage.includes("already") ||
        lowerMessage.includes("exist") ||
        lowerMessage.includes("duplicate") ||
        lowerMessage.includes("registered") ||
        lowerMessage.includes("submitted")
      );

    if (duplicateEmail) {
      return "شما قبلاً ثبت کرده‌اید؛ دیگر اجازه ارسال پروژه ندارید.";
    }

    const duplicateSubmission =
      lowerMessage.includes("already submitted") ||
      lowerMessage.includes("already graded") ||
      lowerMessage.includes("duplicate submission");

    if (duplicateSubmission) {
      return (
        "این پروژه قبلاً با مشخصات شما ثبت شده است و " +
        "دیگر اجازه ارسال مجدد ندارید."
      );
    }

    return (
      "در هنگام بررسی پروژه مشکلی به وجود آمد. " +
      "لطفاً کمی بعد دوباره تلاش کنید."
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!studentName.trim()) {
      setError("لطفاً نام و تخلص خود را وارد کنید.");
      return;
    }

    if (!attendanceNumber.trim()) {
      setError("لطفاً شماره حاضری خود را وارد کنید.");
      return;
    }

    if (!email.trim()) {
      setError("لطفاً ایمیل خود را وارد کنید.");
      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("لطفاً یک آدرس ایمیل معتبر وارد کنید.");
      return;
    }

    if (!projectId) {
      setError("لطفاً یکی از پروژه‌های 1 یا 2 را انتخاب کنید.");
      return;
    }

    if (!file) {
      setError("لطفاً فایل Excel پروژه را انتخاب کنید.");
      return;
    }

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xlsm")
    ) {
      setError(
        "فقط فایل‌های Excel با فرمت .xlsx یا .xlsm قابل قبول هستند."
      );
      return;
    }

    try {
      setLoading(true);

      const data = await gradeStudentExcel(
        grade,
        projectId,
        studentName.trim(),
        attendanceNumber.trim(),
        email.trim(),
        file
      );

      setResult(data);

      setTimeout(() => {
        document
          .getElementById("result-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 300);
    } catch (err) {
      if (err instanceof Error) {
        setError(
          getFriendlyErrorMessage(err.message)
        );
      } else {
        setError(
          "در هنگام بررسی پروژه مشکلی به وجود آمد. لطفاً کمی بعد دوباره تلاش کنید."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const aiFeedback = result
    ? getAIFeedback(result)
    : "";

  const studentFeedback = result
    ? getStudentFeedback(result)
    : "";

  const feedback =
    aiFeedback ||
    studentFeedback ||
    result?.summary ||
    "برای این پروژه بازخوردی ثبت نشده است.";

  const scorePercentage =
    result && result.max_score > 0
      ? Math.round(
          (result.score / result.max_score) * 100
        )
      : 0;

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-800"
    >
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 animate-backgroundZoom"
          style={{
            backgroundImage: `url("${TOP_BACKGROUND_IMAGE}")`,
          }}
        />

        <div className="absolute inset-0 bg-slate-950/80" />

        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-950/90 to-slate-950" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(6,182,212,0.22),transparent_25%),radial-gradient(circle_at_85%_25%,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.18),transparent_35%)]" />
      </div>

      {/* =====================================================
          ANIMATED LIGHTS
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-80px] top-[8%] h-64 w-64 rounded-full bg-cyan-400/20 blur-[80px] animate-orbOne" />

        <div className="absolute left-[-100px] top-[35%] h-72 w-72 rounded-full bg-blue-500/20 blur-[90px] animate-orbTwo" />

        <div className="absolute right-[8%] bottom-[8%] h-60 w-60 rounded-full bg-indigo-500/20 blur-[80px] animate-orbThree" />

        <div className="absolute left-[25%] top-[55%] h-40 w-40 rounded-full bg-cyan-300/10 blur-[60px] animate-orbFour" />

        <div className="absolute left-[12%] top-[22%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_25px_8px_rgba(34,211,238,0.65)] animate-ping" />

        <div className="absolute right-[18%] top-[48%] h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_25px_8px_rgba(59,130,246,0.65)] animate-pulse" />

        <div className="absolute left-[42%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_20px_6px_rgba(129,140,248,0.7)] animate-ping" />

        <div className="absolute right-[35%] top-[12%] h-1 w-1 rounded-full bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.5)] animate-pulse" />
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">

        {/* ===================================================
            HEADER
        ==================================================== */}

        <header className="mb-8 text-center animate-fadeUp sm:mb-12">
          <div className="mx-auto max-w-3xl">

            {/* Flying Wings Logo */}

            <div className="mb-7 flex justify-center">
              <div className="relative flex h-32 w-32 items-center justify-center">

                {/* Outer rotating ring */}

                <div className="absolute inset-0 rounded-full border border-cyan-300/20 animate-spinSlow" />

                <div className="absolute inset-2 rounded-full border border-dashed border-blue-300/20 animate-spinReverse" />

                {/* Glow */}

                <div className="absolute h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl animate-glowPulse" />

                {/* Logo */}

                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/20 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-logoFloat">

                  <svg
                    viewBox="0 0 64 64"
                    className="h-11 w-11 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 37C18 34 24 27 30 16C33 10 39 7 46 8C40 12 37 18 37 24C37 28 39 32 44 35C37 34 31 32 26 29C21 34 16 37 8 37Z"
                      fill="currentColor"
                    />

                    <path
                      d="M20 42C29 39 36 39 45 43C49 45 53 45 57 42C54 51 46 56 37 54C30 52 25 48 20 42Z"
                      fill="currentColor"
                      opacity="0.65"
                    />

                    <path
                      d="M29 29C34 31 39 31 44 29"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  </svg>

                </div>

                {/* Small orbit dots */}

                <span className="absolute right-0 top-5 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_15px_4px_rgba(34,211,238,0.7)] animate-pulse" />

                <span className="absolute bottom-4 left-1 h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_15px_4px_rgba(96,165,250,0.7)] animate-ping" />

              </div>
            </div>

            {/* Brand */}

            <div className="mb-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300 shadow-lg backdrop-blur-md sm:text-xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                Flying Wings
              </span>
            </div>

            <h1 className="bg-gradient-to-r from-white via-cyan-100 to-blue-300 bg-clip-text text-4xl font-black tracking-tight text-transparent drop-shadow-2xl sm:text-5xl lg:text-6xl">
              Auto Grader
            </h1>

            <p className="mx-auto mt-4 max-w-2xl px-3 text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
              فایل پروژه Excel خود را ارسال کنید تا سیستم
              به‌صورت خودکار پروژه شما را بررسی، نمره‌دهی
              و نتیجه را نمایش دهد.
            </p>

            {/* Grade */}

            <div className="mt-7 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-5 py-2.5 text-sm font-black text-white shadow-[0_15px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl animate-badgeGlow">

                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                </span>

                <span>
                  صنف {grade}
                </span>

                <span className="text-white/30">
                  •
                </span>

                <span className="text-cyan-300">
                  Online
                </span>

              </div>
            </div>

          </div>
        </header>

        {/* ===================================================
            STARTUP NOTICE
        ==================================================== */}

        <section className="mb-5 overflow-hidden rounded-[1.5rem] border border-amber-300/20 bg-gradient-to-br from-amber-950/60 to-orange-950/30 p-4 shadow-2xl backdrop-blur-xl animate-fadeUp delay-100 sm:rounded-3xl sm:p-6">

          <div className="flex items-start gap-3 sm:gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl shadow-inner animate-bounce">
              ⏳
            </div>

            <div className="min-w-0">
              <h2 className="font-black text-amber-200">
                لطفاً کمی صبر کنید
              </h2>

              <p className="mt-1.5 text-xs leading-6 text-amber-100/75 sm:text-sm">
                ممکن است سیستم در اولین درخواست تا حدود
                یک دقیقه زمان نیاز داشته باشد تا آماده شود.
              </p>

              <p className="mt-1.5 text-xs font-bold leading-6 text-amber-200 sm:text-sm">
                اگر خطایی دریافت کردید، کمی بعد دوباره تلاش کنید.
              </p>
            </div>

          </div>
        </section>

        {/* ===================================================
            INSTRUCTIONS
        ==================================================== */}

        <section className="mb-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl animate-fadeUp delay-200 sm:rounded-3xl sm:p-6">

          <div className="flex items-start gap-3 sm:gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
              📋
            </div>

            <div className="min-w-0 flex-1">

              <h2 className="text-base font-black text-white sm:text-lg">
                قبل از ارسال پروژه
              </h2>

              <ul className="mt-4 space-y-3 text-xs leading-6 text-white/65 sm:text-sm">

                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>
                    فایل اصلی Excel پروژه را ارسال کنید.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>
                    عکس یا فایل PDF قابل قبول نیست.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>
                    فرمت فایل باید
                    <b
                      dir="ltr"
                      className="mx-1 rounded bg-cyan-400/10 px-1.5 text-cyan-300"
                    >
                      .xlsx
                    </b>
                    یا
                    <b
                      dir="ltr"
                      className="mx-1 rounded bg-cyan-400/10 px-1.5 text-cyan-300"
                    >
                      .xlsm
                    </b>
                    باشد.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>
                    شماره پروژه را از بین پروژه‌های 1 یا 2 انتخاب کنید.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>
                    ایمیل معتبر خود را وارد کنید.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>
                    هر ایمیل فقط برای یک ارسال پروژه قابل استفاده است.
                  </span>
                </li>

              </ul>

            </div>
          </div>
        </section>

        {/* ===================================================
            FORM
        ==================================================== */}

        <section className="relative overflow-hidden rounded-[1.7rem] border border-white/40 bg-white/[0.97] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.4)] animate-fadeUp delay-300 sm:rounded-[2rem] sm:p-8">

          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />

          <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />

          <div className="relative">

            <div className="mb-7 flex items-center gap-3">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 text-2xl shadow-lg">
                📝
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                  ارسال پروژه
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  معلومات خود را وارد کرده و فایل Excel را انتخاب کنید.
                </p>
              </div>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 sm:space-y-6"
            >

              {/* Name */}

              <div>
                <label
                  htmlFor="studentName"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  👤 نام و تخلص
                </label>

                <input
                  id="studentName"
                  type="text"
                  value={studentName}
                  onChange={(e) =>
                    setStudentName(e.target.value)
                  }
                  placeholder="نام و تخلص خود را وارد کنید"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-1 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Attendance */}

              <div>
                <label
                  htmlFor="attendanceNumber"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  🔢 شماره حاضری
                </label>

                <input
                  id="attendanceNumber"
                  type="text"
                  value={attendanceNumber}
                  onChange={(e) =>
                    setAttendanceNumber(e.target.value)
                  }
                  placeholder="شماره حاضری خود را وارد کنید"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-1 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Email */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  ✉️ ایمیل
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="student@gmail.com"
                  autoComplete="email"
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-1 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-xs leading-6 text-slate-400">
                  ℹ️ هر ایمیل فقط یک بار برای ارسال پروژه قابل استفاده است.
                </p>
              </div>

              {/* =================================================
                  PROJECT SELECTION
              ================================================== */}

              <div>

                <label className="mb-3 block text-sm font-black text-slate-700">
                  📌 شماره پروژه
                </label>

                <div className="grid grid-cols-2 gap-3">

                  {/* Project 1 */}

                  <button
                    type="button"
                    onClick={() => {
                      setProjectId("1");
                      setError("");
                    }}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-300 sm:p-5 ${
                      projectId === "1"
                        ? "scale-[1.03] border-blue-500 bg-blue-50 shadow-[0_12px_35px_rgba(59,130,246,0.22)]"
                        : "border-slate-200 bg-slate-50 hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >

                    {projectId === "1" && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white animate-pop">
                        ✓
                      </span>
                    )}

                    <div
                      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all duration-300 ${
                        projectId === "1"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 animate-iconBounce"
                          : "bg-blue-100 text-blue-600 group-hover:scale-110"
                      }`}
                    >
                      1
                    </div>

                    <p className="mt-3 text-sm font-black text-slate-800">
                      پروژه 1
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Project One
                    </p>

                  </button>

                  {/* Project 2 */}

                  <button
                    type="button"
                    onClick={() => {
                      setProjectId("2");
                      setError("");
                    }}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-300 sm:p-5 ${
                      projectId === "2"
                        ? "scale-[1.03] border-indigo-500 bg-indigo-50 shadow-[0_12px_35px_rgba(99,102,241,0.22)]"
                        : "border-slate-200 bg-slate-50 hover:-translate-y-1 hover:border-indigo-300 hover:bg-indigo-50/50"
                    }`}
                  >

                    {projectId === "2" && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white animate-pop">
                        ✓
                      </span>
                    )}

                    <div
                      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all duration-300 ${
                        projectId === "2"
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 animate-iconBounce"
                          : "bg-indigo-100 text-indigo-600 group-hover:scale-110"
                      }`}
                    >
                      2
                    </div>

                    <p className="mt-3 text-sm font-black text-slate-800">
                      پروژه 2
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Project Two
                    </p>

                  </button>

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  لطفاً پروژه‌ای را انتخاب کنید که می‌خواهید ارسال کنید.
                </p>

              </div>

              {/* File */}

              <div>

                <label
                  htmlFor="excelFile"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  📊 فایل پروژه Excel
                </label>

                <label
                  htmlFor="excelFile"
                  className={`group relative flex min-h-[215px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[25px] border-2 border-dashed p-6 text-center transition-all duration-500 ${
                    file
                      ? "border-emerald-400 bg-emerald-50 shadow-[0_15px_40px_rgba(16,185,129,0.12)]"
                      : "border-slate-300 bg-gradient-to-b from-slate-50 to-blue-50/60 hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_15px_40px_rgba(59,130,246,0.12)]"
                  }`}
                >

                  <div className="absolute h-36 w-36 rounded-full bg-blue-400/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />

                  <div
                    className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg transition-all duration-500 group-hover:-translate-y-2 group-hover:rotate-3 group-hover:scale-110 ${
                      file
                        ? "bg-emerald-100"
                        : "bg-gradient-to-br from-blue-100 to-cyan-100"
                    }`}
                  >
                    {file ? "✓" : "📊"}
                  </div>

                  <p className="relative z-10 mt-4 max-w-full break-all px-3 text-sm font-black text-slate-800 sm:text-base">
                    {file
                      ? file.name
                      : "برای انتخاب فایل کلیک کنید"}
                  </p>

                  <p className="relative z-10 mt-2 text-xs leading-5 text-slate-500">
                    {file
                      ? "فایل انتخاب شد — آماده ارسال"
                      : "فایل Excel خود را انتخاب کنید"}
                  </p>

                  <div className="relative z-10 mt-3 flex items-center gap-2">

                    <span className="rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-600">
                      .xlsx
                    </span>

                    <span className="text-slate-300">
                      یا
                    </span>

                    <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-black text-indigo-600">
                      .xlsm
                    </span>

                  </div>

                  <input
                    id="excelFile"
                    type="file"
                    accept=".xlsx,.xlsm"
                    className="hidden"
                    onChange={(e) => {
                      setFile(
                        e.target.files?.[0] || null
                      );
                      setError("");
                    }}
                  />

                </label>
              </div>

              {/* Error */}

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 animate-errorShake">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-xl">
                    ⚠️
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-red-800">
                      توجه
                    </p>

                    <p className="mt-1 text-xs leading-6 text-red-700 sm:text-sm">
                      {error}
                    </p>
                  </div>

                </div>
              )}

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-4 text-sm font-black text-white shadow-[0_15px_40px_rgba(37,99,235,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {/* Shine */}

                <span className="absolute inset-y-0 -left-[120%] w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-700 group-hover:left-[140%]" />

                <span className="relative z-10 flex items-center justify-center gap-3">

                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      <span>
                        در حال بررسی پروژه...
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
                        🚀
                      </span>

                      <span>
                        بررسی و نمره‌دهی پروژه
                      </span>
                    </>
                  )}

                </span>

              </button>

            </form>
          </div>
        </section>

        {/* ===================================================
            RESULT
        ==================================================== */}

        {result && (
          <section
            id="result-section"
            className="mt-7 overflow-hidden rounded-[1.7rem] border border-white/30 bg-white/[0.97] shadow-[0_30px_100px_rgba(0,0,0,0.4)] animate-resultIn sm:mt-9 sm:rounded-[2rem]"
          >

            {/* Result Header */}

            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-10 text-center text-white">

              <div className="absolute right-[-70px] top-[-70px] h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />

              <div className="absolute bottom-[-80px] left-[-60px] h-52 w-52 rounded-full bg-indigo-500/25 blur-3xl animate-pulse" />

              <div className="relative">

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[25px] border border-white/20 bg-white/10 text-4xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl animate-resultIcon">

                  {result.passed ? "🎉" : "📘"}

                </div>

                <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                  نتیجه پروژه
                </h2>

                <p className="mt-2 break-words text-sm text-white/70">
                  {result.student_name}
                </p>

              </div>
            </div>

            <div className="p-4 sm:p-8">

              {/* Score Cards */}

              <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">

                {/* Score */}

                <div className="group rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 text-center shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-md transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                    🏆
                  </div>

                  <p className="mt-3 text-sm font-bold text-blue-700">
                    نمره
                  </p>

                  <div className="mt-1 text-4xl font-black text-blue-900 sm:text-5xl">
                    {result.score}

                    <span className="mx-1 text-xl text-blue-300">
                      /
                    </span>

                    {result.max_score}
                  </div>

                  <p className="mt-1 text-xs font-semibold text-blue-600">
                    از {result.max_score} نمره
                  </p>

                </div>

                {/* Percentage */}

                <div className="group rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 text-center shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-md transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                    📈
                  </div>

                  <p className="mt-3 text-sm font-bold text-emerald-700">
                    درصد موفقیت
                  </p>

                  <div className="mt-1 text-4xl font-black text-emerald-900 sm:text-5xl">
                    {scorePercentage}%
                  </div>

                  <div className="mx-auto mt-4 h-3 max-w-[180px] overflow-hidden rounded-full bg-emerald-100">

                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-[1500ms] ease-out"
                      style={{
                        width: `${Math.min(
                          scorePercentage,
                          100
                        )}%`,
                      }}
                    />

                  </div>
                </div>

                {/* Status */}

                <div className="group rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 text-center shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-md transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                    {result.passed ? "✅" : "🔧"}
                  </div>

                  <p className="mt-3 text-sm font-bold text-indigo-700">
                    وضعیت
                  </p>

                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${
                        result.passed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {result.passed ? "✓" : "!"}

                      {result.passed
                        ? "موفق"
                        : "نیاز به اصلاح"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    {result.status}
                  </p>

                </div>

              </div>

              {/* Checks */}

              {result.checks && (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm sm:mt-7 sm:p-6 animate-fadeUp">

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl animate-pulse">
                        🔍
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900">
                          بررسی‌های انجام‌شده
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          تعداد موارد بررسی‌شده توسط سیستم
                        </p>
                      </div>

                    </div>

                    <div className="shrink-0 rounded-2xl bg-blue-50 px-4 py-2.5 text-center shadow-sm">

                      <span className="text-xl font-black text-blue-900">
                        {result.checks.passed}
                      </span>

                      <span className="mx-1 text-slate-400">
                        /
                      </span>

                      <span className="font-bold text-slate-500">
                        {result.checks.total}
                      </span>

                    </div>

                  </div>
                </div>
              )}

              {/* Feedback */}

              <div className="mt-5 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-sm sm:mt-7 sm:p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl shadow-sm animate-pulse">
                    🤖
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      بازخورد سیستم
                    </h3>

                    <p className="text-xs text-slate-500">
                      پیشنهادها و نتیجه بررسی پروژه
                    </p>
                  </div>

                </div>

                <div className="mt-4 whitespace-pre-line rounded-2xl border border-white bg-white/80 p-4 text-sm leading-8 text-slate-700 shadow-sm">
                  {feedback}
                </div>

              </div>

              {/* Google Drive */}

              {result.google_drive?.uploaded && (
                <div className="mt-5 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm sm:mt-7">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
                        ☁️
                      </div>

                      <div>
                        <h3 className="font-black text-emerald-900">
                          فایل ذخیره شد
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-emerald-700">
                          پروژه شما با موفقیت در Google Drive ذخیره شد.
                        </p>
                      </div>

                    </div>

                    {result.google_drive.web_view_link && (
                      <a
                        href={
                          result.google_drive.web_view_link
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-700 sm:w-auto"
                      >
                        <span>☁️</span>
                        مشاهده فایل
                      </a>
                    )}

                  </div>
                </div>
              )}

            </div>
          </section>
        )}

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <footer className="py-10 text-center sm:py-14">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl shadow-xl backdrop-blur-xl animate-logoFloat">

            <svg
              viewBox="0 0 64 64"
              className="h-7 w-7 text-cyan-300"
              fill="currentColor"
            >
              <path d="M8 37C18 34 24 27 30 16C33 10 39 7 46 8C40 12 37 18 37 24C37 28 39 32 44 35C37 34 31 32 26 29C21 34 16 37 8 37Z" />

              <path
                d="M20 42C29 39 36 39 45 43C49 45 53 45 57 42C54 51 46 56 37 54C30 52 25 48 20 42Z"
                opacity="0.65"
              />
            </svg>

          </div>

          <p className="mt-4 text-sm font-black text-white/70">
            Flying Wings
          </p>

          <p className="mt-1 text-xs text-white/40">
            سامانه هوشمند نمره‌دهی پروژه‌های Excel
          </p>

          <div className="mx-auto mt-5 h-px max-w-xs bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

          <p className="mt-5 text-xs text-white/25">
            © {new Date().getFullYear()} Flying Wings
          </p>

        </footer>
      </div>

      {/* =====================================================
          ANIMATIONS
      ====================================================== */}

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          font-family: Tahoma, Arial, sans-serif;
          background: #020617;
        }

        input,
        button {
          font-family: inherit;
        }

        ::selection {
          background: rgba(34, 211, 238, 0.3);
          color: white;
        }

        /* Background */

        @keyframes backgroundZoom {
          0% {
            transform: scale(1.05);
          }

          50% {
            transform: scale(1.12);
          }

          100% {
            transform: scale(1.05);
          }
        }

        .animate-backgroundZoom {
          animation: backgroundZoom 18s ease-in-out infinite;
        }

        @keyframes orbOne {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(-80px, 60px) scale(1.25);
          }
        }

        .animate-orbOne {
          animation: orbOne 9s ease-in-out infinite;
        }

        @keyframes orbTwo {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(90px, -50px) scale(1.2);
          }
        }

        .animate-orbTwo {
          animation: orbTwo 11s ease-in-out infinite;
        }

        @keyframes orbThree {
          0%,
          100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(-60px, -70px) scale(1.15);
          }
        }

        .animate-orbThree {
          animation: orbThree 10s ease-in-out infinite;
        }

        @keyframes orbFour {
          0%,
          100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(50px, 40px) scale(1.2);
          }
        }

        .animate-orbFour {
          animation: orbFour 8s ease-in-out infinite;
        }

        /* Entrance */

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(35px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeUp {
          animation: fadeUp 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .delay-100 {
          animation-delay: 100ms;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }

        /* Logo */

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          25% {
            transform: translateY(-8px) rotate(-2deg);
          }

          50% {
            transform: translateY(-13px) rotate(2deg);
          }

          75% {
            transform: translateY(-6px) rotate(-1deg);
          }
        }

        .animate-logoFloat {
          animation: logoFloat 3.5s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.85);
          }

          50% {
            opacity: 0.9;
            transform: scale(1.2);
          }
        }

        .animate-glowPulse {
          animation: glowPulse 2.5s ease-in-out infinite;
        }

        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .animate-spinSlow {
          animation: spinSlow 10s linear infinite;
        }

        @keyframes spinReverse {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        .animate-spinReverse {
          animation: spinReverse 15s linear infinite;
        }

        @keyframes badgeGlow {
          0%,
          100% {
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
          }

          50% {
            box-shadow:
              0 15px 45px rgba(6, 182, 212, 0.18),
              0 0 25px rgba(34, 211, 238, 0.12);
          }
        }

        .animate-badgeGlow {
          animation: badgeGlow 2.5s ease-in-out infinite;
        }

        /* Selection */

        @keyframes pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }

          70% {
            transform: scale(1.2);
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-pop {
          animation: pop 0.35s ease-out both;
        }

        @keyframes iconBounce {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.12) rotate(4deg);
          }
        }

        .animate-iconBounce {
          animation: iconBounce 1.4s ease-in-out infinite;
        }

        /* Error */

        @keyframes errorShake {
          0%,
          100% {
            transform: translateX(0);
          }

          20% {
            transform: translateX(7px);
          }

          40% {
            transform: translateX(-7px);
          }

          60% {
            transform: translateX(5px);
          }

          80% {
            transform: translateX(-5px);
          }
        }

        .animate-errorShake {
          animation: errorShake 0.5s ease;
        }

        /* Result */

        @keyframes resultIn {
          from {
            opacity: 0;
            transform: translateY(55px) scale(0.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-resultIn {
          animation: resultIn 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes resultIcon {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-9px) rotate(3deg);
          }
        }

        .animate-resultIcon {
          animation: resultIcon 2.5s ease-in-out infinite;
        }

        /* Reduced Motion */

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Mobile */

        @media (max-width: 640px) {
          .animate-backgroundZoom {
            animation-duration: 25s;
          }

          .animate-orbOne {
            animation-duration: 12s;
          }

          .animate-orbTwo {
            animation-duration: 14s;
          }
        }

      `}</style>
    </main>
  );
}