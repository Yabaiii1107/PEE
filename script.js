const roomKeys = [
    "101", "102", "103", "104",
    "201", "202", "203", "204",
    "301", "302", "303", "304", "AVR"
];

const roomsData = {};

let currentActiveRoom = null;

const electricityRatePHP = 14;
const totalKwhSavedBase = 145.20;

const appliances = [
    "fan1", "fan2", "fan3", "fan4",
    "light1", "light2", "light3", "light4",
    "tv"
];

const appliancePowerMap = {
    fan: 0.35,
    light: 0.15,
    tv: 0.50
};

/* ---------------------------
   INITIALIZE ROOM DATA
---------------------------- */

roomKeys.forEach(room => {

    roomsData[room] = {
        occupied: false,
        current: 0,
        power: 0
    };

    appliances.forEach(item => {
        roomsData[room][item] = false;
    });

});

/* ---------------------------
   GENERATE ROOM BUTTONS
---------------------------- */

const roomDirectory = document.getElementById("roomDirectory");

roomKeys.forEach(room => {

    const btn = document.createElement("div");

    btn.className = "room-btn";
    btn.id = `btn-${room}`;

    btn.innerText = room === "AVR"
        ? "AVR"
        : `Room ${room}`;

    btn.onclick = () => showRoomView(room);

    roomDirectory.appendChild(btn);

});

/* ---------------------------
   GENERATE FAN CONTROLS
---------------------------- */

const fanControls = document.getElementById("fanControls");

for (let i = 1; i <= 4; i++) {

    fanControls.innerHTML += createSwitchHTML(
        `Fan ${i}`,
        `fan${i}`
    );

}

/* ---------------------------
   GENERATE LIGHT CONTROLS
---------------------------- */

const lightControls = document.getElementById("lightControls");

for (let i = 1; i <= 4; i++) {

    lightControls.innerHTML += createSwitchHTML(
        `Row ${i} Lights`,
        `light${i}`
    );

}

lightControls.innerHTML += `
<div class="switch-item" style="grid-column: span 2;">
    <span>Television Unit (TV)</span>

    <label class="switch">
        <input
            type="checkbox"
            id="tv"
            onchange="updateRoomState()"
        >
        <span class="slider"></span>
    </label>
</div>
`;

/* ---------------------------
   REUSABLE SWITCH TEMPLATE
---------------------------- */

function createSwitchHTML(label, id) {

    return `
        <div class="switch-item">

            <span>${label}</span>

            <label class="switch">
                <input
                    type="checkbox"
                    id="${id}"
                    onchange="updateRoomState()"
                >
                <span class="slider"></span>
            </label>

        </div>
    `;
}

/* ---------------------------
   DASHBOARD VIEW
---------------------------- */

function showDashboardView() {

    toggleViews("dashboardView");

    document.getElementById("menuDashboard")
        .classList.add("active");

    clearActiveRoom();

    document.getElementById("navTitle")
        .innerText = "System Dashboard";

    calculateGlobalMetrics();
}

/* ---------------------------
   ROOM VIEW
---------------------------- */

function showRoomView(room) {

    toggleViews("roomsView");

    document.getElementById("menuDashboard")
        .classList.remove("active");

    clearActiveRoom();

    currentActiveRoom = room;

    document.getElementById(`btn-${room}`)
        .classList.add("active-room");

    const displayName = room === "AVR"
        ? "AVR"
        : `Room ${room}`;

    document.getElementById("navTitle")
        .innerText = `${displayName} Management`;

    document.getElementById("roomCardTitle")
        .innerText = `Live ${displayName} Sensor Data`;

    loadRoomState(room);
}

/* ---------------------------
   LOAD ROOM STATE
---------------------------- */

function loadRoomState(room) {

    const data = roomsData[room];

    document.getElementById("roomOccupiedToggle")
        .checked = data.occupied;

    appliances.forEach(item => {
        document.getElementById(item).checked = data[item];
    });

    displayMetrics(data.current, data.power);
}

/* ---------------------------
   UPDATE ROOM STATE
---------------------------- */

function updateRoomState() {

    if (!currentActiveRoom) return;

    const data = roomsData[currentActiveRoom];

    data.occupied = document.getElementById(
        "roomOccupiedToggle"
    ).checked;

    appliances.forEach(item => {
        data[item] = document.getElementById(item).checked;
    });

    calculateRoomPower(data);

    displayMetrics(data.current, data.power);

    calculateGlobalMetrics();
}

/* ---------------------------
   CALCULATE ROOM POWER
---------------------------- */

function calculateRoomPower(data) {

    const fanCount = countEnabled(data, "fan");
    const lightCount = countEnabled(data, "light");
    const tvCount = data.tv ? 1 : 0;

    data.current =
        (fanCount * appliancePowerMap.fan) +
        (lightCount * appliancePowerMap.light) +
        (tvCount * appliancePowerMap.tv);

    data.power = (data.current * 220) / 1000;
}

/* ---------------------------
   COUNT ENABLED DEVICES
---------------------------- */

function countEnabled(data, prefix) {

    return Object.keys(data)
        .filter(key =>
            key.startsWith(prefix) && data[key]
        ).length;
}

/* ---------------------------
   DISPLAY METRICS
---------------------------- */

function displayMetrics(current, power) {

    document.getElementById("currentVal")
        .innerText = `${current.toFixed(2)} A`;

    document.getElementById("powerVal")
        .innerText = `${power.toFixed(2)} kW`;
}

/* ---------------------------
   GLOBAL METRICS
---------------------------- */

function calculateGlobalMetrics() {

    let totalPowerDraw = 0;
    let totalWastedPower = 0;

    let wasteHTML = "";
    let occupiedHTML = "";

    let wasteCount = 0;
    let occupiedCount = 0;

    roomKeys.forEach(room => {

        const data = roomsData[room];

        totalPowerDraw += data.power;

        const activeDevices = [];

        if (countEnabled(data, "fan"))
            activeDevices.push("Fans");

        if (countEnabled(data, "light"))
            activeDevices.push("Lights");

        if (data.tv)
            activeDevices.push("TV");

        if (activeDevices.length === 0)
            return;

        const roomName = room === "AVR"
            ? "AVR"
            : `Room ${room}`;

        const html = createAlertHTML(
            roomName,
            activeDevices,
            data.power
        );

        if (data.occupied) {

            occupiedCount++;
            occupiedHTML += html.occupied;

        } else {

            wasteCount++;
            totalWastedPower += data.power;
            wasteHTML += html.waste;
        }

    });

    updateDashboardMetrics(
        totalPowerDraw,
        totalWastedPower
    );

    renderAlerts(
        wasteCount,
        occupiedCount,
        wasteHTML,
        occupiedHTML
    );
}

/* ---------------------------
   ALERT TEMPLATE
---------------------------- */

function createAlertHTML(room, devices, power) {

    return {

        occupied: `
            <div class="alert-item alert-occupied">

                <div>
                    <span class="room-badge bg-blue-badge">
                        ${room}
                    </span>

                    Active:
                    <strong>${devices.join(", ")}</strong>
                </div>

                <div style="font-weight:bold;">
                    ${power.toFixed(2)} kW
                </div>

            </div>
        `,

        waste: `
            <div class="alert-item alert-waste">

                <div>
                    <span class="room-badge bg-red-badge">
                        ${room}
                    </span>

                    Wasting:
                    <strong>${devices.join(", ")}</strong>
                </div>

                <div style="font-weight:bold;">
                    ${power.toFixed(2)} kW
                </div>

            </div>
        `
    };
}

/* ---------------------------
   UPDATE DASHBOARD METRICS
---------------------------- */

function updateDashboardMetrics(totalPower, wastedPower) {

    document.getElementById("globalPowerDraw")
        .innerText = `${totalPower.toFixed(2)} kW`;

    document.getElementById("globalWasted")
        .innerText = `${wastedPower.toFixed(2)} kW`;

    const financial =
        (totalKwhSavedBase * electricityRatePHP)
        - (wastedPower * electricityRatePHP);

    const financialElement =
        document.getElementById("globalFinancial");

    if (financial >= 0) {

        financialElement.innerText =
            `+ ₱${financial.toFixed(2)}`;

        financialElement.style.color =
            "var(--eco-green)";

    } else {

        financialElement.innerText =
            `- ₱${Math.abs(financial).toFixed(2)}`;

        financialElement.style.color =
            "var(--danger-red)";
    }
}

/* ---------------------------
   RENDER ALERTS
---------------------------- */

function renderAlerts(
    wasteCount,
    occupiedCount,
    wasteHTML,
    occupiedHTML
) {

    document.getElementById("wasteContainer")
        .innerHTML = wasteCount === 0
        ? `<div class="empty-notify">
                ✓ No unmonitored energy waste occurring on campus.
           </div>`
        : wasteHTML;

    document.getElementById("occupiedContainer")
        .innerHTML = occupiedCount === 0
        ? `<div class="empty-notify">
                No rooms are currently marked as occupied.
           </div>`
        : occupiedHTML;
}

/* ---------------------------
   HELPER FUNCTIONS
---------------------------- */

function toggleViews(activeView) {

    document.getElementById("dashboardView")
        .classList.remove("active-view");

    document.getElementById("roomsView")
        .classList.remove("active-view");

    document.getElementById(activeView)
        .classList.add("active-view");
}

function clearActiveRoom() {

    if (!currentActiveRoom) return;

    document.getElementById(`btn-${currentActiveRoom}`)
        .classList.remove("active-room");
}

/* ---------------------------
   INITIALIZE
---------------------------- */

calculateGlobalMetrics();

const startTime = Date.now();

function updateClock() {

    const now = new Date();

    /* DATE */

    const dateOptions = {
        year: "numeric",
        month: "long",
        day: "numeric"
    };

    document.getElementById("liveDate").innerText =
        now.toLocaleDateString("en-US", dateOptions);

    /* TIME */

    document.getElementById("liveClock").innerText =
        now.toLocaleTimeString();

    /* UPTIME */

    const uptimeSeconds =
        Math.floor((Date.now() - startTime) / 1000);

    const hours =
        Math.floor(uptimeSeconds / 3600);

    const minutes =
        Math.floor((uptimeSeconds % 3600) / 60);

    const seconds =
        uptimeSeconds % 60;

    document.getElementById("uptime").innerText =
        `Uptime: ${hours}h ${minutes}m ${seconds}s`;
}

/* UPDATE EVERY SECOND */

setInterval(updateClock, 1000);

updateClock();

/* =========================
   ENERGY CONSUMPTION GRAPH
========================= */

const ctx = document.getElementById("energyChart");

/* SAMPLE DATA */

const hourlyData = [
    2.1,
    2.8,
    3.2,
    4.5,
    5.1,
    4.2,
    3.7
];

const energyChart = new Chart(ctx, {

    type: "line",

    data: {

        labels: [
            "7 AM",
            "9 AM",
            "11 AM",
            "1 PM",
            "3 PM",
            "5 PM",
            "7 PM"
        ],

        datasets: [{

            label: "Campus Power Consumption (kW)",

            data: hourlyData,

            borderWidth: 3,

            tension: 0.4,

            fill: true

        }]
    },

    options: {

        responsive: true,

        plugins: {

            legend: {
                display: true
            }

        },

        scales: {

            y: {
                beginAtZero: true
            }

        }

    }

});
