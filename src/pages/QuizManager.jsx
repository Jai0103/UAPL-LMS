const SHEET_ID = "1MdUCAUVkK55_qcNTl3ez64WgNUGr5rvQw09fAyUh56U";
const PORTAL_URL = "https://jai0103.github.io/UAPL-LMS/";

const TRAINING_CATEGORIES = [
  "General UAS Knowledge",
  "Principles of Flight",
  "Air Law",
  "Navigation and Meteorology",
  "Human Factors",
  "Safety and Operations"
];

const SHEETS = {
  users: "Users",
  questions: "Questions",
  flashcards: "Flashcards",
  courseNotes: "CourseNotes",
  quizResults: "QuizResults"
};

const HEADERS = {
  Users: ["id", "name", "username", "email", "passwordHash", "role", "status", "expiryDate", "createdAt", "lastLogin"],
  Questions: ["id", "category", "question", "optionA", "optionB", "optionC", "optionD", "answer", "explanation", "status"],
  Flashcards: ["id", "category", "question", "answer", "explanation", "status"],
  CourseNotes: ["id", "title", "url", "status", "createdAt"],
  QuizResults: ["id", "userId", "username", "score", "total", "accuracy", "submittedAt", "categoryBreakdown"]
};

function setupSheets() {
  Object.keys(HEADERS).forEach(function(name) {
    const sheet = getSheet(name);
    ensureSheetHeaders(sheet, HEADERS[name]);
  });

  createFirstAdmin();

  return "Sheets checked. Headers are ready.";
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : "";
    const payload = e && e.parameter && e.parameter.payload
      ? JSON.parse(e.parameter.payload)
      : {};

    let result;

    switch (action) {
      case "login":
        result = login(payload);
        break;

      case "getBootstrap":
        result = getBootstrap();
        break;

      case "saveUsers":
        result = saveUsers(payload);
        break;

      case "saveQuestions":
        result = saveQuestions(payload);
        break;

      case "saveFlashcards":
        result = saveFlashcards(payload);
        break;

      case "saveCourseNotes":
        result = saveCourseNotes(payload);
        break;

      case "submitQuizResult":
        result = submitQuizResult(payload);
        break;

      case "sendLoginEmail":
        result = sendLoginEmail(payload);
        break;

      case "approveAndSendActivationEmail":
        result = approveAndSendActivationEmail(payload);
        break;

      case "registerUser":
        result = registerUser(payload);
        break;

      case "requestPasswordReset":
        result = requestPasswordReset(payload);
        break;

      case "generateFlashcardsFromQuestions":
        result = {
          success: true,
          count: generateFlashcardsFromQuestionsNow(),
          message: "Flashcards generated from questions."
        };
        break;

      default:
        result = {
          success: false,
          message: "Unknown API action."
        };
    }

    return json(result);
  } catch (error) {
    return json({
      success: false,
      message: error.message
    });
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  ensureSheetHeaders(sheet, HEADERS[name] || []);

  return sheet;
}

function ensureSheetHeaders(sheet, expectedHeaders) {
  if (!expectedHeaders || !expectedHeaders.length) return;

  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    return;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(header) {
      return String(header || "").trim();
    });

  if (currentHeaders.join("") === "") {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    return;
  }

  const missingHeaders = expectedHeaders.filter(function(header) {
    return currentHeaders.indexOf(header) === -1;
  });

  if (missingHeaders.length) {
    sheet
      .getRange(1, lastColumn + 1, 1, missingHeaders.length)
      .setValues([missingHeaders]);
  }

  sheet.setFrozenRows(1);
}

function readSheet(name) {
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });

  return values
    .slice(1)
    .filter(function(row) {
      return row.some(Boolean);
    })
    .map(function(row) {
      const item = {};

      headers.forEach(function(header, index) {
        if (header) {
          item[header] = row[index];
        }
      });

      return item;
    });
}

function writeSheet(name, rows) {
  const sheet = getSheet(name);
  const lastColumn = sheet.getLastColumn();

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(header) {
      return String(header || "").trim();
    });

  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }

  if (!rows || !rows.length) return;

  const values = rows.map(function(item) {
    return headers.map(function(header) {
      return item[header] !== undefined && item[header] !== null ? item[header] : "";
    });
  });

  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );

  return digest.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return value.toString(16).padStart(2, "0");
  }).join("");
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeCategory(category) {
  const value = String(category || "").trim();

  if (TRAINING_CATEGORIES.indexOf(value) !== -1) {
    return value;
  }

  return "General UAS Knowledge";
}

function isMainAdminAccount(user) {
  const username = normalizeUsername(user.username);
  const id = String(user.id || "");

  return username === "admin" ||
    username === "jairus" ||
    id === "admin-001" ||
    id === "3714a0ef-41a8-454d-b037-38fa591b1345";
}

function isReservedUsername(username) {
  const value = normalizeUsername(username);
  return value === "admin" || value === "jairus";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validateStrongPassword(password) {
  const value = String(password || "");

  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(value)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";

  return "";
}

function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "UAPL-";

  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

function addOneMonthDate(value) {
  const date = value ? new Date(value) : new Date();

  if (isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 1);
    return fallback.toISOString().slice(0, 10);
  }

  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function answerToNumber(answer) {
  const value = String(answer || "").trim().toUpperCase();

  if (value === "A" || value === "0") return 0;
  if (value === "B" || value === "1") return 1;
  if (value === "C" || value === "2") return 2;
  if (value === "D" || value === "3") return 3;

  return 0;
}

function answerToLetter(answer) {
  const value = String(answer || "").trim().toUpperCase();

  if (value === "A" || value === "B" || value === "C" || value === "D") {
    return value;
  }

  return ["A", "B", "C", "D"][Number(answer)] || "A";
}

function parseCategoryBreakdown(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function createFirstAdmin() {
  const users = readSheet(SHEETS.users);

  const adminExists = users.some(function(user) {
    return isMainAdminAccount(user);
  });

  if (adminExists) return;

  users.push({
    id: "admin-001",
    name: "Jairus Admin",
    username: "admin",
    email: "",
    passwordHash: hashPassword("welcome1+@2026"),
    role: "admin",
    status: "Active",
    expiryDate: "",
    createdAt: new Date().toISOString(),
    lastLogin: ""
  });

  writeSheet(SHEETS.users, users);
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    expiryDate: user.expiryDate,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
}

function login(payload) {
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");
  const users = enforceStudentExpiry();

  const user = users.find(function(item) {
    return normalizeUsername(item.username) === username;
  });

  if (!user || user.passwordHash !== hashPassword(password)) {
    return {
      success: false,
      message: "Invalid username or password."
    };
  }

  if (String(user.status || "").toLowerCase() !== "active") {
    return {
      success: false,
      message: "This account is inactive or pending admin approval."
    };
  }

  user.lastLogin = new Date().toISOString();

  writeSheet(SHEETS.users, users.map(function(item) {
    return String(item.id) === String(user.id) ? user : item;
  }));

  return {
    success: true,
    user: safeUser(user)
  };
}

function getBootstrap() {
  const users = enforceStudentExpiry().map(safeUser);

  const questions = readSheet(SHEETS.questions)
    .filter(function(item) {
      return String(item.status || "Active") !== "Inactive";
    })
    .map(function(item) {
      return {
        id: item.id,
        category: normalizeCategory(item.category),
        question: item.question,
        options: [item.optionA, item.optionB, item.optionC, item.optionD],
        answer: answerToNumber(item.answer),
        explanation: item.explanation,
        status: item.status || "Active"
      };
    });

  const flashcards = readSheet(SHEETS.flashcards)
    .filter(function(item) {
      return String(item.status || "Active") !== "Inactive";
    })
    .map(function(item) {
      return {
        id: item.id,
        category: normalizeCategory(item.category),
        question: item.question,
        answer: item.answer,
        explanation: item.explanation,
        status: item.status || "Active"
      };
    });

  const courseNotes = readSheet(SHEETS.courseNotes)
    .filter(function(item) {
      return String(item.status || "Active") !== "Inactive";
    });

  const quizResults = readSheet(SHEETS.quizResults)
    .map(function(item) {
      return {
        id: item.id,
        userId: item.userId,
        username: item.username,
        score: item.score,
        total: item.total,
        accuracy: item.accuracy,
        submittedAt: item.submittedAt,
        categoryBreakdown: parseCategoryBreakdown(item.categoryBreakdown)
      };
    });

  return {
    success: true,
    users: users,
    questions: questions,
    flashcards: flashcards,
    courseNotes: courseNotes,
    quizResults: quizResults
  };
}

function saveUsers(payload) {
  const existingUsers = readSheet(SHEETS.users);
  const incomingUsers = payload.users || [];
  const emailsToSend = [];

  const rows = incomingUsers.map(function(user, index) {
    const username = normalizeUsername(user.username);

    const existing = existingUsers.find(function(item) {
      return String(item.id) === String(user.id);
    });

    const isMainAdmin = isMainAdminAccount(user);
    const role = isMainAdmin ? "admin" : "student";
    const plainPassword = String(user.password || "");
    const status = isMainAdmin ? "Active" : user.status || "Inactive";

    let expiryDate = "";

    if (role === "student") {
      expiryDate = user.expiryDate || "";

      if (String(status).toLowerCase() === "active" && !expiryDate) {
        expiryDate = addOneMonthDate(user.createdAt || new Date());
      }
    }

    const row = {
      id: user.id || "user-" + Date.now() + "-" + index,
      name: user.name || "",
      username: username,
      email: String(user.email || "").trim().toLowerCase(),
      passwordHash: plainPassword
        ? hashPassword(plainPassword)
        : existing && existing.passwordHash
          ? existing.passwordHash
          : hashPassword("password123"),
      role: role,
      status: status,
      expiryDate: role === "admin" ? "" : expiryDate,
      createdAt: user.createdAt || (existing && existing.createdAt ? existing.createdAt : new Date().toISOString()),
      lastLogin: existing && existing.lastLogin ? existing.lastLogin : ""
    };

    if (!existing && row.email && plainPassword) {
      emailsToSend.push({
        name: row.name,
        email: row.email,
        username: row.username,
        password: plainPassword,
        role: row.role,
        expiryDate: row.expiryDate
      });
    }

    return row;
  });

  writeSheet(SHEETS.users, rows);

  emailsToSend.forEach(function(user) {
    sendWelcomeEmail(user);
  });

  return {
    success: true,
    message: "Users saved.",
    count: rows.length,
    emailsSent: emailsToSend.length
  };
}

function registerUser(payload) {
  const name = String(payload.name || "").trim();
  const username = normalizeUsername(payload.username);
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const notRobot = payload.notRobot === true || String(payload.notRobot) === "true";
  const website = String(payload.website || "").trim();
  const startedAt = Number(payload.startedAt || 0);

  if (website) {
    return {
      success: false,
      message: "Registration could not be completed."
    };
  }

  if (!notRobot) {
    return {
      success: false,
      message: "Please confirm that you are not a robot."
    };
  }

  if (startedAt && Date.now() - startedAt < 3000) {
    return {
      success: false,
      message: "Please review the form before submitting."
    };
  }

  if (!name) return { success: false, message: "Full name is required." };
  if (!username) return { success: false, message: "Username is required." };
  if (username.length < 4) return { success: false, message: "Username must be at least 4 characters." };

  if (isReservedUsername(username)) {
    return {
      success: false,
      message: "This username is reserved. Please choose another username."
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "A valid email address is required."
    };
  }

  const passwordError = validateStrongPassword(password);

  if (passwordError) {
    return {
      success: false,
      message: passwordError
    };
  }

  const users = readSheet(SHEETS.users);

  const usernameExists = users.some(function(user) {
    return normalizeUsername(user.username) === username;
  });

  if (usernameExists) {
    return {
      success: false,
      message: "This username is already taken."
    };
  }

  const emailExists = users.some(function(user) {
    return String(user.email || "").trim().toLowerCase() === email;
  });

  if (emailExists) {
    return {
      success: false,
      message: "This email address is already registered."
    };
  }

  const newUser = {
    id: "user-" + Date.now(),
    name: name,
    username: username,
    email: email,
    passwordHash: hashPassword(password),
    role: "student",
    status: "Inactive",
    expiryDate: "",
    createdAt: new Date().toISOString(),
    lastLogin: ""
  };

  users.push(newUser);
  writeSheet(SHEETS.users, users);

  sendRegistrationReceivedEmail(newUser);

  return {
    success: true,
    message: "Registration submitted. Your account is pending admin approval."
  };
}

function approveAndSendActivationEmail(payload) {
  const userId = String(payload.userId || "").trim();
  const users = readSheet(SHEETS.users);

  const user = users.find(function(item) {
    return String(item.id) === userId;
  });

  if (!user) {
    return {
      success: false,
      message: "User was not found."
    };
  }

  if (!user.email) {
    return {
      success: false,
      message: "This user has no email address."
    };
  }

  if (isMainAdminAccount(user)) {
    return {
      success: false,
      message: "Admin account does not need approval."
    };
  }

  user.role = "student";
  user.status = "Active";
  user.expiryDate = user.expiryDate || addOneMonthDate(new Date());

  writeSheet(SHEETS.users, users.map(function(item) {
    return String(item.id) === userId ? user : item;
  }));

  sendLoginAccessEmail(user);

  return {
    success: true,
    message: "Student approved and activation email sent.",
    user: safeUser(user)
  };
}

function sendLoginEmail(payload) {
  const userId = String(payload.userId || "").trim();
  const users = readSheet(SHEETS.users);

  const user = users.find(function(item) {
    return String(item.id) === userId;
  });

  if (!user) {
    return {
      success: false,
      message: "User was not found."
    };
  }

  if (!user.email) {
    return {
      success: false,
      message: "This user has no email address."
    };
  }

  if (String(user.status || "").toLowerCase() !== "active") {
    return {
      success: false,
      message: "This account is inactive. Activate the user before sending the access email."
    };
  }

  sendLoginAccessEmail(user);

  return {
    success: true,
    message: "Activation email sent successfully. The password was not changed.",
    user: safeUser(user)
  };
}

function requestPasswordReset(payload) {
  const identity = String(payload.identity || "").trim().toLowerCase();
  const users = readSheet(SHEETS.users);

  const user = users.find(function(item) {
    return normalizeUsername(item.username) === identity ||
      String(item.email || "").trim().toLowerCase() === identity;
  });

  if (user && user.email && String(user.status || "").toLowerCase() === "active") {
    const temporaryPassword = generateTemporaryPassword();

    user.passwordHash = hashPassword(temporaryPassword);

    writeSheet(SHEETS.users, users.map(function(item) {
      return String(item.id) === String(user.id) ? user : item;
    }));

    sendPasswordResetEmail(user, temporaryPassword);
  }

  return {
    success: true,
    message: "If an active account matches your details, a password reset email has been sent."
  };
}

function saveQuestions(payload) {
  const rows = (payload.questions || []).map(function(item, index) {
    const options = item.options || [];

    return {
      id: item.id || "question-" + Date.now() + "-" + index,
      category: normalizeCategory(item.category),
      question: item.question || "",
      optionA: options[0] || item.optionA || "",
      optionB: options[1] || item.optionB || "",
      optionC: options[2] || item.optionC || "",
      optionD: options[3] || item.optionD || "",
      answer: answerToLetter(item.answer),
      explanation: item.explanation || "",
      status: item.status || "Active"
    };
  });

  writeSheet(SHEETS.questions, rows);

  return {
    success: true,
    message: "Questions saved."
  };
}

function saveFlashcards(payload) {
  const rows = (payload.flashcards || []).map(function(item, index) {
    return {
      id: item.id || "flashcard-" + Date.now() + "-" + index,
      category: normalizeCategory(item.category),
      question: item.question || "",
      answer: item.answer || "",
      explanation: item.explanation || "",
      status: item.status || "Active"
    };
  });

  writeSheet(SHEETS.flashcards, rows);

  return {
    success: true,
    message: "Flashcards saved."
  };
}

function saveCourseNotes(payload) {
  const rows = (payload.courseNotes || []).map(function(item, index) {
    return {
      id: item.id || "note-" + Date.now() + "-" + index,
      title: item.title || "",
      url: item.url || "",
      status: item.status || "Active",
      createdAt: item.createdAt || new Date().toISOString()
    };
  });

  writeSheet(SHEETS.courseNotes, rows);

  return {
    success: true,
    message: "Course notes saved."
  };
}

function submitQuizResult(payload) {
  const rows = readSheet(SHEETS.quizResults);

  rows.push({
    id: "result-" + Date.now(),
    userId: payload.userId || "",
    username: payload.username || "",
    score: payload.score || 0,
    total: payload.total || 0,
    accuracy: payload.accuracy || 0,
    submittedAt: new Date().toISOString(),
    categoryBreakdown: JSON.stringify(payload.categoryBreakdown || [])
  });

  writeSheet(SHEETS.quizResults, rows);

  return {
    success: true,
    message: "Quiz result saved."
  };
}

function enforceStudentExpiry() {
  const users = readSheet(SHEETS.users);
  const now = new Date();
  let changed = false;

  const updatedUsers = users.map(function(user) {
    if (isMainAdminAccount(user)) {
      if (user.role !== "admin" || user.status !== "Active" || user.expiryDate) {
        changed = true;
      }

      user.role = "admin";
      user.status = "Active";
      user.expiryDate = "";
      return user;
    }

    if (user.role !== "student") {
      changed = true;
    }

    user.role = "student";

    const status = String(user.status || "").toLowerCase();
    const createdAt = user.createdAt ? new Date(user.createdAt) : null;

    if (!createdAt || isNaN(createdAt.getTime())) {
      return user;
    }

    let expiryDate;

    if (user.expiryDate) {
      expiryDate = new Date(user.expiryDate);
    } else {
      expiryDate = new Date(createdAt);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    expiryDate.setHours(23, 59, 59, 999);

    if (status === "active" && now > expiryDate) {
      changed = true;
      user.status = "Inactive";
      user.expiryDate = expiryDate.toISOString().slice(0, 10);
      return user;
    }

    if (!user.expiryDate && status === "active") {
      changed = true;
      user.expiryDate = expiryDate.toISOString().slice(0, 10);
    }

    return user;
  });

  if (changed) {
    writeSheet(SHEETS.users, updatedUsers);
  }

  return updatedUsers;
}

function sendWelcomeEmail(user) {
  const accessText = user.role === "admin"
    ? "Administrator access does not expire."
    : user.expiryDate
      ? "Your access is valid until " + user.expiryDate + "."
      : "Your access is valid for 1 month from account creation.";

  const htmlBody = getEmailShell(
    "UAPL Training Portal Access",
    "Your account has been created. You may now sign in to begin your training.",
    '<p>Hi <strong>' + escapeHtml(user.name) + '</strong>,</p>' +
    '<p>Your access to the UAPL Training Portal is ready. Please use the login details below.</p>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px;margin:22px 0;">' +
    '<p><strong>Username:</strong> ' + escapeHtml(user.username) + '</p>' +
    '<p><strong>Password:</strong> ' + escapeHtml(user.password) + '</p>' +
    '<p><strong>Role:</strong> ' + escapeHtml(user.role) + '</p>' +
    '</div>' +
    buttonHtml("Sign In to UAPL Portal", PORTAL_URL) +
    '<p><strong>Access Notice:</strong><br>' + escapeHtml(accessText) + '</p>' +
    '<p>Please keep your login details confidential.</p>'
  );

  MailApp.sendEmail({
    to: user.email,
    subject: "Welcome to the UAPL Training Portal",
    body:
      "Hi " + user.name + ",\n\n" +
      "Your UAPL Training Portal account has been created.\n\n" +
      "Username: " + user.username + "\n" +
      "Password: " + user.password + "\n" +
      "Role: " + user.role + "\n\n" +
      "Sign in here: " + PORTAL_URL + "\n\n" +
      accessText,
    htmlBody: htmlBody,
    name: "Apollo Global Academy"
  });
}

function sendRegistrationReceivedEmail(user) {
  const htmlBody = getEmailShell(
    "UAPL Training Portal Registration",
    "Your registration request has been received.",
    '<p>Hi <strong>' + escapeHtml(user.name) + '</strong>,</p>' +
    '<p>Your registration request has been received. Your account is currently pending admin approval.</p>' +
    '<div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:14px;padding:18px;margin:18px 0;">' +
    '<p><strong>Username:</strong> ' + escapeHtml(user.username) + '</p>' +
    '<p><strong>Status:</strong> Pending approval</p>' +
    '</div>' +
    '<p>You will be able to sign in once your account has been activated by the administrator.</p>' +
    buttonHtml("Open Training Portal", PORTAL_URL)
  );

  MailApp.sendEmail({
    to: user.email,
    subject: "Registration Received - UAPL Training Portal",
    body: "Hi " + user.name + ", your registration has been received and is pending admin approval.",
    htmlBody: htmlBody,
    name: "Apollo Global Academy"
  });
}

function sendLoginAccessEmail(user) {
  const expiryText = user.expiryDate
    ? "Your access is valid until " + user.expiryDate + "."
    : "Your administrator access does not expire.";

  const htmlBody = getEmailShell(
    "UAPL Training Portal Access",
    "Your account is now active.",
    '<p>Hi <strong>' + escapeHtml(user.name || user.username) + '</strong>,</p>' +
    '<p>Your UAPL Training Portal account is now active. You may sign in using the username below and the password you created during registration.</p>' +
    '<div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:14px;padding:18px;margin:18px 0;">' +
    '<p><strong>Username:</strong> ' + escapeHtml(user.username) + '</p>' +
    '<p><strong>Status:</strong> Active</p>' +
    '</div>' +
    buttonHtml("Sign In to Training Portal", PORTAL_URL) +
    '<p><strong>Access Notice:</strong><br>' + escapeHtml(expiryText) + '</p>' +
    '<p>If you forgot your password, please use the Forgot Password option on the sign-in page.</p>'
  );

  MailApp.sendEmail({
    to: user.email,
    subject: "Your UAPL Training Portal Access Is Active",
    body:
      "Hi " + (user.name || user.username) + ",\n\n" +
      "Your UAPL Training Portal account is now active.\n\n" +
      "Username: " + user.username + "\n" +
      "Sign in using the password you created during registration.\n\n" +
      "Login: " + PORTAL_URL + "\n\n" +
      expiryText,
    htmlBody: htmlBody,
    name: "Apollo Global Academy"
  });
}

function sendPasswordResetEmail(user, temporaryPassword) {
  const htmlBody = getEmailShell(
    "Password Reset",
    "Your UAPL Training Portal password has been reset.",
    '<p>Hi <strong>' + escapeHtml(user.name || user.username) + '</strong>,</p>' +
    '<p>Please use the temporary password below.</p>' +
    '<div style="background:#f8fbff;border:1px solid #dbeafe;border-radius:14px;padding:18px;margin:18px 0;">' +
    '<p><strong>Username:</strong> ' + escapeHtml(user.username) + '</p>' +
    '<p><strong>Temporary Password:</strong> ' + escapeHtml(temporaryPassword) + '</p>' +
    '</div>' +
    buttonHtml("Sign In", PORTAL_URL) +
    '<p>Please keep your login details confidential.</p>'
  );

  MailApp.sendEmail({
    to: user.email,
    subject: "Password Reset - UAPL Training Portal",
    body:
      "Username: " + user.username + "\n" +
      "Temporary Password: " + temporaryPassword + "\n" +
      "Login: " + PORTAL_URL,
    htmlBody: htmlBody,
    name: "Apollo Global Academy"
  });
}

function buttonHtml(label, url) {
  return (
    '<div style="text-align:center;margin:28px 0;">' +
    '<a href="' + url + '" target="_blank" ' +
    'style="display:inline-block;background:#0b5ed7;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;">' +
    escapeHtml(label) +
    '</a>' +
    '</div>'
  );
}

function getEmailShell(title, subtitle, bodyHtml) {
  return (
    '<div style="margin:0;padding:0;background:#f4f8fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">' +
    '<div style="max-width:640px;margin:0 auto;padding:32px 18px;">' +
    '<div style="background:#ffffff;border:1px solid #dbe7f3;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.12);">' +
    '<div style="background:linear-gradient(135deg,#0b5ed7,#0ea5e9);padding:28px;color:#ffffff;">' +
    '<h1 style="margin:0;font-size:24px;">Apollo Global Academy</h1>' +
    '<p style="margin:8px 0 0;font-size:14px;opacity:0.92;">' + escapeHtml(title) + '</p>' +
    '</div>' +
    '<div style="padding:28px;font-size:15px;line-height:1.7;color:#334155;">' +
    '<p style="margin-top:0;color:#475569;">' + escapeHtml(subtitle) + '</p>' +
    bodyHtml +
    '</div>' +
    '<div style="background:#f8fafc;padding:18px 28px;font-size:12px;color:#64748b;">' +
    'Regards,<br>Apollo Global Academy' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateFlashcardsFromQuestionsNow() {
  const questions = readSheet(SHEETS.questions);

  const generatedFlashcards = questions
    .filter(function(item) {
      return String(item.status || "Active") !== "Inactive";
    })
    .map(function(item, index) {
      const answerLetter = answerToLetter(item.answer);
      const answerText = item["option" + answerLetter] || "";

      return {
        id: "flash-" + (index + 1),
        category: normalizeCategory(item.category),
        question: item.question || "",
        answer: answerText,
        explanation: item.explanation || "",
        status: "Active"
      };
    });

  writeSheet(SHEETS.flashcards, generatedFlashcards);

  return generatedFlashcards.length;
}

function testStudentExpiry() {
  enforceStudentExpiry();
}

function testSetup() {
  setupSheets();
}
