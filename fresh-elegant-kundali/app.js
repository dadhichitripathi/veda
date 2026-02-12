const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "IN" },
  { code: "+1", country: "USA/Canada", flag: "US" },
  { code: "+44", country: "United Kingdom", flag: "GB" },
  { code: "+971", country: "UAE", flag: "AE" },
  { code: "+65", country: "Singapore", flag: "SG" },
  { code: "+61", country: "Australia", flag: "AU" },
  { code: "+49", country: "Germany", flag: "DE" },
  { code: "+966", country: "Saudi Arabia", flag: "SA" },
  { code: "+974", country: "Qatar", flag: "QA" },
  { code: "+60", country: "Malaysia", flag: "MY" },
  { code: "+64", country: "New Zealand", flag: "NZ" },
  { code: "+33", country: "France", flag: "FR" },
  { code: "+977", country: "Nepal", flag: "NP" },
  { code: "+880", country: "Bangladesh", flag: "BD" },
];

const PHASES = [
  { progress: 20, message: "Casting your birth chart..." },
  { progress: 40, message: "Analyzing planetary positions..." },
  { progress: 60, message: "Calculating dasha periods..." },
  { progress: 80, message: "Finding personalized insights..." },
  { progress: 100, message: "Your Lumina blueprint is ready." },
];

const MOON_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const SIGN_PROFILE = {
  Aries: {
    emoji: "♈",
    trait: "initiative and direct action",
    fact: "Aries Moon often responds quickly and courageously to emotional triggers.",
  },
  Taurus: {
    emoji: "♉",
    trait: "stability and comfort",
    fact: "Taurus Moon usually values routines, consistency, and emotional grounding.",
  },
  Gemini: {
    emoji: "♊",
    trait: "curiosity and mental agility",
    fact: "Gemini Moon tends to process emotions through thought and conversation.",
  },
  Cancer: {
    emoji: "♋",
    trait: "nurturing and emotional memory",
    fact: "Cancer Moon is often highly intuitive and deeply connected to home/family.",
  },
  Leo: {
    emoji: "♌",
    trait: "warm expression and heart-led confidence",
    fact: "Leo Moon can thrive when appreciation and creativity are present.",
  },
  Virgo: {
    emoji: "♍",
    trait: "precision and practical care",
    fact: "Virgo Moon often seeks calm through structure, service, and clarity.",
  },
  Libra: {
    emoji: "♎",
    trait: "harmony and partnership awareness",
    fact: "Libra Moon tends to balance emotions through fairness and connection.",
  },
  Scorpio: {
    emoji: "♏",
    trait: "depth and transformation",
    fact: "Scorpio Moon often experiences emotions intensely and values authenticity.",
  },
  Sagittarius: {
    emoji: "♐",
    trait: "optimism and meaning-seeking",
    fact: "Sagittarius Moon is usually energized by purpose and exploration.",
  },
  Capricorn: {
    emoji: "♑",
    trait: "discipline and responsibility",
    fact: "Capricorn Moon can be resilient, strategic, and long-term oriented.",
  },
  Aquarius: {
    emoji: "♒",
    trait: "individuality and perspective",
    fact: "Aquarius Moon often regulates emotions through logic and objectivity.",
  },
  Pisces: {
    emoji: "♓",
    trait: "intuition and sensitivity",
    fact: "Pisces Moon can absorb emotional environments strongly and deeply.",
  },
};

const CITY_HINTS = [
  "Delhi, India",
  "Mumbai, India",
  "Bangalore, India",
  "Kolkata, India",
  "Chennai, India",
  "Pune, India",
  "Hyderabad, India",
  "Jaipur, India",
  "Lucknow, India",
  "Ahmedabad, India",
  "New Delhi, India",
  "London, UK",
  "Dubai, UAE",
  "Singapore",
  "Sydney, Australia",
];

const state = {
  view: "onboarding",
  onboarding: null,
  pendingPayload: null,
  sessionId: null,
  dataReady: false,
  resultData: null,
  questions: [],
  progress: 0,
  answeredQuestions: 0,
  activeQuestionIndex: null,
  cardIndex: 0,
  cards: [],
  saveAttempt: 0,
  simulateFirstSaveFailure: false,
};

const refs = {
  form: document.getElementById("onboardingForm"),
  name: document.getElementById("name"),
  gender: document.getElementById("gender"),
  dob: document.getElementById("dob"),
  tob: document.getElementById("tob"),
  city: document.getElementById("city"),
  countryCode: document.getElementById("countryCode"),
  phone: document.getElementById("phone"),
  consent: document.getElementById("consent"),
  submitBtn: document.getElementById("submitBtn"),
  retrySaveBtn: document.getElementById("retrySaveBtn"),
  saveStatus: document.getElementById("saveStatus"),
  sessionBadge: document.getElementById("sessionBadge"),
  phaseText: document.getElementById("phaseText"),
  progressBar: document.getElementById("progressBar"),
  progressLabel: document.getElementById("progressLabel"),
  questionCard: document.getElementById("questionCard"),
  questionTitle: document.getElementById("questionTitle"),
  questionOptions: document.getElementById("questionOptions"),
  questionResponse: document.getElementById("questionResponse"),
  didYouKnow: document.getElementById("didYouKnow"),
  cardsViewport: document.getElementById("cardsViewport"),
  cardDots: document.getElementById("cardDots"),
  prevCardBtn: document.getElementById("prevCardBtn"),
  nextCardBtn: document.getElementById("nextCardBtn"),
  resultHeading: document.getElementById("resultHeading"),
  resultSubHeading: document.getElementById("resultSubHeading"),
  editDetailsBtn: document.getElementById("editDetailsBtn"),
  newSessionBtn: document.getElementById("newSessionBtn"),
};

let progressInterval = null;

init();

function init() {
  populateCountryCodes();
  populateCityHints();
  bindFormEvents();
  bindResultEvents();
  renderSessionBadge("Session not started");
}

function populateCountryCodes() {
  refs.countryCode.innerHTML = COUNTRY_CODES.map(
    (item) =>
      `<option value="${item.code}">${item.flag} ${item.code} (${item.country})</option>`
  ).join("");
  refs.countryCode.value = "+91";
}

function populateCityHints() {
  const list = document.createElement("datalist");
  list.id = "cityHints";
  list.innerHTML = CITY_HINTS.map((city) => `<option value="${city}"></option>`).join("");
  document.body.appendChild(list);
  refs.city.setAttribute("list", "cityHints");
}

function bindFormEvents() {
  refs.form.addEventListener("submit", onSubmitOnboarding);
  refs.retrySaveBtn.addEventListener("click", onRetrySave);

  const ids = ["name", "gender", "dob", "tob", "city", "countryCode", "phone", "consent"];
  ids.forEach((id) => {
    const el = refs[id];
    const eventType = id === "consent" ? "change" : "input";
    el.addEventListener(eventType, () => validateAndRenderField(id));
    el.addEventListener("blur", () => validateAndRenderField(id));
  });
}

function bindResultEvents() {
  refs.prevCardBtn.addEventListener("click", () => moveCard(-1));
  refs.nextCardBtn.addEventListener("click", () => moveCard(1));

  refs.editDetailsBtn.addEventListener("click", () => {
    showView("onboarding");
    setStatus("You can update details and regenerate.", "muted");
  });

  refs.newSessionBtn.addEventListener("click", () => {
    resetExperience();
    showView("onboarding");
    setStatus("New session started. Fill details to continue.", "muted");
  });
}

async function onSubmitOnboarding(event) {
  event.preventDefault();
  refs.retrySaveBtn.classList.add("hidden");

  const payload = collectFormData();
  const errors = validatePayload(payload);
  renderErrors(errors);

  if (Object.keys(errors).length > 0) {
    setStatus("Please fix highlighted fields before continuing.", "warn");
    return;
  }

  state.pendingPayload = payload;
  refs.submitBtn.disabled = true;
  setStatus("Saving your details securely...", "muted");

  try {
    const save = await saveWithRetry(payload, 2);
    state.sessionId = save.sessionId;
    state.onboarding = payload;
    renderSessionBadge(`Session ${save.sessionId.slice(-6).toUpperCase()}`);
    setStatus("Details saved. Generating your Kundali...", "ok");
    refs.submitBtn.disabled = false;
    startCraftingFlow(payload);
  } catch (error) {
    refs.submitBtn.disabled = false;
    setStatus(
      `Could not save data. ${error.message || "Please retry."}`,
      "error"
    );
    refs.retrySaveBtn.classList.remove("hidden");
  }
}

async function onRetrySave() {
  if (!state.pendingPayload) return;
  refs.retrySaveBtn.classList.add("hidden");
  setStatus("Retrying save...", "warn");
  refs.submitBtn.disabled = true;

  try {
    const save = await saveWithRetry(state.pendingPayload, 1);
    state.sessionId = save.sessionId;
    state.onboarding = state.pendingPayload;
    renderSessionBadge(`Session ${save.sessionId.slice(-6).toUpperCase()}`);
    refs.submitBtn.disabled = false;
    setStatus("Saved successfully. Continuing...", "ok");
    startCraftingFlow(state.pendingPayload);
  } catch (error) {
    refs.submitBtn.disabled = false;
    refs.retrySaveBtn.classList.remove("hidden");
    setStatus(
      `Retry failed. ${error.message || "Please check your connection."}`,
      "error"
    );
  }
}

function collectFormData() {
  return {
    name: refs.name.value.trim(),
    gender: refs.gender.value,
    dob: refs.dob.value,
    tob: refs.tob.value,
    city: refs.city.value.trim(),
    countryCode: refs.countryCode.value,
    phone: refs.phone.value.trim().replace(/\D/g, ""),
    consent: refs.consent.checked,
  };
}

function validatePayload(payload) {
  const errors = {};
  const fieldIds = Object.keys(payload);
  fieldIds.forEach((field) => {
    const message = validateField(field, payload[field], payload);
    if (message) errors[field] = message;
  });
  return errors;
}

function validateAndRenderField(fieldId) {
  const payload = collectFormData();
  const error = validateField(fieldId, payload[fieldId], payload);
  renderFieldError(fieldId, error);
}

function validateField(field, value, payload) {
  switch (field) {
    case "name":
      return value.length < 2 ? "Please enter at least 2 characters." : "";
    case "gender":
      return value ? "" : "Please select gender.";
    case "dob": {
      if (!value) return "Please select date of birth.";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Invalid date.";
      const now = new Date();
      if (date > now) return "Date of birth cannot be in the future.";
      return "";
    }
    case "tob":
      return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
        ? ""
        : "Please enter a valid time.";
    case "city":
      return value.length < 2 ? "Please enter birth city." : "";
    case "countryCode":
      return value ? "" : "Choose a country code.";
    case "phone":
      return /^\d{8,15}$/.test(value)
        ? ""
        : "Phone must contain 8 to 15 digits.";
    case "consent":
      return payload.consent ? "" : "Please accept consent to continue.";
    default:
      return "";
  }
}

function renderErrors(errors) {
  const ids = ["name", "gender", "dob", "tob", "city", "countryCode", "phone", "consent"];
  ids.forEach((id) => renderFieldError(id, errors[id] || ""));
}

function renderFieldError(fieldId, message) {
  const target = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (!target) return;
  target.textContent = message || "";
}

function setStatus(message, tone = "muted") {
  refs.saveStatus.textContent = message;
  refs.saveStatus.className = "status";
  refs.saveStatus.classList.add(tone);
}

function renderSessionBadge(text) {
  refs.sessionBadge.textContent = text;
}

async function saveWithRetry(payload, maxRetries) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      attempt += 1;
      if (attempt > 1) {
        setStatus(`Retrying save (attempt ${attempt}/${maxRetries + 1})...`, "warn");
      }
      const result = await mockSaveOnboarding(payload);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt > maxRetries) break;
      await wait(450 * attempt);
    }
  }

  throw lastError || new Error("Save failed");
}

async function mockSaveOnboarding(payload) {
  await wait(550);
  state.saveAttempt += 1;

  if (state.simulateFirstSaveFailure && state.saveAttempt === 1) {
    throw new Error("Network timeout while saving.");
  }

  localStorage.setItem("lumina_onboarding_data", JSON.stringify(payload));
  return {
    success: true,
    sessionId: `lumina-${Date.now().toString(36)}`,
  };
}

function startCraftingFlow(payload) {
  showView("crafting");
  state.progress = 0;
  state.dataReady = false;
  state.answeredQuestions = 0;
  state.activeQuestionIndex = null;
  state.questions = [];
  refs.questionCard.classList.add("hidden");
  updateProgressUI();

  if (progressInterval) clearInterval(progressInterval);

  const generatePromise = mockGenerateKundali(payload).then((result) => {
    state.resultData = result;
    state.dataReady = true;
    state.questions = buildExperienceQuestions(result.moonSign);
  });

  progressInterval = setInterval(() => {
    const increment = state.dataReady ? 1.15 : 0.75;
    state.progress = Math.min(100, state.progress + increment);
    updateProgressUI();
    maybeShowQuestion();
    maybeCompleteCrafting();
  }, 120);

  generatePromise.catch(() => {
    state.dataReady = true;
    state.resultData = buildFallbackResult(payload);
    state.questions = buildExperienceQuestions(state.resultData.moonSign);
  });
}

function updateProgressUI() {
  const progressRounded = Math.round(state.progress);
  refs.progressBar.style.width = `${progressRounded}%`;
  refs.progressLabel.textContent = `${progressRounded}%`;

  const phase = PHASES.find((item, idx) => {
    const previous = idx === 0 ? 0 : PHASES[idx - 1].progress;
    return state.progress <= item.progress && state.progress > previous - 0.1;
  });
  refs.phaseText.textContent = phase ? phase.message : PHASES[PHASES.length - 1].message;
}

function maybeShowQuestion() {
  if (!state.questions.length) return;
  if (state.activeQuestionIndex !== null) return;

  const thresholds = [25, 55, 80];
  const nextIndex = state.answeredQuestions;
  if (nextIndex >= state.questions.length) return;
  if (state.progress < thresholds[nextIndex]) return;

  showQuestion(nextIndex);
}

function showQuestion(index) {
  const question = state.questions[index];
  if (!question) return;

  state.activeQuestionIndex = index;
  refs.questionCard.classList.remove("hidden");
  refs.questionTitle.textContent = question.question;
  refs.questionResponse.classList.add("hidden");
  refs.didYouKnow.classList.add("hidden");

  refs.questionOptions.innerHTML = question.options
    .map(
      (opt, optIndex) =>
        `<button type="button" data-opt="${optIndex}">${escapeHtml(
          opt.emoji
        )} ${escapeHtml(opt.text)}</button>`
    )
    .join("");

  refs.questionOptions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedIndex = Number(button.getAttribute("data-opt"));
      answerQuestion(question, selectedIndex);
    });
  });
}

function answerQuestion(question, optionIndex) {
  const option = question.options[optionIndex];
  if (!option) return;

  refs.questionOptions.querySelectorAll("button").forEach((btn) => {
    btn.disabled = true;
  });

  refs.questionResponse.textContent = option.response;
  refs.questionResponse.classList.remove("hidden");
  refs.didYouKnow.textContent = `Did you know: ${question.didYouKnow}`;
  refs.didYouKnow.classList.remove("hidden");

  if (question.kind === "curiosity") {
    localStorage.setItem("lumina_user_curiosity", option.text);
  }

  setTimeout(() => {
    refs.questionCard.classList.add("hidden");
    state.answeredQuestions += 1;
    state.activeQuestionIndex = null;
    maybeCompleteCrafting();
  }, 1750);
}

function maybeCompleteCrafting() {
  const doneWithQuestions = state.answeredQuestions >= Math.min(3, state.questions.length || 3);
  if (state.progress >= 100 && state.dataReady && doneWithQuestions) {
    if (progressInterval) clearInterval(progressInterval);
    showResults();
  }
}

function showResults() {
  const data = state.resultData || buildFallbackResult(state.onboarding || {});
  state.cards = buildResultCards(data);
  state.cardIndex = 0;

  refs.resultHeading.textContent = `Your Lumina Blueprint, ${firstName(data.name)}`;
  refs.resultSubHeading.textContent = `${data.summary} Focus area: ${capitalize(
    data.selectedTopic
  )}.`;

  renderCard();
  renderDots();
  showView("results");
}

function renderCard() {
  const card = state.cards[state.cardIndex];
  if (!card) return;

  refs.cardsViewport.innerHTML = `
    <article class="result-card">
      <span class="tag">${state.cardIndex + 1}/${state.cards.length} ${escapeHtml(
    card.tag
  )}</span>
      <h3>${escapeHtml(card.title)}</h3>
      ${card.content}
    </article>
  `;

  refs.prevCardBtn.disabled = state.cardIndex === 0;
  refs.nextCardBtn.disabled = state.cardIndex === state.cards.length - 1;
  renderDots();
}

function renderDots() {
  refs.cardDots.innerHTML = state.cards
    .map(
      (_, idx) =>
        `<button type="button" class="dot ${idx === state.cardIndex ? "active" : ""}" data-dot="${idx}" aria-label="Go to card ${idx + 1}"></button>`
    )
    .join("");

  refs.cardDots.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      state.cardIndex = Number(dot.getAttribute("data-dot"));
      renderCard();
    });
  });
}

function moveCard(delta) {
  const next = state.cardIndex + delta;
  if (next < 0 || next >= state.cards.length) return;
  state.cardIndex = next;
  renderCard();
}

function buildExperienceQuestions(rawMoonSign) {
  const sign = normalizeMoonSign(rawMoonSign);
  const profile = SIGN_PROFILE[sign] || SIGN_PROFILE.Aries;

  const personalized = [
    {
      kind: "moon",
      question: `${profile.emoji} As a ${sign} Moon person, what helps you reset emotionally?`,
      options: [
        { emoji: "🧘", text: "Quiet reflection", response: "Strong choice. Reflection builds emotional clarity for you." },
        { emoji: "💬", text: "Talking it out", response: "Communication can release emotional pressure quickly." },
        { emoji: "⚡", text: "Taking action", response: "Action helps convert emotional energy into momentum." },
      ],
      didYouKnow: profile.fact,
    },
    {
      kind: "moon",
      question: `Your chart suggests ${profile.trait}. Which life area should we prioritize first?`,
      options: [
        { emoji: "💼", text: "Career", response: "Great. We will highlight practical career timing first." },
        { emoji: "💞", text: "Relationships", response: "Great. We will surface emotional compatibility cues first." },
        { emoji: "💰", text: "Wealth", response: "Great. We will prioritize cashflow and discipline signals first." },
      ],
      didYouKnow: `${sign} Moon patterns become strongest during stress and major transitions.`,
    },
  ];

  const curiosity = {
    kind: "curiosity",
    question: "What are you most curious about in this reading?",
    options: [
      { emoji: "🔮", text: "Future predictions", response: "Perfect. We will highlight your next actionable windows." },
      { emoji: "🪞", text: "Personality insights", response: "Excellent. We will reveal your emotional blueprint first." },
      { emoji: "💎", text: "Remedies and guidance", response: "Wise choice. You'll get remedies sorted by effort level." },
    ],
    didYouKnow: "A kundali can be translated into practical weekly decisions, not just static traits.",
  };

  return [...personalized, curiosity];
}

function normalizeMoonSign(rawValue) {
  if (!rawValue || typeof rawValue !== "string") return "Aries";

  const cleaned = rawValue
    .replace(/\(([^)]+)\)/g, " $1 ")
    .replace(/[^a-zA-Z\s]/g, " ")
    .toLowerCase();

  for (const sign of MOON_SIGNS) {
    if (cleaned.includes(sign.toLowerCase())) return sign;
  }

  return "Aries";
}

async function mockGenerateKundali(payload) {
  await wait(900);
  const seed = hashCode(`${payload.name}|${payload.dob}|${payload.tob}|${payload.city}`);
  const moonSignRaw = pickBySeed(
    [
      "Meena (Pisces)",
      "Mesha (Aries)",
      "Vrishabha (Taurus)",
      "Mithuna (Gemini)",
      "Karka (Cancer)",
      "Simha (Leo)",
      "Kanya (Virgo)",
      "Tula (Libra)",
      "Vrischika (Scorpio)",
      "Dhanu (Sagittarius)",
      "Makara (Capricorn)",
      "Kumbha (Aquarius)",
    ],
    seed
  );

  const moonSign = normalizeMoonSign(moonSignRaw);
  const scoreBase = 45 + Math.abs(seed % 22);

  return {
    name: payload.name,
    selectedTopic: inferTopicFromCuriosity(),
    moonSign,
    moonSignRaw,
    lagna: pickBySeed(["Kanya", "Tula", "Vrischika", "Makara"], seed + 2),
    nakshatra: pickBySeed(["Revati", "Rohini", "Pushya", "Anuradha"], seed + 5),
    summary: `A balanced cycle with strong potential for focused growth`,
    positiveHighlight: `${SIGN_PROFILE[moonSign].emoji} ${moonSign} Moon supports intuitive decisions when paired with structure.`,
    lifeDomains: {
      career: { score: clamp(scoreBase + 4, 35, 92), label: labelForScore(scoreBase + 4) },
      relationships: { score: clamp(scoreBase - 3, 35, 92), label: labelForScore(scoreBase - 3) },
      wealth: { score: clamp(scoreBase + 2, 35, 92), label: labelForScore(scoreBase + 2) },
    },
    yogas: [
      "Dhana support for steady wealth habits",
      "Creative expression pattern in communication houses",
      "Discipline-aligned growth through long-term planning",
    ],
    doshas: [
      {
        name: "Mild Manglik influence",
        severity: "Moderate",
        remedy: "Tuesday discipline ritual, service, and conflict-aware communication.",
      },
    ],
    timeline: [
      {
        period: "Next 90 days",
        theme: "Skill compounding and steady execution",
        advice: "Pick one strategic goal and track weekly milestones.",
      },
      {
        period: "Month 4 to 8",
        theme: "Relationship clarity",
        advice: "Have one high-trust conversation before major commitments.",
      },
      {
        period: "Month 9 to 12",
        theme: "Financial optimization",
        advice: "Shift from reactive spending to rule-based investing.",
      },
    ],
    chatHealth: "degraded",
  };
}

function buildFallbackResult(payload) {
  return {
    name: payload.name || "Friend",
    selectedTopic: "career",
    moonSign: "Pisces",
    moonSignRaw: "Meena (Pisces)",
    lagna: "Vrischika",
    nakshatra: "Uttara Bhadrapada",
    summary: "A transition period with high upside through consistency",
    positiveHighlight: "You have strong emotional intelligence and long-term resilience.",
    lifeDomains: {
      career: { score: 72, label: "Good" },
      relationships: { score: 64, label: "Balanced" },
      wealth: { score: 70, label: "Good" },
    },
    yogas: [
      "Strategic thinking support",
      "Gradual but stable material growth",
      "Mentorship and learning advantage",
    ],
    doshas: [
      {
        name: "Communication stress pattern",
        severity: "Mild",
        remedy: "Journaling and weekly clarity rituals.",
      },
    ],
    timeline: [
      {
        period: "Next 90 days",
        theme: "Structured reset",
        advice: "Rebuild fundamentals: sleep, focus blocks, and financial rules.",
      },
      {
        period: "Month 4 to 8",
        theme: "Opportunity expansion",
        advice: "Take one visible risk with preparation.",
      },
      {
        period: "Month 9 to 12",
        theme: "Consolidation",
        advice: "Convert momentum into stable routines.",
      },
    ],
    chatHealth: "degraded",
  };
}

function buildResultCards(data) {
  const curiosity = localStorage.getItem("lumina_user_curiosity");
  const priorityText = curiosity
    ? `Priority based on your input: ${escapeHtml(curiosity)}.`
    : "Priority is based on your moon-sign profile and domain scores.";

  return [
    {
      tag: "Identity",
      title: `${data.moonSignRaw} Moon, ${data.lagna} Lagna`,
      content: `
        <p>${escapeHtml(data.positiveHighlight)}</p>
        <ul>
          <li>Nakshatra: <strong>${escapeHtml(data.nakshatra)}</strong></li>
          <li>Summary: ${escapeHtml(data.summary)}</li>
          <li>${priorityText}</li>
        </ul>
      `,
    },
    {
      tag: "Domain scores",
      title: "Where your momentum is strongest",
      content: `
        <div class="split">
          ${renderMetric("Career", data.lifeDomains.career)}
          ${renderMetric("Relationships", data.lifeDomains.relationships)}
          ${renderMetric("Wealth", data.lifeDomains.wealth)}
        </div>
      `,
    },
    {
      tag: "Yogas",
      title: "Strength patterns to leverage",
      content: `
        <ul>
          ${data.yogas.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      `,
    },
    {
      tag: "Remedies",
      title: "Challenges and practical remedies",
      content: `
        <ul>
          ${data.doshas
            .map(
              (item) =>
                `<li><strong>${escapeHtml(item.name)}</strong> (${escapeHtml(
                  item.severity
                )})<br />${escapeHtml(item.remedy)}</li>`
            )
            .join("")}
        </ul>
      `,
    },
    {
      tag: "Timeline",
      title: "Your next 12-month roadmap",
      content: `
        <div class="timeline">
          ${data.timeline
            .map(
              (item) =>
                `<div class="timeline-item"><strong>${escapeHtml(
                  item.period
                )}</strong><br />${escapeHtml(item.theme)}<br /><span>${escapeHtml(
                  item.advice
                )}</span></div>`
            )
            .join("")}
        </div>
      `,
    },
    {
      tag: "Action",
      title: "What to do next",
      content: `
        <ul>
          <li>Pick one focus area and set a 4-week action sprint.</li>
          <li>Review remedies every Tuesday for consistency.</li>
          <li>Book a pandit consult for deeper event timing.</li>
          <li>AI Chat status: <strong>${escapeHtml(
            data.chatHealth
          )}</strong> (fallback to guided FAQ if slow).</li>
        </ul>
      `,
    },
  ];
}

function renderMetric(label, metric) {
  return `
    <div class="metric">
      <strong>${escapeHtml(label)}: ${metric.score}</strong>
      <span>${escapeHtml(metric.label)}</span>
      <div class="meter"><span style="width:${metric.score}%"></span></div>
    </div>
  `;
}

function inferTopicFromCuriosity() {
  const curiosity = (localStorage.getItem("lumina_user_curiosity") || "").toLowerCase();
  if (curiosity.includes("remed")) return "remedies";
  if (curiosity.includes("future")) return "timeline";
  if (curiosity.includes("personality")) return "identity";
  return "career";
}

function showView(viewName) {
  state.view = viewName;
  ["onboarding", "crafting", "results"].forEach((id) => {
    const el = document.getElementById(`view-${id}`);
    if (!el) return;
    el.classList.toggle("active", id === viewName);
  });
}

function resetExperience() {
  if (progressInterval) clearInterval(progressInterval);
  state.pendingPayload = null;
  state.dataReady = false;
  state.resultData = null;
  state.questions = [];
  state.progress = 0;
  state.answeredQuestions = 0;
  state.activeQuestionIndex = null;
  state.cardIndex = 0;
  state.cards = [];
  state.saveAttempt = 0;
  refs.form.reset();
  refs.countryCode.value = "+91";
  renderErrors({});
  refs.retrySaveBtn.classList.add("hidden");
  renderSessionBadge("Session not started");
}

function labelForScore(score) {
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 45) return "Balanced";
  return "Needs support";
}

function pickBySeed(array, seed) {
  const index = Math.abs(seed) % array.length;
  return array[index];
}

function hashCode(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstName(name) {
  if (!name) return "Friend";
  return name.trim().split(/\s+/)[0];
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

