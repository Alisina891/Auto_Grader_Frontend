export const API_BASE_URL =
  "https://auto-grader-82jf.onrender.com";

/* =========================================================
   FETCH HELPER
========================================================= */

const REQUEST_TIMEOUT = 60000;
const MAX_RETRIES = 2;

async function waitBeforeRetry(attempt: number) {
  const delay = 2000 * (attempt + 1);

  await new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (
        (
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500
        ) &&
        attempt < MAX_RETRIES
      ) {
        await waitBeforeRetry(attempt);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      lastError = error;

      if (attempt < MAX_RETRIES) {
        await waitBeforeRetry(attempt);
        continue;
      }

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "ارتباط با سرور بیش از حد طول کشید. لطفاً کمی بعد دوباره تلاش کنید."
        );
      }

      throw new Error(
        "ارتباط با سرور برقرار نشد. لطفاً اینترنت خود را بررسی کرده و دوباره تلاش کنید."
      );
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error("ارتباط با سرور برقرار نشد.")
  );
}


/* =========================================================
   RESPONSE HANDLER
========================================================= */

async function handleResponse(response: Response) {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(
        `سرور با خطای ${response.status} پاسخ داد.`
      );
    }

    throw new Error(
      "پاسخ نامعتبر از سرور دریافت شد."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        `سرور با خطای ${response.status} پاسخ داد.`
    );
  }

  return data;
}


/* =========================================================
   STUDENT - EXCEL
========================================================= */

export async function gradeStudentExcel(
  grade: string,
  projectId: string,
  studentName: string,
  attendanceNumber: string,
  email: string,
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

  const url =
    `${API_BASE_URL}/grade/${encodeURIComponent(grade)}/excel` +
    `?project_id=${encodeURIComponent(projectId)}` +
    `&student_name=${encodeURIComponent(studentName)}` +
    `&attendance_number=${encodeURIComponent(attendanceNumber)}` +
    `&email=${encodeURIComponent(email)}`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}


/* =========================================================
   STUDENT - WORD
========================================================= */

export async function gradeStudentWord(
  grade: string,
  projectId: string,
  studentName: string,
  attendanceNumber: string,
  email: string,
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

  const url =
    `${API_BASE_URL}/grade/${encodeURIComponent(grade)}/word` +
    `?project_id=${encodeURIComponent(projectId)}` +
    `&student_name=${encodeURIComponent(studentName)}` +
    `&attendance_number=${encodeURIComponent(attendanceNumber)}` +
    `&email=${encodeURIComponent(email)}`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}


/* =========================================================
   TEACHER - CREATE EXCEL PROJECT
========================================================= */

export async function createTeacherProject(
  projectId: string,
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

  const url =
    `${API_BASE_URL}/teacher/create-project` +
    `?project_id=${encodeURIComponent(projectId)}`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}


/* =========================================================
   TEACHER - CREATE WORD PROJECT
========================================================= */

export async function createTeacherWordProject(
  projectId: string,
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

  const url =
    `${API_BASE_URL}/teacher/create-word-project` +
    `?project_id=${encodeURIComponent(projectId)}`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}