'use strict';

const elGameMenu      = document.querySelector('.game-menu');
const elWrapper       = document.querySelector('.wrapper');
const elGameScreen    = document.querySelector('.game-screen');
const elGamePanels    = document.querySelector('.game-panels');
const elGunman        = document.querySelector('.gunman');
const elMessage       = document.querySelector('.message');
const elWinScreen     = document.querySelector('.win-screen');
const elTimeYou       = document.querySelector('.time-panel__you');
const elTimeGunman    = document.querySelector('.time-panel__gunman');
const elScoreNum      = document.querySelector('.score-panel__score_num');
const elLevelNum      = document.querySelector('.level-num');
const elWinTotal      = document.querySelector('.win-total-score');
const btnStart        = document.querySelector('.button-start-game');
const btnRestart      = document.querySelector('.button-restart');
const btnNextLevel    = document.querySelector('.button-next-level');
const btnPlayAgain    = document.querySelector('.button-play-again');

const createAudio = (src, loop = false) => {
    const fileName = src.includes('.') ? src : `${src}.m4a`;
    const a = new Audio(`audio/${fileName}`);
    a.loop = loop;
    return a;
};

const sounds = {
    intro:    createAudio('intro.m4a', true),
    wait:     createAudio('wait.m4a'),
    fire:     createAudio('fire.m4a'),
    shot:     createAudio('shot.m4a'),
    death:    createAudio('death.m4a'),
    foul:     createAudio('foul.m4a'),
    win:      createAudio('win.m4a'),
    shotFall: createAudio('shot-fall.m4a'),
};

const playSound = (name) => {
    const s = sounds[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {});
};

const stopSound = (name) => {
    const s = sounds[name];
    if (!s) return;
    s.pause();
    s.currentTime = 0;
};

const stopAll = () => Object.keys(sounds).forEach(stopSound);

const TOTAL_LEVELS = 5;

const createInitialState = () => ({
    level:          1,
    score:          0,
    phase:          'menu',
    fireTime:       null,
    playerTime:     null,
    gunmanTime:     null,
    gunmanTimerId:  null,
    counterTimerId: null,
    canShoot:       false,
});

let state = createInitialState();

const getGunmanDelay = (level) => Math.max(300, 1200 - (level - 1) * 180);
const getLevelReward  = (level) => level * 100;

const showEl    = (el) => { el.style.display = 'block'; };
const hideEl    = (el) => { el.style.display = 'none'; };

const setGunmanClass = (...classes) => {
    elGunman.className = `gunman gunman-lvl-${state.level} ${classes.join(' ')}`;
};

const clearMessage = () => {
    elMessage.innerHTML = '';
    elMessage.className = 'message';
};

const showFireBubble = () => {
    clearMessage();
    const bubble = document.createElement('div');
    bubble.className = 'fire-bubble';
    bubble.textContent = 'FIRE!!!';
    elMessage.appendChild(bubble);
};

const showResultMessage = (type, text) => {
    clearMessage();
    elMessage.className = `message message--${type}`;
    elMessage.textContent = text;
};

const fmt = (ms) => (ms / 1000).toFixed(2);

function startGame() {
    state = createInitialState();
    hideEl(elGameMenu);
    showEl(elWrapper);
    showEl(elGamePanels);
    showEl(elGameScreen);
    hideEl(elWinScreen);
    hideEl(btnRestart);
    hideEl(btnNextLevel);

    elScoreNum.textContent = state.score;
    elLevelNum.textContent = state.level;
    elTimeYou.textContent = '0.00';
    elTimeGunman.textContent = '0.00';

    stopAll();
    playSound('intro');
    moveGunman();
}

function restartGame() {
    clearTimers();
    clearMessage();
    hideEl(btnRestart);
    hideEl(btnNextLevel);
    elGameScreen.classList.remove('game-screen--death', 'duel-active');
    elTimeYou.textContent = '0.00';
    elTimeGunman.textContent = '0.00';

    stopAll();
    playSound('intro');
    moveGunman();
}

function nextLevel() {
    clearTimers();
    clearMessage();
    hideEl(btnRestart);
    hideEl(btnNextLevel);
    elGameScreen.classList.remove('duel-active');
    state.level++

    if (state.level > TOTAL_LEVELS) {
        showWinScreen();
        return;
    }

    elLevelNum.textContent = state.level;
    elTimeYou.textContent = '0.00';
    elTimeGunman.textContent = '0.00';

    stopAll();
    playSound('intro');
    moveGunman();
}

function showWinScreen() {
    console.log("Кінець гри! Очки:", state.score);
    stopAll();
    playSound('win');
    if (elWrapper) elWrapper.style.display = 'none';
    if (elGameMenu) elGameMenu.style.display = 'none';
    if (elWinTotal) {
        elWinTotal.textContent = state.score;
    }
    if (elWinScreen) {
        elWinScreen.classList.add('visible');
        elWinScreen.style.display = 'flex';
    }
}

function playAgain() {
    elWinScreen.classList.remove('visible');
    startGame();
}

function moveGunman() {
    state.phase = 'walking';
    elGameScreen.classList.remove('game-screen--death', 'duel-active');
    clearMessage();
    elGameScreen.style.overflow = 'visible';
    elGunman.style.transition = 'none';
    elGunman.classList.remove('looking-right');
    if (state.level === 3) {
        elGunman.style.left = '-150px';
        elGunman.classList.add('looking-right');
    } else {
        elGunman.style.left = '820px';
    }
    elGunman.className = `gunman gunman-lvl-${state.level} walking ${state.level === 3 ? 'looking-right' : ''}`;

    void elGunman.offsetWidth;

    elGunman.style.transition = 'left 4s linear';
    elGunman.style.left = '330px';

    const fallbackTimer = setTimeout(() => {
        elGameScreen.style.overflow = 'hidden';
        onGunmanArrived();
    }, 4300);

    elGunman.addEventListener('transitionend', () => {
        clearTimeout(fallbackTimer);
        elGameScreen.style.overflow = 'hidden';
        onGunmanArrived();
    }, { once: true });
}

function onGunmanArrived() {
    if (state.phase !== 'walking') return;
    prepareForDuel();
}

function prepareForDuel() {
    state.phase = 'standing';
    setGunmanClass('standing');
    elGunman.style.transition = 'none';

    stopAll();
    playSound('wait');

    const waitMs = 1500 + Math.random() * 2500;

    state.gunmanTimerId = setTimeout(() => {
        startDuel();
    }, waitMs);
}

function startDuel() {
    state.phase    = 'duel';
    state.fireTime = performance.now();
    state.canShoot = true;

    setGunmanClass('ready');
    showFireBubble();
    stopAll();
    playSound('fire');

    elGameScreen.classList.add('duel-active');

    const gunmanDelay = getGunmanDelay(state.level);
    state.gunmanTimerId = setTimeout(() => {
        gunmanShootsPlayer();
    }, gunmanDelay);

    timeCounter();
}

function timeCounter() {
    const tick = () => {
        if (state.phase !== 'duel') return;
        const elapsed = performance.now() - state.fireTime;
        elTimeYou.textContent = fmt(elapsed);
        state.counterTimerId = requestAnimationFrame(tick);
    };
    state.counterTimerId = requestAnimationFrame(tick);
}

function gunmanShootsPlayer() {
    if (state.phase !== 'duel') return;

    const elapsed = performance.now() - state.fireTime;
    state.gunmanTime = elapsed;
    state.phase = 'result';
    state.canShoot = false;

    cancelAnimationFrame(state.counterTimerId);
    elGameScreen.classList.remove('duel-active');

    setGunmanClass('shooting');
    elTimeGunman.textContent = fmt(elapsed);

    stopAll();
    playSound('foul');

    elGameScreen.classList.add('game-screen--death');
    showResultMessage('dead', 'YOU LOST!');

    setTimeout(() => {
        elGameScreen.classList.remove('game-screen--death');
        showEl(btnRestart);
    }, 2000);
}

function playerShootsGunman(evt) {
    if (!state.canShoot || state.phase !== 'duel') return;

    if (!evt.target.classList.contains('gunman') &&
        !elGunman.contains(evt.target)) {
        return;
    }

    const elapsed = performance.now() - state.fireTime;

    clearTimeout(state.gunmanTimerId);
    cancelAnimationFrame(state.counterTimerId);

    state.playerTime = elapsed;
    state.phase = 'result';
    state.canShoot = false;

    elGameScreen.classList.remove('duel-active');

    setGunmanClass('dead');
    elTimeYou.textContent = fmt(elapsed);

    stopAll();
    playSound('shot');
    setTimeout(() => playSound('shotFall'), 300);

    const reward = scoreCount(state.level);
    state.score += reward;
    elScoreNum.textContent = state.score;

    showResultMessage('win', `YOU WIN! +$${reward}`);

    setTimeout(() => {
        if (state.level >= TOTAL_LEVELS) {
            showEl(btnNextLevel);
            btnNextLevel.textContent = 'Finish ★';
        } else {
            showEl(btnNextLevel);
        }
    }, 2000);
}

function scoreCount(level) {
    return getLevelReward(level);
}

function clearTimers() {
    clearTimeout(state.gunmanTimerId);
    cancelAnimationFrame(state.counterTimerId);
    state.canShoot = false;
    state.phase = 'idle';
}

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', restartGame);
btnNextLevel.addEventListener('click', nextLevel);
btnPlayAgain.addEventListener('click', playAgain);

elGameScreen.addEventListener('click', (evt) => {
    playerShootsGunman(evt);
});