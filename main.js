// Delivery Driver Shift Tracker - Completed functions with public test cases
const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    const toSeconds = (timeStr) => {
        const [time, period] = timeStr.split(" ");
        let [h, m, s] = time.split(":").map(Number);
        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;
        return h * 3600 + m * 60 + s;
    };

    let startSec = toSeconds(startTime);
    let endSec = toSeconds(endTime);

    if (endSec < startSec) endSec += 24 * 3600;

    const diffSec = endSec - startSec;
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;

    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    const toSeconds = (timeStr) => {
        const [time, period] = timeStr.split(" ");
        let [h, m, s] = time.split(":").map(Number);
        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;
        return h * 3600 + m * 60 + s;
    };

    let startSec = toSeconds(startTime);
    let endSec = toSeconds(endTime);

    // Handle overnight shift
    if (endSec < startSec) endSec += 24 * 3600;

    const dayStart = 8 * 3600;
    const dayEnd = 22 * 3600;

    let idle = 0;
    if (startSec < dayStart) idle += Math.min(endSec, dayStart) - startSec;
    if (endSec > dayEnd) idle += endSec - Math.max(startSec, dayEnd);

    if (idle < 0) idle = 0;
    const h = Math.floor(idle / 3600);
    const m = Math.floor((idle % 3600) / 60);
    const s = idle % 60;

    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const toSeconds = t => t.split(":").map(Number).reduce((acc, val, i) => acc + val * [3600, 60, 1][i], 0);
    const secondsToHMS = sec => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    };
    const activeSec = toSeconds(shiftDuration) - toSeconds(idleTime);
    return secondsToHMS(Math.max(0, activeSec));
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const toSeconds = t => t.split(":").map(Number).reduce((acc, val, i) => acc + val * [3600, 60, 1][i], 0);
    const sec = toSeconds(activeTime);
    const normalQuota = 8 * 3600 + 24 * 60; // 8h24m
    const eidQuota = 6 * 3600; // 6h
    const d = new Date(date);
    const eidStart = new Date("2025-04-10");
    const eidEnd = new Date("2025-04-30");
    return (d >= eidStart && d <= eidEnd) ? sec >= eidQuota : sec >= normalQuota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: path to shifts text file
// shiftObj: object with driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let data = fs.existsSync(textFile) ? fs.readFileSync(textFile, "utf8").trim() : "";
    let lines = data === "" ? [] : data.split("\n");

    // check duplicate
    if (!lines.some(line => {
        const parts = line.split(",");
        return parts[0] === shiftObj.driverID && parts[2] === shiftObj.date;
    })) {
        const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
        const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
        const activeTime = getActiveTime(shiftDuration, idleTime);
        const quotaMet = metQuota(shiftObj.date, activeTime);
        const hasBonus = false;
        const line = [
            shiftObj.driverID,
            shiftObj.driverName,
            shiftObj.date,
            shiftObj.startTime,
            shiftObj.endTime,
            shiftDuration,
            idleTime,
            activeTime,
            quotaMet,
            hasBonus
        ].join(",");
        lines.push(line);
        lines.sort((a,b) => {
            const pa = a.split(","), pb = b.split(",");
            if (pa[0] !== pb[0]) return pa[0].localeCompare(pb[0]);
            return pa[2].localeCompare(pb[2]);
        });
        fs.writeFileSync(textFile, lines.join("\n"));
        return { driverID: shiftObj.driverID, driverName: shiftObj.driverName, date: shiftObj.date, startTime: shiftObj.startTime, endTime: shiftObj.endTime, shiftDuration, idleTime, activeTime, metQuota: quotaMet, hasBonus };
    }
    return {}; // duplicate
}


// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: path to shifts text file
// driverID: string
// date: string formatted as yyyy-mm-dd
// newValue: boolean
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    if (!fs.existsSync(textFile)) return;

    let lines = fs.readFileSync(textFile, "utf8").trim().split("\n");

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");
        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue ? "true" : "false"; // store string, not boolean
            lines[i] = parts.join(",");
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: path to shifts text file
// driverID: string
// month: string formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

if (!fs.existsSync(textFile)) return -1;

const lines = fs.readFileSync(textFile,"utf8").trim().split("\n");

month = parseInt(month);

let found = false;
let count = 0;

for (let line of lines) {

    const parts = line.split(",");

    if (parts[0] === driverID) {

        found = true;

        const m = parseInt(parts[2].split("-")[1]);

        const bonusValue = parts[9].trim();

        if (m === month && bonusValue === "true") {
            count++;
        }

    }

}

return found ? count : -1;


}


// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: path to shifts text file
// driverID: string
// month: number
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month){
    if(!fs.existsSync(textFile)) return "0:00:00";

    const toSec = t=> t.split(":").map(Number).reduce((acc,val,i)=>acc+val*[3600,60,1][i],0);
    const secToHMS = sec => `${Math.floor(sec/3600)}:${String(Math.floor((sec%3600)/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;

    month = parseInt(month,10);
    const lines = fs.readFileSync(textFile,"utf8").trim().split("\n");
    let totalSec = 0;

    for(let line of lines){
        let parts = line.split(",");
        if(parts[0]===driverID && parseInt(parts[2].split("-")[1])===month){
            totalSec += toSec(parts[7]);
        }
    }

    return secToHMS(totalSec);
}
// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: path to shifts text file
// rateFile: path to driver rates file (not used for calculation here)
// bonusCount: number of bonuses to subtract
// driverID: string
// month: number
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

if (!fs.existsSync(textFile) || !fs.existsSync(rateFile)) return "0:00:00";
const shifts = fs.readFileSync(textFile, "utf8").trim().split("\n");
const rates = fs.readFileSync(rateFile, "utf8").trim().split("\n");
month = parseInt(month);
let dayOff = "";

for (let r of rates) {
    let p = r.split(",");
    if (p[0] === driverID) {
        dayOff = p[1].trim();
    }
}
let totalSeconds = 0;

for (let line of shifts) {

    let parts = line.split(",");

    if (parts[0] !== driverID) continue;

    let date = parts[2];
    let metQuota = parts[8].trim() === "true";

    let m = parseInt(date.split("-")[1]);
    if (m !== month) continue;

    let d = new Date(date);
    let weekday = d.toLocaleDateString("en-US",{weekday:"long"});

    if (weekday === dayOff) continue;

    if (!metQuota) continue;

    let day = parseInt(date.split("-")[2]);

    if (month === 4 && day >= 10 && day <= 30) {
        totalSeconds += 6 * 3600;
    } else {
        totalSeconds += (8*3600 + 24*60);
    }

}
totalSeconds -= bonusCount * 2 * 3600;

if (totalSeconds < 0) totalSeconds = 0;
let h = Math.floor(totalSeconds / 3600);
let m = Math.floor((totalSeconds % 3600) / 60);
let s = totalSeconds % 60;

return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

}




// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: string
// actualHours: string formatted as hhh:mm:ss
// requiredHours: string formatted as hhh:mm:ss
// rateFile: path to driver rates file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

if (!fs.existsSync(rateFile)) return 0;
const rates = fs.readFileSync(rateFile,"utf8").trim().split("\n");
let basePay = 0;
let tier = 0;

for (let r of rates) {
    let p = r.split(",");
    if (p[0] === driverID) {
        basePay = parseInt(p[2]);
        tier = parseInt(p[3]);
    }
}

function toSeconds(t){
    let p = t.split(":").map(Number);
    return p[0]*3600 + p[1]*60 + p[2];
}
let actual = toSeconds(actualHours);
let required = toSeconds(requiredHours);
if (actual >= required) return basePay;
let missingHours = (required - actual) / 3600;
let allowed = 0;
if (tier === 1) allowed = 50;
if (tier === 2) allowed = 20;
if (tier === 3) allowed = 10;
if (tier === 4) allowed = 3;
let billable = Math.floor(missingHours - allowed);
if (billable < 0) billable = 0;
let deductionRate = Math.floor(basePay / 185);
let deduction = billable * deductionRate;
return basePay - deduction;
}


module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
