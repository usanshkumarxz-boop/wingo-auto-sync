const axios = require("axios");
const admin = require("firebase-admin");

// GitHub Secrets se Firebase key uthayega
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://start-7868c-default-rtdb.firebaseio.com"
});

const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

async function syncData() {
  try {
    console.log("⏰ Fetching data from API...");
    const response = await axios.get(API_URL + "?ts=" + Date.now());
    const list = response.data.list || (response.data.data && response.data.data.list);

    if (!list || list.length === 0) {
      console.log("⚠️ No data received");
      return;
    }

    const db = admin.database();
    const historyRef = db.ref("wingo_db/history");
    
    const snapshot = await historyRef.once("value");
    const existingData = snapshot.val() || {};
    const updates = {};
    let newCount = 0;

    for (const item of list) {
      const period = item.issueNumber || item.period || item.drawNo;
      const number = parseInt(item.number ?? item.winNumber ?? item.result);

      if (!period || isNaN(number) || number < 0 || number > 9) continue;

      if (!existingData[period]) {
        updates[period] = {
          period: period,
          number: number,
          bigSmall: number >= 5 ? "B" : "S",
          color: item.color || "green",
          ts: Date.now()
        };
        newCount++;
      }
    }

    if (newCount > 0) {
      await historyRef.update(updates);
      console.log(`✅ Success: Added ${newCount} new records to Firebase`);
    } else {
      console.log("ℹ️ No new records found");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

syncData();
