// ================= Firebase Init =================
const firebaseConfig = {
    apiKey: "AIzaSyDj4aYtdPAI3-uWGKUUcScYaTn66vhuTHt4",
    authDomain: "tissueboxdb.firebaseapp.com",
    projectId: "tissueboxdb",
    storageBucket: "tissueboxdb.appspot.com",
    messagingSenderId: "578294379663",
    appId: "1:578294379663:web:592d86722575dcc1676cfa"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ทดสอบการเชื่อมต่อ Firebase
db.collection("test").add({ test: "connection", savedAt: new Date() })
  .then(() => console.log("✅ เชื่อมต่อ Firebase สำเร็จแล้ว!"))
  .catch(err => console.error("❌ การเชื่อมต่อ Firebase ล้มเหลว:", err));

// ================= Global Variables =================
let map, clickMarker, selectedLatLng, previewMarker;
let currentPage = 1, entriesPerPage = 10, totalPages = 1, allOrganizations = [];
let editDocId, deleteDocId;

// ================= Map Initialization =================
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 13.736717, lng: 100.523186 },
        zoom: 14,
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => centerMap(position.coords),
            () => console.warn("📍 ไม่สามารถเข้าถึงตำแหน่งผู้ใช้")
        );
    }
    
    map.addListener("click", event => {
        selectedLatLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        updateMapMarker(selectedLatLng);
        document.getElementById("selected-coord").innerText = `✅ พิกัดที่เลือก: ${selectedLatLng.lat.toFixed(6)}, ${selectedLatLng.lng.toFixed(6)}`;
        document.getElementById("openModalBtn").disabled = false;
    });
    
    renderOrganizations();
}

function centerMap(coords) {
    const userLatLng = { lat: coords.latitude, lng: coords.longitude };
    map.setCenter(userLatLng);
    map.setZoom(16);
    updateMapMarker(userLatLng);
    selectedLatLng = userLatLng;
}

function updateMapMarker(position) {
    if (clickMarker) clickMarker.setMap(null);
    if (previewMarker) previewMarker.setMap(null);
    clickMarker = new google.maps.Marker({ position, map, label: "📌" });
}

// ================= Modal Functions =================
const setupModal = (modal, openBtn, closeBtn, confirmBtn, confirmAction) => {
    openBtn?.addEventListener("click", () => modal.classList.remove("hidden"));
    closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
    confirmBtn?.addEventListener("click", confirmAction);
};

setupModal(
    document.getElementById("modal"),
    document.getElementById("openModalBtn"),
    document.getElementById("cancelBtn"),
    document.getElementById("saveBtn"),
    async () => {
        const name = document.getElementById("hospitalName").value.trim();
        if (!name || !selectedLatLng) return alert("กรุณากรอกชื่อและเลือกพิกัดจากแผนที่ก่อน");
        
        try {
            await db.collection("organizations").add({
                name,
                lat: selectedLatLng.lat,
                lng: selectedLatLng.lng,
                createdAt: new Date()
            });
            resetModal();
            renderOrganizations();
        } catch (err) {
            alert("❌ ไม่สามารถบันทึกได้ กรุณาลองใหม่");
        }
    }
);

setupModal(
    document.getElementById("editModal"),
    null,
    document.getElementById("editCancelBtn"),
    document.getElementById("editConfirmBtn"),
    async () => {
        const newName = document.getElementById("editHospitalName").value.trim();
        if (!newName || !editDocId) return;
        
        try {
            await db.collection("organizations").doc(editDocId).update({ name: newName });
            document.getElementById("editModal").classList.add("hidden");
            renderOrganizations();
        } catch (error) {
            alert("❌ ไม่สามารถอัปเดตได้");
        }
    }
);

setupModal(
    document.getElementById("deleteModal"),
    null,
    document.getElementById("deleteCancelBtn"),
    document.getElementById("deleteConfirmBtn"),
    async () => {
        if (!deleteDocId) return;
        
        try {
            await db.collection("organizations").doc(deleteDocId).delete();
            document.getElementById("deleteModal").classList.add("hidden");
            renderOrganizations();
        } catch (error) {
            alert("❌ ลบไม่สำเร็จ");
        }
    }
);

function resetModal() {
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("hospitalName").value = "";
    document.getElementById("openModalBtn").disabled = true;
    document.getElementById("selected-coord").innerText = "📌 กรุณาคลิกที่แผนที่เพื่อเลือกพิกัด";
    if (clickMarker) clickMarker.setMap(null);
    selectedLatLng = null;
}

// ================= Organization Management =================
async function renderOrganizations() {
    const tableBody = document.getElementById("orgTableBody");
    tableBody.innerHTML = "<tr><td colspan='5'>⏳ กำลังโหลดข้อมูล...</td></tr>";
    
    try {
        const snapshot = await db.collection("organizations").orderBy("createdAt", "desc").get();
        allOrganizations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (!allOrganizations.length) {
            tableBody.innerHTML = "<tr><td colspan='5'>❌ ไม่พบข้อมูลหน่วยงาน</td></tr>";
            return;
        }
        
        updatePagination();
        renderTable();
    } catch (error) {
        console.error("Error loading organizations:", error);
        tableBody.innerHTML = "<tr><td colspan='5'>❌ โหลดตารางล้มเหลว</td></tr>";
    }
}

function renderTable(data = allOrganizations) {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, data.length);
    const pageData = data.slice(startIndex, endIndex);
    
    document.getElementById("orgTableBody").innerHTML = pageData.length ? 
        pageData.map((org, i) => `
            <tr>
                <td>${startIndex + i + 1}</td>
                <td><a href="#" class="focus-location" data-lat="${org.lat}" data-lng="${org.lng}">${org.name}</a></td>
                <td>${org.lat.toFixed(6)}, ${org.lng.toFixed(6)}</td>
                <td>${org.createdAt.toDate().toLocaleString("th-TH")}</td>
                <td>
                    <button class="edit-btn" data-id="${org.id}" data-name="${org.name}">✏️ แก้ไข</button>
                    <button class="delete-btn" data-id="${org.id}">🗑️ ลบ</button>
                </td>
            </tr>`
        ).join("") : "<tr><td colspan='5'>❌ ไม่พบผลลัพธ์ที่ตรงกัน</td></tr>";
    
    attachEventListeners();
}

function updatePagination(data = allOrganizations) {
    totalPages = Math.ceil(data.length / entriesPerPage);
    document.getElementById('pageInfo').textContent = `หน้า ${currentPage} จาก ${totalPages}`;
    
    ['firstPage', 'prevPage', 'nextPage', 'lastPage'].forEach((btn, i) => {
        document.getElementById(btn).disabled = 
            (i < 2 && currentPage === 1) || (i > 1 && currentPage === totalPages);
    });
}

// ================= Event Handlers =================
function attachEventListeners() {
    // Edit/Delete buttons
    document.querySelectorAll(".edit-btn").forEach(btn => btn.addEventListener("click", () => {
        editDocId = btn.dataset.id;
        document.getElementById("editHospitalName").value = btn.dataset.name;
        document.getElementById("editModal").classList.remove("hidden");
    }));
    
    document.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", () => {
        deleteDocId = btn.dataset.id;
        document.getElementById("deleteModal").classList.remove("hidden");
    }));
    
    // Map location links
    document.querySelectorAll(".focus-location").forEach(link => link.addEventListener("click", e => {
        e.preventDefault();
        const lat = parseFloat(link.dataset.lat), lng = parseFloat(link.dataset.lng);
        updateMapMarker({ lat, lng });
        map.setCenter({ lat, lng });
        map.setZoom(17);
    }));
}

// Pagination controls
['entriesPerPage', 'firstPage', 'prevPage', 'nextPage', 'lastPage'].forEach(id => {
    document.getElementById(id)?.addEventListener(id === 'entriesPerPage' ? 'change' : 'click', e => {
        if (id === 'entriesPerPage') {
            entriesPerPage = parseInt(e.target.value);
            currentPage = 1; // รีเซ็ตไปหน้าแรกเมื่อเปลี่ยนจำนวน
        } else if (id === 'firstPage') {
            currentPage = 1;
        } else if (id === 'lastPage') {
            currentPage = totalPages;
        } else if (id === 'prevPage') {
            currentPage = Math.max(1, currentPage - 1);
        } else if (id === 'nextPage') {
            currentPage = Math.min(totalPages, currentPage + 1);
        }
        renderTable(); // ควรเรียกแบบระบุ data ถ้าเป็นการค้นหา
        updatePagination(); // ต้องอัปเดต pagination ด้วย
    });
});


// Search functionality
let searchTimeout;
document.getElementById("searchInput").addEventListener("input", e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const term = e.target.value.toLowerCase();

    if (!term) {
        const scrollTop = window.scrollY;
        currentPage = 1;
        updatePagination(allOrganizations);
        renderTable(allOrganizations);
        window.scrollTo(0, scrollTop);
        return;
    }

    const filtered = allOrganizations.filter(org => 
        Object.values(org).some(val => 
            String(val).toLowerCase().includes(term) ||
            (val instanceof Date && val.toLocaleString("th-TH").toLowerCase().includes(term))
        )
    );

    const scrollTop = window.scrollY;
    currentPage = 1;
    updatePagination(filtered);
    renderTable(filtered);
    window.scrollTo(0, scrollTop);
  }, 150); // ⏱ รอ 150ms ก่อนค้น
});

