// Guardians and Tanks
let guardians = [
    { name: "Jade", color: "#00ff00", energy: 0, petrifying: false, tank: 1 },
    { name: "Jasper", color: "#d73b3e", energy: 0, petrifying: false, tank: 1 },
    { name: "Amethyst", color: "#9933ff", energy: 0, petrifying: false, tank: 2 }
];
const bossMaxHP = 235_000_000; // 235 million HP
let bossHP = bossMaxHP;

const tankMaxHP = 500_000; // Example tank HP, adjust as needed
const totalDPS = 550_000; // 550k DPS

const rendFleshDPSPerGuardian = 20_000; // example damage per second to tank from Rend Flesh

let tanks = [
  {
    id: 1,
    color: "#C41E3A",
    x: 235,
    y: 250,
    debuffs: {
      Jade: { stacks: 0, timer: 0 },
      Jasper: { stacks: 0, timer: 0 },
      Amethyst: { stacks: 0, timer: 0 }
    },
    hp: tankMaxHP
  },
  {
    id: 2,
    color: "#00FF98",
    x: 565,
    y: 250,
    debuffs: {
      Jade: { stacks: 0, timer: 0 },
      Jasper: { stacks: 0, timer: 0 },
      Amethyst: { stacks: 0, timer: 0 }
    },
    hp: tankMaxHP
  }
];

let ctx = null;
let tickInterval = null;

const PETRIFY_DELAY = 5; // seconds delay before petrify starts
const PETRIFY_DURATION = 75; // seconds

let petrifyTimer = 0; // counts time during petrify active
let petrifyDelayTimer = PETRIFY_DELAY; // counts delay before petrify starts
let petrifyActive = false; // whether petrify timer is ticking

let petrifyRotation = [];    // current order of the 3 guardians for petrify
let petrifyIndex = 0;        // current position in the rotation (0 to 2)

let gameMessage = "";      // current status message (success, fail, info)
let gameOver = false;      // whether the fight ended in fail


// Canvas positions for guardians when assigned to tank 1 or 2
const positions = {
    1: [{x: 150, y: 170}, {x: 150, y: 300}, {x: 150, y: 430}],
    2: [{x: 650, y: 170}, {x: 650, y: 300}, {x: 650, y: 430}]
};

function startFight() {
    guardians.forEach(g => {
        g.energy = 0;
        g.petrifying = false;
    });
    petrifyTimer = 0;
    petrifyDelayTimer = PETRIFY_DELAY;
    petrifyActive = false;
    gameMessage = "";
    bossHP = bossMaxHP;
    gameOver = false;      // whether the fight ended in fail
    //updateCanvas();
    //if (tickInterval) clearInterval(tickInterval);
    //tickInterval = setInterval(tick, 1000);
    requestAnimationFrame(gameLoop);
}

function startPetrify() {
  if (petrifyRotation.length === 0) {
    // first rotation ever, no previous last guardian
    petrifyRotation = generateRotation(null);
  } else if (petrifyIndex >= petrifyRotation.length) {
    // finished current rotation, generate new one avoiding repeats
    const lastGuardian = petrifyRotation[petrifyRotation.length - 1];
    petrifyRotation = generateRotation(lastGuardian);
    petrifyIndex = 0;
  }

  const guardianName = petrifyRotation[petrifyIndex];
  petrifyIndex++;

  petrifyingGuardian = guardians.find(g => g.name === guardianName);

  guardians.forEach(g => g.petrifying = (g === petrifyingGuardian));
}

let lastTimestamp = 0;

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000; // convert ms to seconds
    lastTimestamp = timestamp;

    updateLogic(deltaTime);
    updateCanvas();

    requestAnimationFrame(gameLoop);
}

function updateDebuffs(deltaTime) {
  guardians.forEach(g => {
    let tank = tanks.find(t => t.id === g.tank);
    if (!tank) return;



    let debuff = tank.debuffs[g.name];
    if (!debuff) {
      tank.debuffs[g.name] = { stacks: 0, timer: 0 };
      debuff = tank.debuffs[g.name];
    }

    // Increase timer by deltaTime
    debuff.timer += deltaTime;

    // If timer exceeds 4 seconds, add a stack and reset timer
    const stackInterval = 4; // 4 seconds per stack, adjust as needed
    while (debuff.timer >= stackInterval) {
      debuff.stacks++;
      debuff.timer -= stackInterval;
    }
  });
}

function updateLogic(deltaTime) {

    if (gameOver) return;  // ignore if already ended
    // Apply DPS damage to boss HP
    bossHP -= totalDPS * deltaTime;
    if (bossHP < 0) bossHP = 0;

    // Update guardians energy
    guardians.forEach(g => {
        let sameTankCount = guardians.filter(x => x.tank === g.tank).length;
        if (sameTankCount > 1) {
            g.energy += 2.5 * deltaTime;  
            if (g.energy >= 100) {
                overload(g);
            }
        }
    });
    if (!petrifyActive) {
        // Petrify is NOT active, so we are in the delay phase before a new petrify
        petrifyDelayTimer -= deltaTime;
        if (petrifyDelayTimer <= 0) {
            petrifyDelayTimer = PETRIFY_DELAY;
            petrifyTimer = 0;
            startPetrify();  // sets petrifyingGuardian from rotation
            petrifyActive = true;
        }
    } else {
        // Petrify active, timer counts up
        petrifyTimer += deltaTime;
        if (petrifyTimer >= PETRIFY_DURATION) {
        // Fail condition? Or overload should happen before this? Handle as needed
        }
    }

    // Update debuffs, stacks, or other timers similarly...
    updateDebuffs(deltaTime);
}

function overload(guardian) {
    if (gameOver) return;  // ignore if already ended

    if (guardian.petrifying) {
        gameMessage = `✅ SUCCESS! ${guardian.name} overloaded during Petrification!`;
        guardian.energy = 0;
        petrifyActive = false;
        petrifyTimer = 0;
        petrifyDelayTimer = PETRIFY_DELAY;

    } else {
        gameMessage = `❌ FAIL! ${guardian.name} overloaded without Petrification.`;
        gameOver = true;
        // Optionally, stop your game loop here
        // e.g. cancelAnimationFrame or similar
    }
}

function pickRandomPetrifier(excludeName = null) {
    guardians.forEach(g => g.petrifying = false);
    let candidates = guardians.filter(g => g.name !== excludeName);
    let choice = candidates[Math.floor(Math.random() * candidates.length)];
    choice.petrifying = true;
}

function generateRotation(prevLastGuardian) {
  // get a shuffled array of guardians
  const names = guardians.map(g => g.name);
  
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  let newRotation = shuffle(names.slice());

  // If the first guardian equals prevLastGuardian, reshuffle
  while (newRotation[0] === prevLastGuardian) {
    newRotation = shuffle(names.slice());
  }

  return newRotation;
}

function swapGuardian(name) {
  let g = guardians.find(x => x.name === name);
  let oldTank = tanks.find(t => t.id === g.tank);
  if (oldTank && oldTank.debuffs[g.name]) {
    oldTank.debuffs[g.name].stacks = 0;
    oldTank.debuffs[g.name].timer = 0;
  }
  g.tank = (g.tank === 1) ? 2 : 1;
  let newTank = tanks.find(t => t.id === g.tank);
  if (!newTank.debuffs[g.name]) newTank.debuffs[g.name] = { stacks: 0, timer: 0 };

  updateCanvas();

}

function onCanvasClick(e) {
    let rect = ctx.canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    guardians.forEach((g, index) => {
        let pos = positions[g.tank][index % positions[g.tank].length];
        let dx = mouseX - pos.x;
        let dy = mouseY - pos.y;
        if (dx * dx + dy * dy <= 30 * 30) {
            swapGuardian(g.name);
        }
    });
}

function updateGameMessage() {
    const el = document.getElementById("game-message");
    if (!el) return;

    if (gameMessage) {
        el.textContent = gameMessage;
        el.style.opacity = "1";
    } else {
        el.style.opacity = "0";
    }

    // Optionally clear message after 3-4 seconds if not gameOver
    if (!gameOver && gameMessage) {
        setTimeout(() => {
            gameMessage = "";
        }, 3500);
    }
}

function drawBars(ctx, canvasWidth) {
    const barHeight = 20;
    const spacing = 5;
    
    let y = 10;
    const barMaxWidth = canvasWidth / 3;
    const barX = (canvasWidth - barMaxWidth) / 2;  // centers the bars horizontally


    // Find which guardian is currently petrifying
    const petrifyingGuardian = guardians.find(g => g.petrifying);

    if (petrifyActive) {
        // Top Petrification bar
        const maxPetrifyTime = 75; // 1:15 in seconds
        const fillRatio = (petrifyTimer / maxPetrifyTime); // assuming petrifyTimer is counting up
        ctx.fillStyle = petrifyingGuardian.color;
        ctx.fillRect(barX, y, fillRatio * (canvasWidth / 3), barHeight);

        // Outline
        ctx.strokeStyle = "#000";
        ctx.strokeRect(barX, y, (canvasWidth / 3), barHeight);
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.fillText(`${petrifyingGuardian.name} Petrifying (${(maxPetrifyTime - petrifyTimer).toFixed(0)}s)`, barX + 15, y + 15);

        y += barHeight + spacing;
    }
    let x = 0;
    // Overload bars for each guardian
    guardians.forEach(g => {
        const maxEnergy = 100;
        const fillRatio = g.energy / maxEnergy;

        ctx.fillStyle = g.color;
        ctx.fillRect(barX+ x, y, fillRatio * (canvasWidth / 3) / 3, barHeight);

        ctx.strokeStyle = "#000";
        ctx.strokeRect(barX+x, y, (canvasWidth / 3) / 3, barHeight);
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.fillText(`${Math.round(g.energy)}`, barX+x + 15, y + 15);

        x += (canvasWidth / 3) / 3 + spacing;
    });
}

function drawHealthBar(x, y, width, height, currentHP, maxHP, color, label) {
  ctx.fillStyle = "#333";
  ctx.fillRect(x, y, width, height);

  const hpRatio = currentHP / maxHP;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * hpRatio, height);
  ctx.save();

  ctx.fillStyle = "#fff";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${label}: ${(currentHP / 1e6).toFixed(1)}M / ${(maxHP / 1e6).toFixed(1)}M`, x + width / 2, y + height / 2);
  ctx.restore();
}

function updateCanvas() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawBars(ctx, ctx.canvas.width);
      // Draw boss health bar (big one at the top)
    drawHealthBar((ctx.canvas.width/2)-150, 70, 300, 20, bossHP, bossMaxHP, "#cc0000", "Boss HP");

    // Draw tank health bars below (for tank 1 and 2)
    //drawHealthBar(50, 45, (ctx.canvas.width - 100) / 2 - 10, 20, tanks[0].hp, tankMaxHP, "#0066cc", "Tank 1 HP");
    //drawHealthBar(50 + (ctx.canvas.width - 100) / 2 + 10, 45, (ctx.canvas.width - 100) / 2 - 10, 20, tanks[1].hp, tankMaxHP, "#0066cc", "Tank 2 HP");


    // Draw tanks
    for (let tank of tanks) {
        ctx.fillStyle = tank.color;
        ctx.fillRect(tank.x - 25, tank.y - 25, 50, 50);
        ctx.fillStyle = "#fff";
        ctx.fillText(`Tank ${tank.id}`, tank.x - 25, tank.y - 35);

        ctx.save();
        // Draw debuff stack squares inside tank box
        const debuffSize = 14;      // size of each small square
        const padding = 3;          // spacing between stack squares
        let i = 0;

        for (const [guardianName, debuff] of Object.entries(tank.debuffs)) {
            if (debuff.stacks > 0) {
                // Position squares in a row at bottom of tank square
                const x = tank.x - 25 + padding + i * (debuffSize + padding);
                const y = tank.y + 25 - debuffSize - padding;

                // Draw small square with guardian color
                const guardian = guardians.find(g => g.name === guardianName);
                ctx.fillStyle = guardian ? guardian.color : "#888";
                ctx.fillRect(x, y, debuffSize, debuffSize);

                // Draw stack count number
                ctx.fillStyle = "#000";
                ctx.font = "12px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(debuff.stacks, x + debuffSize / 2, y + debuffSize / 2);

                i++;
            }
        }
        ctx.restore();
    }

    // Draw guardians
    guardians.forEach((g, index) => {
        let pos = positions[g.tank][index % positions[g.tank].length];

        // If petrifying, draw a pulsing outer circle
        if (petrifyActive && g.petrifying) {
            let pulse = Math.sin(Date.now() / 200) * 5 + 35;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pulse, 0, Math.PI * 2);
            ctx.fillStyle = g.color
            ctx.fill();
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = g.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        // Text labels
        ctx.fillStyle = "#fff";
        ctx.fillText(`${g.name}`, pos.x - 25, pos.y - 45);
        //ctx.fillText(`${g.energy}%`, pos.x - 20, pos.y + 50);

        // Petrify label
        /*if (g.petrifying) {
            ctx.fillStyle = "#0f0";
            ctx.fillText("PETRIFYING!", pos.x - 35, pos.y - 60);
        }*/
    });


    updateGameMessage();
}

window.onload = function() {
    ctx = document.getElementById("arena").getContext("2d");
    ctx.font = "14px Arial";
    ctx.canvas.addEventListener("click", onCanvasClick);
    updateCanvas();
};