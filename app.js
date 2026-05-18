const PATTING_CLASS_NAME = "is-patting";
const SELECTED_CLASS_NAME = "is-selected";
const ACTIVE_CLASS_NAME = "is-active";
const CENTER_IMAGE_KEY = "C";
const LEFT_IMAGE_KEY = "L";
const RIGHT_IMAGE_KEY = "R";
const MACKEREL_CAT_KEY = "mackerel";
const MACKEREL_RIGHT_EXTRA_IMAGE_KEY = "E";
const MACKEREL_RIGHT_EXTRA_IMAGE_PROBABILITY = 0.05;
const DDOL_HIDDEN_IMAGE_KEYS = ["a", "b"];
const DDOL_HIDDEN_IMAGE_PROBABILITY = 0.03;
const ANIMATION_RESET_DELAY_MS = 530;
const BURST_REMOVE_DELAY_MS = 250;
const MOTION_IMPACT_THRESHOLD = 1;
const MOTION_DOMINANCE_RATIO = 1.0;
const MOTION_MIN_INTERVAL_MS = 620;
const MOTION_SETTLE_DELAY_MS = 90;
const MOTION_BUTTON_ENABLED_CLASS_NAME = "is-enabled";
const MOTION_BUTTON_HIDDEN_CLASS_NAME = "is-hidden";
const HIT_INTERVAL_COUNT = 100;
const HIT_EFFECT_REMOVE_DELAY_MS = 900;
const COFFEE_TRAP_COUNT = 999;
const COFFEE_TRAP_DURATION_MS = 20000;
const KAKAOPAY_LINK_URL = "https://qr.kakaopay.com/FaaVS0JeGf988363";
const GIFT_UNLOCK_COUNT = 5000;
const GIFT_EFFECT_REMOVE_DELAY_MS = 4200;
const FANFARE_DROP_COUNT = 34;
const FANFARE_EMOJIS = ["🎉", "🎊", "✨", "💝"];
const CAT_CLICK_MESSAGES = {
  100: "이걸 왜 클릭하고있어요?",
  200: "진짜 계속 누른거에요?",
  300: "대단하네 근데 이제 없어요.",
  600: "진짜 어디까지 가려고 그래요?",
  1000: "이 페이지를 개발자에게 스크린샷 찍어서 전송하세요. 뭐라도 드릴게요. 수고하셨어요",
};
const BONUS_TOUCH_COUNT = 5000;
const BONUS_TOUCH_SEQUENCE = [
  "right",
  "right",
  "right",
  "right",
  "right",
  "left",
  "left",
  "left",
  "left",
  "left",
  "right",
  "right",
  "right",
  "left",
  "left",
  "left",
];

const catElement = document.querySelector("#cat");
const catImageElement = document.querySelector("#catImage");
const messageElement = document.querySelector("#message");
const countElement = document.querySelector("#count");
const leftZoneElement = document.querySelector("#leftZone");
const rightZoneElement = document.querySelector("#rightZone");
const motionToggleElement = document.querySelector("#motionToggle");
const motionNoticeElement = document.querySelector("#motionNotice");
const motionNoticeCloseElement = document.querySelector("#motionNoticeClose");
const pangNoticeElement = document.querySelector("#pangNotice");
const pangNoticeCloseElement = document.querySelector("#pangNoticeClose");
const catMenuToggleElement = document.querySelector("#catMenuToggle");
const catPickerElement = document.querySelector("#catPicker");
const catOptionElements = document.querySelectorAll(".cat-option");

const catConfig = {
  cheese: {
    label: "치즈냥이",
    imagePrefix: "cheese",
  },
  ddol: {
    label: "똘순이",
    imagePrefix: "dds",
  },
  threeColor: {
    label: "삼색이",
    imagePrefix: "3c",
  },
  mackerel: {
    label: "고등어",
    imagePrefix: "go",
  },
};

const directionConfig = {
  left: {
    imageKey: LEFT_IMAGE_KEY,
    messageSuffix: "냥냥냥",
    burst: "pat",
    button: leftZoneElement,
  },
  right: {
    imageKey: RIGHT_IMAGE_KEY,
    messageSuffix: "뇽뇽뇽",
    burst: "pat",
    button: rightZoneElement,
  },
};

let selectedCatKey = "cheese";
let patCount = 0;
let resetTimerId = 0;
let isMotionEnabled = false;
let previousMotionVector = null;
let motionImpactTimerId = 0;
let pendingMotionImpact = null;
let lastMotionPatTime = 0;
let recentTouchDirections = [];
let hasShownGiftEffect = false;
let hasShownCoffeeTrap = false;
let catImageClickCount = 0;

function getCatImageSource(catKey, imageKey) {
  const cat = catConfig[catKey];

  if (!cat) {
    return "";
  }

  return `./image/${cat.imagePrefix}-${imageKey}.png`;
}

function setCatImage(imageKey) {
  const cat = catConfig[selectedCatKey];

  catImageElement.src = getCatImageSource(selectedCatKey, imageKey);
  catImageElement.alt = cat.label;
  catElement.dataset.direction = imageKey.toLowerCase();
}

function getPatImageKey(imageKey) {
  const canUseMackerelExtraImage =
    selectedCatKey === MACKEREL_CAT_KEY &&
    imageKey === RIGHT_IMAGE_KEY &&
    Math.random() < MACKEREL_RIGHT_EXTRA_IMAGE_PROBABILITY;

  if (!canUseMackerelExtraImage) {
    return imageKey;
  }

  return MACKEREL_RIGHT_EXTRA_IMAGE_KEY;
}

function selectCat(catKey) {
  if (!catConfig[catKey]) {
    return;
  }

  selectedCatKey = catKey;
  setCatImage(CENTER_IMAGE_KEY);
  messageElement.textContent = `${catConfig[catKey].label} 준비 완료`;
  catMenuToggleElement.textContent = catConfig[catKey].label;
  closeCatMenu();

  catOptionElements.forEach((optionElement) => {
    const isSelected = optionElement.dataset.cat === catKey;
    optionElement.classList.toggle(SELECTED_CLASS_NAME, isSelected);
    optionElement.setAttribute("aria-pressed", String(isSelected));
  });
}

function openCatMenu() {
  catPickerElement.hidden = false;
  catMenuToggleElement.setAttribute("aria-expanded", "true");
}

function closeCatMenu() {
  catPickerElement.hidden = true;
  catMenuToggleElement.setAttribute("aria-expanded", "false");
}

function toggleCatMenu() {
  if (catPickerElement.hidden) {
    openCatMenu();
    return;
  }

  closeCatMenu();
}

function createHitEffect(count) {
  const hitElement = document.createElement("div");

  hitElement.className = "hit-effect";
  hitElement.textContent = `${count} HIT`;
  document.body.appendChild(hitElement);

  window.setTimeout(() => {
    hitElement.remove();
  }, HIT_EFFECT_REMOVE_DELAY_MS);
}

function createFanfareDrop(containerElement, index) {
  const dropElement = document.createElement("span");
  const emoji = FANFARE_EMOJIS[index % FANFARE_EMOJIS.length];
  const xPosition = Math.random() * 100;
  const fallDelay = Math.random() * 900;
  const fallDuration = 2200 + Math.random() * 1400;

  dropElement.className = "fanfare-drop";
  dropElement.textContent = emoji;
  dropElement.style.setProperty("--drop-x", `${xPosition}vw`);
  dropElement.style.setProperty("--drop-delay", `${fallDelay}ms`);
  dropElement.style.setProperty("--drop-duration", `${fallDuration}ms`);

  containerElement.appendChild(dropElement);
}

function createGiftEffect() {
  const giftElement = document.createElement("div");
  const giftImageElement = document.createElement("img");
  const fanfareElement = document.createElement("div");

  giftElement.className = "gift-effect";
  fanfareElement.className = "fanfare-rain";
  giftImageElement.className = "gift-image";
  giftImageElement.src = "./image/gift.png";
  giftImageElement.alt = "선물";

  giftElement.appendChild(fanfareElement);
  giftElement.appendChild(giftImageElement);
  document.body.appendChild(giftElement);

  for (let index = 0; index < FANFARE_DROP_COUNT; index += 1) {
    createFanfareDrop(fanfareElement, index);
  }

  window.setTimeout(() => {
    giftElement.remove();
  }, GIFT_EFFECT_REMOVE_DELAY_MS);
}

function createCoffeeTrapModal() {
  const trapElement = document.createElement("div");
  const panelElement = document.createElement("div");
  const titleElement = document.createElement("p");
  const textElement = document.createElement("p");
  const linkElement = document.createElement("a");
  const timerElement = document.createElement("p");

  trapElement.className = "coffee-trap";
  panelElement.className = "coffee-trap-panel";
  titleElement.className = "coffee-trap-title";
  textElement.className = "coffee-trap-text";
  linkElement.className = "coffee-trap-link";
  timerElement.className = "coffee-trap-timer";

  trapElement.setAttribute("role", "dialog");
  trapElement.setAttribute("aria-modal", "true");
  titleElement.textContent = "잠깐!";
  textElement.textContent = "다음으로 넘어가려면 개발자에게 커피를 사줘볼까요? 지금 바로 카카오페이로 고고";
  linkElement.href = KAKAOPAY_LINK_URL;
  linkElement.target = "_blank";
  linkElement.rel = "noopener noreferrer";
  linkElement.textContent = "카카오페이 바로가기 링크";
  timerElement.textContent = "20초 후 자동으로 닫혀요";

  panelElement.appendChild(titleElement);
  panelElement.appendChild(textElement);
  panelElement.appendChild(linkElement);
  panelElement.appendChild(timerElement);
  trapElement.appendChild(panelElement);
  document.body.appendChild(trapElement);

  window.setTimeout(() => {
    trapElement.remove();
  }, COFFEE_TRAP_DURATION_MS);
}

function createCatClickPopup(message) {
  const popupElement = document.createElement("div");
  const panelElement = document.createElement("div");
  const textElement = document.createElement("p");
  const closeButtonElement = document.createElement("button");

  popupElement.className = "cat-click-popup";
  panelElement.className = "cat-click-popup-panel";
  textElement.className = "cat-click-popup-text";
  closeButtonElement.className = "cat-click-popup-close";

  popupElement.setAttribute("role", "dialog");
  popupElement.setAttribute("aria-modal", "true");
  textElement.textContent = message;
  closeButtonElement.type = "button";
  closeButtonElement.textContent = "확인";

  closeButtonElement.addEventListener("click", () => {
    popupElement.remove();
  });

  panelElement.appendChild(textElement);
  panelElement.appendChild(closeButtonElement);
  popupElement.appendChild(panelElement);
  document.body.appendChild(popupElement);
}

function handleCatImageClick() {
  catImageClickCount += 1;

  const message = CAT_CLICK_MESSAGES[catImageClickCount];

  if (typeof message !== "string") {
    return;
  }

  createCatClickPopup(message);
}

function shouldShowCoffeeTrap(count) {
  return !hasShownCoffeeTrap && count === COFFEE_TRAP_COUNT;
}

function showCoffeeTrapIfNeeded(count) {
  if (!shouldShowCoffeeTrap(count)) {
    return;
  }

  hasShownCoffeeTrap = true;
  createCoffeeTrapModal();
}

function shouldShowGiftEffect(count) {
  return !hasShownGiftEffect && count >= GIFT_UNLOCK_COUNT;
}

function showGiftEffectIfNeeded(count) {
  if (!shouldShowGiftEffect(count)) {
    return;
  }

  hasShownGiftEffect = true;
  createGiftEffect();
}

function shouldShowHitEffect(count) {
  return count > 0 && count % HIT_INTERVAL_COUNT === 0;
}

function addPatCount(amount) {
  patCount += amount;
  countElement.textContent = String(patCount);
  showCoffeeTrapIfNeeded(patCount);
  showGiftEffectIfNeeded(patCount);

  if (shouldShowHitEffect(patCount)) {
    createHitEffect(patCount);
  }
}

function patCat(direction, pointerEvent) {
  const config = directionConfig[direction];

  if (!config) {
    return;
  }

  addPatCount(1);

  if (shouldShowDdolHiddenImage()) {
    const hiddenImageKey = getRandomDdolHiddenImageKey();

    setCatImage(hiddenImageKey);
    messageElement.textContent = `${catConfig[selectedCatKey].label} 깜짝 등장`;
    restartPatAnimation();
    setActiveButton(config.button);
    createTapBurst(pointerEvent, "!");
    clearActiveTouchStateOnly();
    return;
  }

  messageElement.textContent = `${catConfig[selectedCatKey].label} ${config.messageSuffix}`;
  setCatImage(getPatImageKey(config.imageKey));
  restartPatAnimation();
  setActiveButton(config.button);
  createTapBurst(pointerEvent, config.burst);
  scheduleCenterReset();
}

function isBonusTouchSequenceMatched() {
  if (recentTouchDirections.length !== BONUS_TOUCH_SEQUENCE.length) {
    return false;
  }

  return BONUS_TOUCH_SEQUENCE.every((direction, index) => direction === recentTouchDirections[index]);
}

function addBonusTouchCount() {
  addPatCount(BONUS_TOUCH_COUNT);
  messageElement.textContent = `비밀 토닥 +${BONUS_TOUCH_COUNT}`;
}

function trackTouchSequence(direction) {
  recentTouchDirections.push(direction);

  if (recentTouchDirections.length > BONUS_TOUCH_SEQUENCE.length) {
    recentTouchDirections = recentTouchDirections.slice(-BONUS_TOUCH_SEQUENCE.length);
  }

  if (!isBonusTouchSequenceMatched()) {
    return;
  }

  // Reset after reward so holding the pattern does not repeat immediately. / 보상 후 즉시 반복 발동하지 않도록 초기화.
  recentTouchDirections = [];
  addBonusTouchCount();
}

function shouldShowDdolHiddenImage() {
  return selectedCatKey === "ddol" && Math.random() < DDOL_HIDDEN_IMAGE_PROBABILITY;
}

function getRandomDdolHiddenImageKey() {
  const randomIndex = Math.floor(Math.random() * DDOL_HIDDEN_IMAGE_KEYS.length);

  return DDOL_HIDDEN_IMAGE_KEYS[randomIndex];
}

function restartPatAnimation() {
  catElement.classList.remove(PATTING_CLASS_NAME);

  // Restart animation cleanly on repeated taps. / 반복 터치에서도 애니메이션이 다시 시작되도록 처리.
  window.requestAnimationFrame(() => {
    catElement.classList.add(PATTING_CLASS_NAME);
  });
}

function setActiveButton(activeButtonElement) {
  leftZoneElement.classList.toggle(ACTIVE_CLASS_NAME, activeButtonElement === leftZoneElement);
  rightZoneElement.classList.toggle(ACTIVE_CLASS_NAME, activeButtonElement === rightZoneElement);
}

function scheduleCenterReset() {
  window.clearTimeout(resetTimerId);

  resetTimerId = window.setTimeout(() => {
    setCatImage(CENTER_IMAGE_KEY);
    catElement.classList.remove(PATTING_CLASS_NAME);
    leftZoneElement.classList.remove(ACTIVE_CLASS_NAME);
    rightZoneElement.classList.remove(ACTIVE_CLASS_NAME);
  }, ANIMATION_RESET_DELAY_MS);
}

function clearActiveTouchStateOnly() {
  window.clearTimeout(resetTimerId);

  resetTimerId = window.setTimeout(() => {
    catElement.classList.remove(PATTING_CLASS_NAME);
    leftZoneElement.classList.remove(ACTIVE_CLASS_NAME);
    rightZoneElement.classList.remove(ACTIVE_CLASS_NAME);
  }, ANIMATION_RESET_DELAY_MS);
}

function createTapBurst(pointerEvent, text) {
  const burstElement = document.createElement("span");
  const fallbackX = window.innerWidth / 2;
  const fallbackY = window.innerHeight - 132;
  const burstX = pointerEvent?.clientX ?? fallbackX;
  const burstY = pointerEvent?.clientY ?? fallbackY;

  burstElement.className = "tap-burst";
  burstElement.textContent = text;
  burstElement.style.setProperty("--burst-x", `${burstX}px`);
  burstElement.style.setProperty("--burst-y", `${burstY}px`);

  document.body.appendChild(burstElement);

  window.setTimeout(() => {
    burstElement.remove();
  }, BURST_REMOVE_DELAY_MS);
}

function getMotionVector(deviceMotionEvent) {
  const acceleration = deviceMotionEvent.acceleration;
  const fallbackAcceleration = deviceMotionEvent.accelerationIncludingGravity;
  const hasGravityAdjustedX = typeof acceleration?.x === "number";
  const vector = hasGravityAdjustedX ? acceleration : fallbackAcceleration;

  if (typeof vector?.x !== "number") {
    return null;
  }

  return {
    x: vector.x,
    y: typeof vector.y === "number" ? vector.y : 0,
    z: typeof vector.z === "number" ? vector.z : 0,
    isGravityAdjusted: hasGravityAdjustedX,
  };
}

function getMotionPatEvent(direction) {
  const clientX = direction === "left" ? window.innerWidth * 0.25 : window.innerWidth * 0.75;

  return {
    clientX,
    clientY: window.innerHeight - 132,
  };
}

function getMotionImpact(currentMotionVector) {
  if (currentMotionVector.isGravityAdjusted) {
    return currentMotionVector;
  }

  if (previousMotionVector === null) {
    return null;
  }

  return {
    x: currentMotionVector.x - previousMotionVector.x,
    y: currentMotionVector.y - previousMotionVector.y,
    z: currentMotionVector.z - previousMotionVector.z,
  };
}

function isLateralImpact(motionImpact) {
  const lateralStrength = Math.abs(motionImpact.x);
  const verticalStrength = Math.max(Math.abs(motionImpact.y), Math.abs(motionImpact.z));

  return lateralStrength >= MOTION_IMPACT_THRESHOLD && lateralStrength > verticalStrength * MOTION_DOMINANCE_RATIO;
}

function commitPendingMotionImpact() {
  const motionImpact = pendingMotionImpact;

  motionImpactTimerId = 0;
  pendingMotionImpact = null;

  if (motionImpact === null) {
    return;
  }

  lastMotionPatTime = Date.now();
  patCat(motionImpact.direction, getMotionPatEvent(motionImpact.direction));
}

function queueMotionImpact(motionImpact) {
  const direction = motionImpact.x < 0 ? "right" : "left";
  const strength = Math.abs(motionImpact.x);

  if (pendingMotionImpact === null || strength > pendingMotionImpact.strength) {
    pendingMotionImpact = {
      direction,
      strength,
    };
  }

  if (motionImpactTimerId !== 0) {
    return;
  }

  // Wait briefly and use the strongest side impact. / 짧게 기다린 뒤 가장 큰 좌우 충격만 사용.
  motionImpactTimerId = window.setTimeout(commitPendingMotionImpact, MOTION_SETTLE_DELAY_MS);
}

function handleDeviceMotion(deviceMotionEvent) {
  if (!isMotionEnabled) {
    return;
  }

  const currentMotionVector = getMotionVector(deviceMotionEvent);

  if (currentMotionVector === null) {
    return;
  }

  const motionImpact = getMotionImpact(currentMotionVector);
  const now = Date.now();

  previousMotionVector = currentMotionVector;

  if (motionImpact === null) {
    return;
  }

  if (now - lastMotionPatTime < MOTION_MIN_INTERVAL_MS) {
    return;
  }

  if (!isLateralImpact(motionImpact)) {
    return;
  }

  queueMotionImpact(motionImpact);
}

function setMotionEnabled(isEnabled) {
  isMotionEnabled = isEnabled;
  previousMotionVector = null;
  pendingMotionImpact = null;
  window.clearTimeout(motionImpactTimerId);
  motionImpactTimerId = 0;
  motionToggleElement.classList.toggle(MOTION_BUTTON_ENABLED_CLASS_NAME, isEnabled);
  motionToggleElement.textContent = isEnabled ? "팡팡 켜짐" : "팡팡해주기";
  motionToggleElement.setAttribute("aria-pressed", String(isEnabled));
}

function canUseDeviceMotion() {
  return "DeviceMotionEvent" in window;
}

function isChromeLikeBrowser() {
  const userAgent = navigator.userAgent;
  const userAgentBrands = navigator.userAgentData?.brands ?? [];
  const hasChromeBrand = userAgentBrands.some((brandInfo) => brandInfo.brand === "Google Chrome");
  const hasChromeUserAgent = /Chrome|CriOS/i.test(userAgent);
  const isOtherChromiumBrowser = /Edg|OPR|SamsungBrowser|Whale|Firefox|FxiOS/i.test(userAgent);
  const isAndroidWebView = /; wv\)/i.test(userAgent);

  return (hasChromeBrand || hasChromeUserAgent) && !isOtherChromiumBrowser && !isAndroidWebView;
}

function showMotionNoticeIfNeeded() {
  if (isChromeLikeBrowser()) {
    return;
  }

  motionNoticeElement.hidden = false;
}

function showPangNotice() {
  pangNoticeElement.hidden = false;
}

function closePangNotice() {
  pangNoticeElement.hidden = true;
}

async function requestMotionPermission() {
  const deviceMotionEvent = window.DeviceMotionEvent;

  if (typeof deviceMotionEvent.requestPermission !== "function") {
    return true;
  }

  const permissionState = await deviceMotionEvent.requestPermission();

  return permissionState === "granted";
}

async function toggleMotionControl() {
  if (isMotionEnabled) {
    setMotionEnabled(false);
    return;
  }

  try {
    const isPermissionGranted = await requestMotionPermission();

    if (!isPermissionGranted) {
      messageElement.textContent = "흔들기 권한이 필요해요";
      return;
    }

    setMotionEnabled(true);
    showPangNotice();
    messageElement.textContent = "옆 테두리를 톡톡 두드려요";
  } catch (error) {
    console.error("Device motion permission failed:", error);
    messageElement.textContent = "이 브라우저는 흔들기를 지원하지 않아요";
  }
}

function preloadCatImages() {
  Object.keys(catConfig).forEach((catKey) => {
    [CENTER_IMAGE_KEY, LEFT_IMAGE_KEY, RIGHT_IMAGE_KEY].forEach((imageKey) => {
      const image = new Image();
      image.src = getCatImageSource(catKey, imageKey);
    });
  });

  const mackerelExtraImage = new Image();
  mackerelExtraImage.src = getCatImageSource(MACKEREL_CAT_KEY, MACKEREL_RIGHT_EXTRA_IMAGE_KEY);

  DDOL_HIDDEN_IMAGE_KEYS.forEach((imageKey) => {
    const image = new Image();
    image.src = getCatImageSource("ddol", imageKey);
  });
}

function bindTouchZone(zoneElement, direction) {
  zoneElement.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    patCat(direction, event);
    trackTouchSequence(direction);
  });
}

function getKeyboardDirection(key) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "a" || normalizedKey === "arrowleft") {
    return "left";
  }

  if (normalizedKey === "d" || normalizedKey === "arrowright") {
    return "right";
  }

  return null;
}

function handleKeyboardPat(event) {
  if (event.repeat) {
    return;
  }

  const direction = getKeyboardDirection(event.key);

  if (direction === null) {
    return;
  }

  event.preventDefault();
  patCat(direction, event);
}

catOptionElements.forEach((optionElement) => {
  optionElement.addEventListener("click", () => {
    selectCat(optionElement.dataset.cat);
  });
});

catMenuToggleElement.addEventListener("click", toggleCatMenu);

document.addEventListener("pointerdown", (event) => {
  if (catPickerElement.hidden) {
    return;
  }

  if (catPickerElement.contains(event.target) || catMenuToggleElement.contains(event.target)) {
    return;
  }

  closeCatMenu();
});

bindTouchZone(leftZoneElement, "left");
bindTouchZone(rightZoneElement, "right");
document.addEventListener("keydown", handleKeyboardPat);
catImageElement.addEventListener("click", handleCatImageClick);

motionNoticeCloseElement.addEventListener("click", () => {
  motionNoticeElement.hidden = true;
});

pangNoticeCloseElement.addEventListener("click", closePangNotice);

pangNoticeElement.addEventListener("pointerdown", (event) => {
  if (event.target !== pangNoticeElement) {
    return;
  }

  closePangNotice();
});

if (canUseDeviceMotion()) {
  motionToggleElement.addEventListener("click", () => {
    toggleMotionControl();
  });

  window.addEventListener("devicemotion", handleDeviceMotion);
} else {
  motionToggleElement.classList.add(MOTION_BUTTON_HIDDEN_CLASS_NAME);
}

showMotionNoticeIfNeeded();
preloadCatImages();
