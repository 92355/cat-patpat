const PATTING_CLASS_NAME = "is-patting";
const SELECTED_CLASS_NAME = "is-selected";
const ACTIVE_CLASS_NAME = "is-active";
const CENTER_IMAGE_KEY = "C";
const LEFT_IMAGE_KEY = "L";
const RIGHT_IMAGE_KEY = "R";
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
const BONUS_TOUCH_COUNT = 10000;
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
    imagePrefix: "ddol",
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

function patCat(direction, pointerEvent) {
  const config = directionConfig[direction];

  if (!config) {
    return;
  }

  patCount += 1;
  countElement.textContent = String(patCount);

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
  setCatImage(config.imageKey);
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
  patCount += BONUS_TOUCH_COUNT;
  countElement.textContent = String(patCount);
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
  motionToggleElement.textContent = isEnabled ? "흔들기 켜짐" : "흔들기 켜기";
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
    messageElement.textContent = "좌우로 톡 치면 토닥여요";
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

motionNoticeCloseElement.addEventListener("click", () => {
  motionNoticeElement.hidden = true;
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
