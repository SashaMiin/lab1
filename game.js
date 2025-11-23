document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game');
    const waterAmountInput = document.getElementById('waterAmount');
    const startGameButton = document.getElementById('startGame');
    const loadWaterButton = document.getElementById('loadWater');
    const messageElement = document.getElementById('message');
    const timerElement = document.getElementById('timer');
    const loadingWaterElement = document.getElementById('loadingWater');
    const arrivalTimeElement = document.getElementById('arrivalTime');
    const waterLevelElement = document.getElementById('waterLevel');
    const gameDuration = 70000; // 70 секунд

    const gridSize = 10;
    const cells = [];
    const fireSpreadInterval = 15000; // интервал распространения огня в миллисекундах
    const loadingWaterTime = 15000; // время загрузки воды в миллисекундах
    const basePosition = 0; // позиция базы (левый верхний угол)
    const waterCapacity = 100; // максимальная емкость воды

    let gameInterval;
    let fireSpreadTimeout;
    let fires = [];
    let waterAmount = parseInt(waterAmountInput.value, 10);
    let currentWaterLevel = waterCapacity;
    let gameStartTime;
    let loadingWaterTimeout;
    let arrivalTimeout;
    let remainingGameTime = gameDuration;
    let fireTruckPosition = basePosition;
    let fireTruckMoving = false;

    waterAmountInput.addEventListener('change', (e) => {
        waterAmount = parseInt(e.target.value, 10);
    });

    startGameButton.addEventListener('click', startGame);
    loadWaterButton.addEventListener('click', loadWater);

    function createGameBoard() {
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => handleCellClick(cell));
            gameBoard.appendChild(cell);
            cells.push(cell);
        }
    }

    function startGame() {
        resetGame();
        messageElement.textContent = 'Игра началась!';
        gameStartTime = Date.now();
        gameInterval = setInterval(updateGameTime, 1000);
        startFire();
        loadWaterButton.disabled = false;
        updateWaterLevel();
    }

    function resetGame() {
        clearInterval(gameInterval);
        clearTimeout(fireSpreadTimeout);
        clearTimeout(loadingWaterTimeout);
        clearTimeout(arrivalTimeout);
        fires = [];
        cells.forEach(cell => {
            cell.classList.remove('fire-weak', 'fire-medium', 'fire-strong', 'river', 'fire-truck');
            cell.style.backgroundColor = 'green';
        });
        fireTruckPosition = basePosition;
        currentWaterLevel = waterCapacity;
        markFireTruckPosition();
        remainingGameTime = gameDuration;
        timerElement.textContent = `Оставшееся время: ${remainingGameTime / 1000}`;
        loadingWaterElement.textContent = 'Время загрузки воды: -';
        arrivalTimeElement.textContent = 'Время прибытия машины: -';
        waterLevelElement.textContent = 'Уровень воды: -';
    }

    function startFire() {
        const initialFireIndex = Math.floor(Math.random() * cells.length);
        igniteFire(initialFireIndex);
        fireSpreadTimeout = setTimeout(spreadFire, fireSpreadInterval);
    }

    function igniteFire(index) {
        const cell = cells[index];
        if (!cell.classList.contains('fire-weak') &&
            !cell.classList.contains('fire-medium') &&
            !cell.classList.contains('fire-strong')) {
            cell.classList.add('fire-weak');
            cell.style.backgroundColor = 'orange';
            fires.push({ index, strength: 1 });
        }
    }

    function spreadFire() {
        const newFires = [];
        fires.forEach(fire => {
            const adjacentCells = getAdjacentCells(fire.index);
            adjacentCells.forEach(index => {
                if (Math.random() > 0.5) { // 50% шанс распространения
                    newFires.push(index);
                }
            });
            increaseFireStrength(fire);
        });
        newFires.forEach(index => igniteFire(index));
        if (fires.length > 0) {
            fireSpreadTimeout = setTimeout(spreadFire, fireSpreadInterval);
        } else {
            checkVictory();
        }
    }

    function increaseFireStrength(fire) {
        const cell = cells[fire.index];
        fire.strength++;
        if (fire.strength === 2) {
            cell.classList.replace('fire-weak', 'fire-medium');
            cell.style.backgroundColor = 'red';
        } else if (fire.strength === 3) {
            cell.classList.replace('fire-medium', 'fire-strong');
            cell.style.backgroundColor = 'darkred';
        }
    }

    function getAdjacentCells(index) {
        const adjacent = [];
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        if (row > 0) adjacent.push(index - gridSize);
        if (row < gridSize - 1) adjacent.push(index + gridSize);
        if (col > 0) adjacent.push(index - 1);
        if (col < gridSize - 1) adjacent.push(index + 1);
        return adjacent;
    }

    function handleCellClick(cell) {
        const index = parseInt(cell.dataset.index, 10);
        if ((cell.classList.contains('fire-weak') ||
            cell.classList.contains('fire-medium') ||
            cell.classList.contains('fire-strong')) && currentWaterLevel > 0) {
            extinguishFire(index, waterAmount);
        }
    }

    function extinguishFire(index, water) {
        if (fireTruckMoving) return;
        const cell = cells[index];
        const fire = fires.find(f => f.index === index);
        if (fire) {
            const distance = calculateDistance(fireTruckPosition, index);
            const travelTime = distance * 1000; // 1 секунда за клетку
            startArrivalTimer(() => {
                fire.strength -= water / 10;
                currentWaterLevel -= water;
                updateWaterLevel();
                if (fire.strength <= 0) {
                    cell.classList.remove('fire-weak', 'fire-medium', 'fire-strong');
                    cell.style.backgroundColor = 'green';
                    fires = fires.filter(f => f.index !== index);
                    checkVictory();
                } else if (fire.strength < 2
                ) {
                    cell.classList.replace('fire-medium', 'fire-weak');
                    cell.style.backgroundColor = 'orange';
                } else if (fire.strength < 3) {
                    cell.classList.replace('fire-strong', 'fire-medium');
                    cell.style.backgroundColor = 'red';
                }
                fireTruckPosition = index;
                markFireTruckPosition();
            }, travelTime);
        }
    }

    function checkVictory() {
        if (fires.length === 0) {
            clearInterval(gameInterval);
            messageElement.textContent = 'Вы победили!';
        }
    }

    function endGame() {
        clearInterval(gameInterval);
        if (fires.length > 0) {
            messageElement.textContent = 'Вы проиграли! Время вышло.';
        } else {
            messageElement.textContent = 'Вы победили!';
        }
        loadWaterButton.disabled = true;
    }

    function updateGameTime() {
        const elapsed = Date.now() - gameStartTime;
        remainingGameTime = gameDuration - elapsed;
        if (remainingGameTime <= 0) {
            endGame();
        } else {
            timerElement.textContent = `Оставшееся время: ${Math.ceil(remainingGameTime / 1000)}`;
        }
    }

    function loadWater() {
        if (fireTruckMoving) return;
        loadWaterButton.disabled = true;
        let loadingWaterTimeLeft = loadingWaterTime / 1000;
        loadingWaterElement.textContent = `Время загрузки воды: ${loadingWaterTimeLeft}`;
        loadingWaterTimeout = setInterval(() => {
            loadingWaterTimeLeft--;
            if (loadingWaterTimeLeft > 0) {
                loadingWaterElement.textContent = `Время загрузки воды: ${loadingWaterTimeLeft}`;
            } else {
                clearInterval(loadingWaterTimeout);
                loadingWaterElement.textContent = 'Вода загружена!';
                currentWaterLevel = waterCapacity;
                updateWaterLevel();
                fireTruckPosition = basePosition;
                markFireTruckPosition();
                startArrivalTimer(() => {
                    loadWaterButton.disabled = false;
                }, loadingWaterTime);
            }
        }, 1000);
    }

    function startArrivalTimer(callback, travelTime) {
        let arrivalTimeLeft = travelTime / 1000;
        arrivalTimeElement.textContent = `Время прибытия машины: ${arrivalTimeLeft}`;
        fireTruckMoving = true;
        arrivalTimeout = setInterval(() => {
            arrivalTimeLeft--;
            if (arrivalTimeLeft > 0) {
                arrivalTimeElement.textContent = `Время прибытия машины: ${arrivalTimeLeft}`;
            } else {
                clearInterval(arrivalTimeout);
                arrivalTimeElement.textContent = 'Машина прибыла!';
                fireTruckMoving = false;
                callback();
            }
        }, 1000);
    }

    function calculateDistance(startIndex, endIndex) {
        const startRow = Math.floor(startIndex / gridSize);
        const startCol = startIndex % gridSize;
        const endRow = Math.floor(endIndex / gridSize);
        const endCol = endIndex % gridSize;
        return Math.abs(startRow - endRow) + Math.abs(startCol - endCol);
    }

    function markFireTruckPosition() {
        cells.forEach(cell => {
            cell.classList.remove('fire-truck');
        });
        cells[fireTruckPosition].classList.add('fire-truck');
    }

    function updateWaterLevel() {
        waterLevelElement.textContent = `Уровень воды: ${currentWaterLevel} л / ${waterCapacity} л`;
    }

    createGameBoard();
    markFireTruckPosition();
});
