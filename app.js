const PATTING_CLASS_NAME = "is-patting";
const SELECTED_CLASS_NAME = "is-selected";
const ACTIVE_CLASS_NAME = "is-active";
const CENTER_IMAGE_KEY = "C";
const LEFT_IMAGE_KEY = "L";
const RIGHT_IMAGE_KEY = "R";
const DDOL_HIDDEN_IMAGE_KEYS = ["a", "b"];
const DDOL_HIDDEN_IMAGE_PROBABILITY = 0.03;
const ANIMATION_RESET_DELAY_MS = 430;
const BURST_REMOVE_DELAY_MS = 760;
const MOTION_IMPACT_THRESHOLD = 8;
const MOTION_MIN_INTERVAL_MS = 520;
const MOTION_BUTTON_ENABLED_CLASS_NAME = "is-enabled";
const MOTION_BUTTON_HIDDEN_CLASS_NAME = "is-hidden";

const catElement = document.querySelector("#cat");
const catImageElement = document.querySelector("#catImage");
const messageElement = document.querySelector("#message");
const countElement = document.querySelector("#count");
const leftZoneElement = document.querySelector("#leftZone");
const rightZoneElement = document.querySelector("#rightZone");
const motionToggleElement = document.querySelector("#motionToggle");
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
    messageSuffix: "왼쪽으로 살랑",
    burst: "pat",
    button: leftZoneElement,
  },
  right: {
    imageKey: RIGHT_IMAGE_KEY,
    messageSuffix: "오른쪽으로 살랑",
    burst: "pat",
    button: rightZoneElement,
  },
};

let selectedCatKey = "cheese";
let patCount = 0;
let resetTimerId = 0;
let isMotionEnabled = false;
let previousMotionX = null;
let lastMotionPatTime = 0;

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

  catOptionElements.forEach((optionElement) => {
    const isSelected = optionElement.dataset.cat === catKey;
    optionElement.classList.toggle(SELECTED_CLASS_NAME, isSelected);
    optionElement.setAttribute("aria-pressed", String(isSelected));
  });
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

function getMotionX(deviceMotionEvent) {
  const acceleration = deviceMotionEvent.accelerationIncludingGravity ?? deviceMotionEvent.acceleration;

  if (typeof acceleration?.x !== "number") {
    return null;
  }

  return acceleration.x;
}

function getMotionPatEvent(direction) {
  const clientX = direction === "left" ? window.innerWidth * 0.25 : window.innerWidth * 0.75;

  return {
    clientX,
    clientY: window.innerHeight - 132,
  };
}

function handleDeviceMotion(deviceMotionEvent) {
  if (!isMotionEnabled) {
    return;
  }

  const motionX = getMotionX(deviceMotionEvent);

  if (motionX === null) {
    return;
  }

  if (previousMotionX === null) {
    previousMotionX = motionX;
    return;
  }

  const impactX = motionX - previousMotionX;
  const now = Date.now();

  previousMotionX = motionX;

  if (Math.abs(impactX) < MOTION_IMPACT_THRESHOLD) {
    return;
  }

  if (now - lastMotionPatTime < MOTION_MIN_INTERVAL_MS) {
    return;
  }

  lastMotionPatTime = now;

  // Map lateral impact to the existing pat flow. / 좌우 충격을 기존 토닥 흐름으로 연결.
  const direction = impactX < 0 ? "left" : "right";

  patCat(direction, getMotionPatEvent(direction));
}

function setMotionEnabled(isEnabled) {
  isMotionEnabled = isEnabled;
  previousMotionX = null;
  motionToggleElement.classList.toggle(MOTION_BUTTON_ENABLED_CLASS_NAME, isEnabled);
  motionToggleElement.textContent = isEnabled ? "흔들기 켜짐" : "흔들기 켜기";
  motionToggleElement.setAttribute("aria-pressed", String(isEnabled));
}

function canUseDeviceMotion() {
  return "DeviceMotionEvent" in window;
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
  });
}

catOptionElements.forEach((optionElement) => {
  optionElement.addEventListener("click", () => {
    selectCat(optionElement.dataset.cat);
  });
});

bindTouchZone(leftZoneElement, "left");
bindTouchZone(rightZoneElement, "right");

if (canUseDeviceMotion()) {
  motionToggleElement.addEventListener("click", () => {
    toggleMotionControl();
  });

  window.addEventListener("devicemotion", handleDeviceMotion);
} else {
  motionToggleElement.classList.add(MOTION_BUTTON_HIDDEN_CLASS_NAME);
}

preloadCatImages();
