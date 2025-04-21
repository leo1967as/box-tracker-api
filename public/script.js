// ===================== INITIALIZE GLOBAL VARIABLES =====================
// ตัวแปรหลักที่ใช้ทั่วทั้งแอปพลิเคชัน
let map; // เก็บ object แผนที่ Google Maps
let userLocation = null; // เก็บตำแหน่งปัจจุบันของผู้ใช้
let userMarker = null; // เก็บ marker ตำแหน่งผู้ใช้บนแผนที่
let clickMarker = null; // เก็บ marker จุดที่คลิกบนแผนที่
let routeLine = null; // เก็บเส้นทางระหว่างจุด
let routeSelected = null; // เก็บข้อมูลเส้นทางที่เลือก
let liveTimerInterval = null; // เก็บ interval สำหรับนับเวลา
let currentDeliveryId = null; // เก็บ ID การส่งปัจจุบันใน Firebase
let startTime = null; // เก็บเวลาเริ่มต้นการส่ง
let itemName = ''; // เก็บชื่อสิ่งของ
let receiverName = ''; // เก็บชื่อผู้รับ
let trackingInterval = null;
let currentBox = null;

// ตัวแปรที่เก็บใน localStorage
let startPointOptions = JSON.parse(localStorage.getItem("startPoints")) || []; // จุดเริ่มต้นทั้งหมด
let endPointOptions = JSON.parse(localStorage.getItem("endPoints")) || []; // จุดปลายทางทั้งหมด
let savedRoutes = JSON.parse(localStorage.getItem("savedRoutes")) || []; // เส้นทางที่บันทึกไว้

// ===================== FIREBASE CONFIGURATION =====================
// ตั้งค่าการเชื่อมต่อ Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDj4aYtdPAI3-uWGKUUcScYaTn66vhuTHt4",
  authDomain: "tissueboxdb.firebaseapp.com",
  projectId: "tissueboxdb",
  storageBucket: "tissueboxdb.appspot.com",
  messagingSenderId: "578294379663",
  appId: "1:578294379663:web:592d86722575dcc1676cfa",
  measurementId: "G-CE000PRNNC"
};

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // เก็บ reference ถึง Firestore database

// ทดสอบการเชื่อมต่อ Firebase
db.collection("test").add({ test: "connection", savedAt: new Date() })
  .then(() => console.log("✅ เชื่อมต่อ Firebase สำเร็จแล้ว!"))
  .catch(err => console.error("❌ การเชื่อมต่อ Firebase ล้มเหลว:", err));


// ===================== GOOGLE MAPS FUNCTIONS =====================
/**
 * ฟังก์ชันเริ่มต้นแผนที่ Google Maps
 * - สร้างแผนที่ด้วยจุดศูนย์กลางเริ่มต้นที่กรุงเทพ
 * - ดึงตำแหน่งปัจจุบันของผู้ใช้ (ถ้าได้รับอนุญาต)
 * - ตั้งค่าการคลิกบนแผนที่เพื่อเพิ่มจุดหมาย
 */

const hospitalStartPoint = {
  name: "โรงพยาบาลหลัก",
  lat: 17.3473,   // 🔁 เปลี่ยนตรงนี้ถ้าย้ายโรงพยาบาล
  lng: 103.7685,
};

function initMap() {
  // ตั้งค่าจุดเริ่มต้นที่กรุงเทพ
  const defaultCenter = { lat: 13.736717, lng: 100.523186 };

  // สร้างแผนที่ใน element ที่มี id="map"
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 14,
  });

  new google.maps.Marker({
    map,
    position: { lat: hospitalStartPoint.lat, lng: hospitalStartPoint.lng },
    label: "🏥",
    title: hospitalStartPoint.name
  });
  populatePointList(); // ✅ เติม datalist ทันที
  // ขออนุญาตใช้งานตำแหน่งปัจจุบัน
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // ตั้งค่าตำแหน่งผู้ใช้
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // สร้าง marker ตำแหน่งผู้ใช้
        userMarker = new google.maps.Marker({
          position: userLocation,
          map: map,
          label: "📍",
          title: "ตำแหน่งของคุณ",
        });

        // ย้ายแผนที่ไปที่ตำแหน่งผู้ใช้
        map.setCenter(userLocation);
      },
      () => alert("⚠️ ไม่สามารถระบุตำแหน่งของคุณได้")
    );
  } else {
    alert("⚠️ เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง");
  }

  // การคลิกบนแผนที่เพื่อเพิ่มจุดหมาย
  map.addListener("click", (event) => {
    const clickedLatLng = event.latLng;
  
    // แสดงพิกัดในฟอร์ม
    document.getElementById("latInput").value = clickedLatLng.lat().toFixed(6);
    document.getElementById("lngInput").value = clickedLatLng.lng().toFixed(6);
  
    // ลบ marker เก่าถ้ามี
    if (clickMarker) clickMarker.setMap(null);
  
    // สร้าง marker ใหม่ที่จุดที่คลิก
    clickMarker = new google.maps.Marker({
      position: clickedLatLng,
      map: map,
      label: "🎯",
      title: "จุดที่เลือก",
    });
  
    // ลบเส้นทางเก่าถ้ามี
    if (routeLine) routeLine.setMap(null);
  
    // วาดเส้นจากโรงพยาบาลหลัก → จุดที่คลิก
    routeLine = new google.maps.Polyline({
      path: [
        { lat: hospitalStartPoint.lat, lng: hospitalStartPoint.lng },
        clickedLatLng
      ],
      geodesic: true,
      strokeColor: "#2196f3",
      strokeOpacity: 1.0,
      strokeWeight: 4,
    });
    routeLine.setMap(map);
  
    // แสดงข้อความยืนยัน
    document.getElementById("distance-output").innerText =
      `📍 เส้นทางจาก ${hospitalStartPoint.name} ไปยังจุดที่คลิก`;
  });
  

  map.addListener("dblclick", async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const name = prompt("📝 ตั้งชื่อจุดใหม่ (ใช้ใน dropdown):");
    if (!name) return;
  
    try {
      await db.collection("locations").add({
        name,
        lat,
        lng,
        createdAt: new Date()
      });
  
      // เพิ่มลง knownPoints แล้วรีโหลด dropdown
      knownPoints.push({ name, lat, lng });
      populatePointList();
      populateSelectOptions();
  
      // เพิ่ม marker บนแผนที่
      new google.maps.Marker({
        position: { lat, lng },
        map,
        label: "🆕",
        title: name,
      });
  
      alert("✅ เพิ่มจุดใหม่สำเร็จแล้ว!");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึกจุด:", error);
      alert("❌ ไม่สามารถเพิ่มจุดใหม่ได้ ลองใหม่อีกครั้ง");
    }
  });
}

// ===================== ADD DATALSIT ====================

let knownPoints = [];

async function loadKnownPointsFromFirebase() {
  try {
    const snapshot = await db.collection("locations").orderBy("name").get();
    knownPoints = snapshot.docs.map(doc => doc.data());

    populatePointList();
    populateSelectOptions();
  } catch (error) {
    console.error("❌ โหลดจุดจาก Firebase ไม่สำเร็จ:", error);
  }
}





function populatePointList() {
  const list = document.getElementById("pointList");
  list.innerHTML = "";
  knownPoints.forEach(p => {
    const option = document.createElement("option");
    option.value = p.name;
    list.appendChild(option);
  });
}

let startMarker = null;
let endMarker = null;

["startPointSelect", "endPointSelect"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    const type = id.includes("start") ? "start" : "end";
    const point = knownPoints.find(p => p.name === e.target.value);

    if (type === "start" && startMarker) startMarker.setMap(null);
    if (type === "end" && endMarker) endMarker.setMap(null);

    if (!point) return;

    const latLng = { lat: point.lat, lng: point.lng };

    const marker = new google.maps.Marker({
      map,
      position: latLng,
      label: type === "start" ? "Start" : "Goal",
      title: type === "start" ? "จุดเริ่มต้น" : "จุดปลายทาง"
    });

    if (type === "start") startMarker = marker;
    else endMarker = marker;

    map.setCenter(latLng);
    map.setZoom(15);
  });
});

// ===================== ROUTE MANAGEMENT =====================
/**
 * เติมข้อมูลจุดเริ่มต้นและปลายทางใน dropdown ทั้งหมด
 */
function populateSelectOptions() {
  const elements = {
    startSelect: document.getElementById("startPointSelect"),
    endSelect: document.getElementById("endPointSelect"),
    trackerStart: document.getElementById("trackerStartSelect"),
    trackerEnd: document.getElementById("trackerEndSelect")
  };
  const pointNames = knownPoints.map(p => p.name);
  // ฟังก์ชันสำหรับเติม options
  const fillOptions = (selectElem, data) => {
    selectElem.innerHTML = ""; // ล้าง options เดิม
    data.forEach(pt => {
      const opt = document.createElement("option");
      opt.value = opt.text = pt;
      selectElem.appendChild(opt);
    });
  };

  // เติม options ในแต่ละ select element
  fillOptions(elements.startSelect, startPointOptions);
  fillOptions(elements.endSelect, endPointOptions);
  fillOptions(elements.trackerStart, startPointOptions);
  fillOptions(elements.trackerEnd, endPointOptions);
}


function saveRouteData() {
  const start = document.getElementById("startPointSelect").value;
  const end = document.getElementById("endPointSelect").value;
  const duration = Number(document.getElementById("customDuration").value);

  if (!start || !end || !duration) {
    alert("กรุณาเลือกจุดเริ่ม จุดสิ้นสุด และกรอกเวลาที่ใช้");
    return;
  }

  // ตรวจสอบว่ามีเส้นทางนี้อยู่แล้วหรือไม่
  const existingIndex = savedRoutes.findIndex(
    (route) => route.start === start && route.end === end
  );

  if (existingIndex !== -1) {
    const existingRoute = savedRoutes[existingIndex];
    if (duration >= existingRoute.duration) {
      alert(`❌ มีเส้นทางเดียวกันที่ใช้เวลาน้อยกว่าหรือเท่ากันแล้ว (${existingRoute.duration} นาที)`);
      return;
    }
    savedRoutes.splice(existingIndex, 1);
  }

  // บันทึกเส้นทางใหม่
  const newRoute = {
    start,
    end,
    duration,
    savedAt: new Date().toLocaleString(),
  };

  savedRoutes.push(newRoute);
  localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));
  displaySavedRoutes();
  alert("✅ บันทึกเส้นทางสำเร็จ!");
}

function displaySavedRoutes() {
  const output = document.getElementById("savedRoutesOutput");
  if (!output) return;

  output.innerHTML = `<h3>📒 รายการเส้นทางที่บันทึกไว้</h3>`;

  savedRoutes.forEach((route, index) => {
    output.innerHTML += `
      <div style="margin-bottom: 0.8em;">
        🧭 <b>${route.start}</b> → <b>${route.end}</b> ⏱️ ${route.duration} นาที<br/>
        🗓️ บันทึกเมื่อ: ${route.savedAt}<br/>
        <button onclick="editRoute(${index})">✏️ แก้ไข</button>
        <button onclick="deleteRoute(${index})">🗑️ ลบ</button>
      </div>
    `;
  });
}

function deleteRoute(index) {
  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเส้นทางนี้?")) {
    savedRoutes.splice(index, 1);
    localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));
    displaySavedRoutes();
  }
}

function editRoute(index) {
  const route = savedRoutes[index];
  const newDuration = prompt(`กรอกเวลาที่ใช้ใหม่สำหรับ ${route.start} → ${route.end} (นาที):`, route.duration);

  if (newDuration === null) return;
  const durationNumber = Number(newDuration);

  if (isNaN(durationNumber) || durationNumber <= 0) {
    alert("⛔ กรุณากรอกตัวเลขที่ถูกต้อง!");
    return;
  }

  savedRoutes[index].duration = durationNumber;
  savedRoutes[index].savedAt = new Date().toLocaleString();
  localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));
  displaySavedRoutes();
}

// ===================== DELIVERY TRACKING =====================
/**
 * คำนวณเวลามาตรฐานจากจุดเริ่มต้นถึงปลายทาง
 * @param {string} start - จุดเริ่มต้น
 * @param {string} end - จุดปลายทาง
 * @returns {number|null} เวลามาตรฐาน (นาที) หรือ null ถ้าไม่พบ
 */
function getStandardDuration(start, end) {
  const matched = savedRoutes.find(route => 
    route.start === start && route.end === end
  );
  return matched ? matched.duration : null;
}

function updateStandardDurationLabel() {
  const start = document.getElementById("trackerStartSelect").value;
  const end = document.getElementById("trackerEndSelect").value;
  const duration = getStandardDuration(start, end);

  const label = document.getElementById("standardDurationOutput");
  label.innerText = duration != null 
    ? `⌛ เวลาที่ใช้โดยอ้างอิง: ${duration} นาที`
    : `⚠️ ยังไม่มีเวลามาตรฐานสำหรับเส้นทางนี้`;
}

function updateLiveTimer() {
  if (!startTime) return;

  const now = new Date();
  const durationMs = now - startTime;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  const liveTimerSpan = document.getElementById("liveTimer");
  if (liveTimerSpan) {
    liveTimerSpan.innerText = `🕒 เวลาผ่านไป: ${durationMin} นาที ${durationSec} วินาที`;
  }
}

// ================== Firebase Delivery Logging ==================
async function logStartDelivery() {
  try {
    const docRef = await db.collection("deliveries").add({
      itemName: itemName,
      receiverName: receiverName,
      start: routeSelected.start,
      end: routeSelected.end,
      standardDuration: routeSelected.standardDuration,
      startTime: new Date(),
      status: "ส่งแล้ว",
      createdAt: new Date()
    });
    console.log("บันทึกการเริ่มส่งเรียบร้อย ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
    return null;
  }
}

async function logDeliveryCompletion(deliveryId) {
  if (!deliveryId) return;

  const stopTime = new Date();
  const durationMs = stopTime - startTime;
  const durationMin = Math.floor(durationMs / 60000);
  
  let performance = "";
  const standard = routeSelected.standardDuration;

  if (standard != null) {
    const diff = durationMin - standard;
    performance = diff < 0 ? `มาถึงก่อนเวลา ${Math.abs(diff)} นาที` :
                diff > 0 ? `มาช้าไป ${diff} นาที` : "มาตรงเวลาเป๊ะเลย";
  } else {
    performance = "ไม่มีเวลามาตรฐานสำหรับเส้นทางนี้";
  }

  try {
    await db.collection("deliveries").doc(deliveryId).update({
      stopTime: stopTime,
      actualDuration: durationMin,
      performance: performance,
      status: "ถึงแล้ว",
      updatedAt: new Date()
    });
    console.log("อัปเดตสถานะการส่งเรียบร้อย");
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดต:", error);
  }
}

async function handleSendBox() {
  itemName = document.getElementById("itemName").value.trim();
  receiverName = document.getElementById("receiverName").value.trim();
  const selectedStart = document.getElementById("trackerStartSelect").value;
  const selectedEnd = document.getElementById("trackerEndSelect").value;

  if (!itemName || !receiverName || !selectedStart || !selectedEnd) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่งกล่องค่ะ!");
    return;
  }

  routeSelected = {
    start: selectedStart,
    end: selectedEnd,
    standardDuration: getStandardDuration(selectedStart, selectedEnd)
  };

  startTime = new Date();
  
  // บันทึกใน localStorage สำหรับกรณีรีเฟรชหน้า
  localStorage.setItem("currentDelivery", JSON.stringify({
    itemName,
    receiverName,
    start: selectedStart,
    end: selectedEnd,
    startTime: startTime.toISOString(),
    standardDuration: routeSelected.standardDuration
  }));

  // บันทึกข้อมูลการส่งลง Firebase
  currentDeliveryId = await logStartDelivery();

  document.getElementById("logArea").innerHTML =
    `📦 กล่อง "${itemName}" จาก "${routeSelected.start}" ไปยัง "${routeSelected.end}" ` +
    `ถูกส่งไปยัง "${receiverName}" เวลา: ${startTime.toLocaleTimeString()}<br/>
    <span id="liveTimer">🕒 เวลาผ่านไป: 0 นาที 0 วินาที</span>`;

  document.getElementById("startBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;

  liveTimerInterval = setInterval(updateLiveTimer, 1000);
}

async function handleReceiveBox() {
  if (!startTime || !routeSelected) return;

  clearInterval(liveTimerInterval);
  liveTimerInterval = null;

  // อัปเดตข้อมูลใน Firebase
  await logDeliveryCompletion(currentDeliveryId);

  const stopTime = new Date();
  const durationMs = stopTime - startTime;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  let performance = "";
  const standard = routeSelected.standardDuration;

  if (standard != null) {
    const diff = durationMin - standard;
    performance = diff < 0 ? `🟢 มาถึงก่อนเวลา ${Math.abs(diff)} นาที` :
                diff > 0 ? `🔴 มาช้าไป ${diff} นาที` : "✅ มาตรงเวลาเป๊ะเลย!";
  } else {
    performance = "⚠️ ไม่มีเวลามาตรฐานสำหรับเส้นทางนี้";
  }

  document.getElementById("logArea").innerText +=
    `\n📬 ถึงเวลา: ${stopTime.toLocaleTimeString()}
🕒 ใช้จริง: ${durationMin} นาที ${durationSec} วินาที
📊 ผลลัพธ์: ${performance}`;

  document.getElementById("stopBtn").disabled = true;
  localStorage.removeItem("currentDelivery");

  const liveTimerSpan = document.getElementById("liveTimer");
  if (liveTimerSpan) liveTimerSpan.remove();
}

// ================== Firebase Route Management ==================
async function saveAllRoutesToFirestore() {
  if (savedRoutes.length === 0) {
    alert("❌ ยังไม่มีเส้นทางที่จะบันทึก");
    return;
  }

  try {
    for (const route of savedRoutes) {
      await db.collection("routes").add({
        start: route.start,
        end: route.end,
        duration: route.duration,
        savedAt: new Date()
      });
    }
    document.getElementById("firebaseSaveStatus").innerText = "✅ บันทึกเรียบร้อยแล้วทั้งหมด!";
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
    document.getElementById("firebaseSaveStatus").innerText = "❌ บันทกล้มเหลว กรุณาลองใหม่อีกครั้ง";
  }
}

async function loadRoutesFromFirebase() {
  const outputDiv = document.getElementById("routesList");
  outputDiv.innerHTML = "📡 กำลังโหลดข้อมูล...";

  try {
    const snapshot = await db.collection("routes").orderBy("savedAt", "desc").get();

    if (snapshot.empty) {
      outputDiv.innerHTML = "❌ ยังไม่มีเส้นทางในฐานข้อมูล Firebase";
      return;
    }

    outputDiv.innerHTML = "";
    snapshot.forEach((doc) => {
      const route = doc.data();
      outputDiv.innerHTML += `
        <div style="margin-bottom: 1em; border-bottom: 1px dashed #ccc; padding-bottom: 0.5em;">
          🧭 <b>${route.start}</b> → <b>${route.end}</b><br/>
          ⏱️ เวลา: ${route.duration} นาที<br/>
          🗓️ บันทึกเมื่อ: ${new Date(route.savedAt).toLocaleString()}
        </div>
      `;
    });
  } catch (error) {
    outputDiv.innerHTML = "❌ เกิดข้อผิดพลาด: " + error.message;
    console.error("โหลดเส้นทางล้มเหลว:", error);
  }
}


// API
const API_BASE_URL = "https://box-tracker-api-4.vercel.app";
let markers = [];
let polyline = null;

async function loadPath(boxNumberInput = null) {
  console.log("Calling API with URL:", `${API_BASE_URL}/api/get-path?boxNumber=${boxNumber}`);
  const boxNumber = boxNumberInput || document.getElementById("boxNumber").value.trim();
  if (!boxNumber) {
    console.warn("Box number ไม่ถูกต้อง");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/get-path?boxNumber=${boxNumber}`);
    
    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.path || data.path.length === 0) {
      console.log("ไม่มี path สำหรับกล่องนี้");
      return;
    }

    // ล้างเส้นทางเดิม
    markers.forEach((m) => m.setMap(null));
    markers = [];
    if (polyline) polyline.setMap(null);

    const pathCoords = data.path.map((p) => ({ lat: p.lat, lng: p.lng }));

    polyline = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: "#28a745",
      strokeOpacity: 1.0,
      strokeWeight: 3,
    });
    polyline.setMap(map);

    pathCoords.forEach((pos, i) => {
      const marker = new google.maps.Marker({
        position: pos,
        label: `${i + 1}`,
        map: map,
      });
      markers.push(marker);
    });

    map.panTo(pathCoords[pathCoords.length - 1]); // เลื่อนไปจุดล่าสุด
  } catch (error) {
    console.error("Error loading path:", error);
    alert("เกิดข้อผิดพลาดในการโหลดเส้นทาง: " + error.message);
  }
}

function startAutoTracking() {
  const boxNumberInput = document.getElementById("boxNumber").value.trim();
  if (!boxNumberInput) return alert("กรุณาระบุ boxNumber");
  
  // Clear any existing interval
  if (trackingInterval) {
    clearInterval(trackingInterval);
  }
  
  loadPath(boxNumberInput);
  trackingInterval = setInterval(() => loadPath(boxNumberInput), 2000);
}

function stopAutoTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  
  // Clear the map
  markers.forEach(m => m.setMap(null));
  markers = [];
  if (polyline) polyline.setMap(null);
}
// ================== Initialize App ==================
document.addEventListener("DOMContentLoaded", () => {
  
  loadKnownPointsFromFirebase(); // ⬅ โหลดจาก Firestore  
  populateSelectOptions();
  displaySavedRoutes();
  // โหลดข้อมูลการส่งที่ยังไม่เสร็จสิ้น (กรณีรีเฟรชหน้า)
  const saved = localStorage.getItem("currentDelivery");
  if (saved) {
    const data = JSON.parse(saved);
    itemName = data.itemName;
    receiverName = data.receiverName;
    routeSelected = {
      start: data.start,
      end: data.end,
      standardDuration: data.standardDuration
    };
    startTime = new Date(data.startTime);

    document.getElementById("logArea").innerHTML = 
      `📦 กล่อง "${itemName}" จาก "${routeSelected.start}" ไปยัง "${routeSelected.end}" ` +
      `ถูกส่งไปยัง "${receiverName}" เวลา: ${startTime.toLocaleTimeString()}<br/>
      <span id="liveTimer">🕒 เวลาผ่านไป: ...</span>`;

    document.getElementById("startBtn").disabled = true;
    document.getElementById("stopBtn").disabled = false;

    liveTimerInterval = setInterval(updateLiveTimer, 1000);
  }

  // Event Listeners
  document.getElementById("startBtn").addEventListener("click", handleSendBox);
  document.getElementById("stopBtn").addEventListener("click", handleReceiveBox);
  document.getElementById("saveRouteDataBtn").addEventListener("click", saveRouteData);
  document.getElementById("trackerStartSelect").addEventListener("change", updateStandardDurationLabel);
  document.getElementById("trackerEndSelect").addEventListener("change", updateStandardDurationLabel);
  document.getElementById("saveToFirebaseBtn").addEventListener("click", saveAllRoutesToFirestore);
});

