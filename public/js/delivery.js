
// ========== Firebase Init ==========
const firebaseConfig = {
    apiKey: "AIzaSyDj4aYtdPAI3-uWGKUUcScYaTn66vhuTHt4",
    authDomain: "tissueboxdb.firebaseapp.com",
    projectId: "tissueboxdb",
    storageBucket: "tissueboxdb.appspot.com",
    messagingSenderId: "578294379663",
    appId: "1:578294379663:web:592d86722575dcc1676cfa"
  };
  
  // ตรวจสอบว่า Firebase ถูก initialize แล้วหรือยัง
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();
  // ทดสอบการเชื่อมต่อ Firebase
db.collection("test").add({ test: "connection", savedAt: new Date() })
.then(() => console.log("✅ เชื่อมต่อ Firebase สำเร็จแล้ว!"))
.catch(err => console.error("❌ การเชื่อมต่อ Firebase ล้มเหลว:", err));

  // ========== DOM Elements ==========
  const elements = {
    modal: document.getElementById("deliveryModal"),
    openModalBtn: document.getElementById("openModalBtn"),
    cancelBtn: document.getElementById("cancelDelivery"),
    form: document.getElementById("deliveryForm"),
    itemsContainer: document.getElementById("itemsContainer"),
    orgSelect: document.getElementById("organization"),
    statusMessage: document.getElementById("statusMessage"),
    deliveriesContainer: document.getElementById("deliveriesContainer"),
    addItemBtn: document.getElementById("addItemBtn")
  };
  
  // ========== Global Variables ==========
  let organizationsCache = [];
  let unsubscribeDeliveries = null;
  let locationsCache = []; // เพิ่ม cache สำหรับสถานที่ส่งจาก

const entriesSelect = document.getElementById("entriesPerPage");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const firstPageBtn = document.getElementById("firstPage");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const lastPageBtn = document.getElementById("lastPage");
const pageInfo = document.getElementById("pageInfo");
const tableBody = document.getElementById("deliveryTableBody");


  
  // ========== Event Listeners ==========
  function setupEventListeners() {
    elements.openModalBtn.addEventListener("click", openDeliveryModal);
    elements.cancelBtn.addEventListener("click", closeDeliveryModal);
    elements.form.addEventListener("submit", handleFormSubmit);
    elements.addItemBtn.addEventListener("click", addItemField);
    
    // ปิด modal เมื่อคลิกนอกพื้นที่
    elements.modal.addEventListener("click", (e) => {
      if (e.target === elements.modal) {
        closeDeliveryModal();
      }
    });
  }
  

// ========== Load Locations ==========
async function loadLocations() {
    try {
      // ใช้ข้อมูล organizationsCache ที่โหลดมาแล้ว
      locationsCache = organizationsCache;
      renderLocationOptions();
    } catch (error) {
      console.error("Error loading locations:", error);
      throw error;
    }
  }
  
  function renderLocationOptions() {
    const fromLocationSelect = document.getElementById("fromLocation");
    fromLocationSelect.innerHTML = '<option value="">เลือกสถานที่ส่งจาก</option>';
    
    // ใช้ organizationsCache แทน locationsCache
    organizationsCache.forEach(org => {
      const option = document.createElement("option");
      option.value = org.id;
      option.textContent = org.name;
      fromLocationSelect.appendChild(option);
    });
  }

  // ========== Data Loading ==========
  async function loadInitialData() {
    try {
      await loadOrganizations();
      loadLocations(); // โหลด locations จาก organizationsCache
      setupDeliveriesListener();
    } catch (error) {
      console.error("Error loading initial data:", error);
      showStatusMessage("❌ โหลดข้อมูลล้มเหลว", "error");
    }
  }
  
  async function loadOrganizations() {
    if (organizationsCache.length > 0) {
      renderOrganizationOptions();
      return organizationsCache; // เพิ่มบรรทัดนี้
    }
  
    try {
      const snapshot = await db.collection("organizations").orderBy("name").get();
      organizationsCache = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderOrganizationOptions();
      return organizationsCache; // เพิ่มบรรทัดนี้
    } catch (error) {
      console.error("Error loading organizations:", error);
      throw error;
    }
  }
  
  function renderOrganizationOptions() {
    elements.orgSelect.innerHTML = '<option value="">เลือกหน่วยงาน</option>';
    organizationsCache.forEach(org => {
      const option = document.createElement("option");
      option.value = org.id;
      option.textContent = org.name;
      elements.orgSelect.appendChild(option);
    });
  }

  function setupDeliveriesListener() {
    if (unsubscribeDeliveries) unsubscribeDeliveries();
  
    unsubscribeDeliveries = db.collection("deliveries")
      .orderBy("createdAt", "desc")
      .onSnapshot(async snapshot => {
        await loadOrganizations();
        allDeliveries = snapshot.docs;
        applyFilters(); // แทนการ render ทันที
      });
  }
  
  

  
  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // ========== Modal Functions ==========
  async function openDeliveryModal() {
    elements.modal.classList.remove("hidden");
    await loadOrganizations();
    elements.itemsContainer.innerHTML = "";
    addItemField();
    elements.form.reset();
    elements.statusMessage.textContent = "";
  }
  
  function closeDeliveryModal() {
    elements.modal.classList.add("hidden");
    elements.form.reset();
    elements.itemsContainer.innerHTML = "";
    elements.statusMessage.textContent = "";
    window._editDeliveryMode = false;
    window._editDeliveryId = null;
  }
  
  
  // ========== Item Management ==========
  function addItemField() {
    const itemId = Date.now();
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" placeholder="ชื่อสิ่งของ" class="item-name" required />
      <input type="number" placeholder="จำนวน" class="item-qty" min="1" value="1" required />
      <button type="button" class="btn-icon remove-btn" onclick="removeItemField(this)">
        <i class="fas fa-trash"></i>
      </button>
    `;
    elements.itemsContainer.appendChild(row);
  }
  
  function removeItemField(btn) {
    btn.closest('.item-row').remove();
  }
  
  // ========== Form Submission ==========
  async function handleFormSubmit(e) {
    e.preventDefault();
  
    const formData = getFormData();
    if (!validateForm(formData)) return;
  
    try {
      if (window._editDeliveryMode && window._editDeliveryId) {
        await db.collection("deliveries").doc(window._editDeliveryId).update(formData);
        showStatusMessage("✅ แก้ไขข้อมูลเรียบร้อยแล้ว", "success");
      } else {
        await db.collection("deliveries").add(formData);
        showStatusMessage("✅ บันทึกสำเร็จ!", "success");
      }
  
      setTimeout(() => {
        closeDeliveryModal();
      }, 1200);
  
    } catch (error) {
      console.error("❌ Error saving delivery:", error);
      showStatusMessage("❌ ไม่สามารถบันทึกได้", "error");
    }
  }
  
// ========== Update getFormData ==========
function getFormData() {
  const items = [];
  document.querySelectorAll(".item-row").forEach(row => {
    items.push({
      name: row.querySelector(".item-name").value.trim(),
      qty: parseInt(row.querySelector(".item-qty").value)
    });
  });

  return {
    sender: elements.form.sender.value.trim(),
    fromLocation: document.getElementById("fromLocation").value,
    note: elements.form.note.value.trim(),
    boxNumber: elements.form.boxNumber.value.trim(),
    organization: elements.orgSelect.value,
    items,
    createdAt: new Date()
  };
}
  
 // ========== Update validateForm ==========
function validateForm({ sender, fromLocation, boxNumber, organization, items }) {
    if (!sender || !fromLocation || !boxNumber || !organization) {
      showStatusMessage("❌ กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return false;
    }
  
    if (items.length === 0) {
      showStatusMessage("❌ กรุณาเพิ่มรายการสิ่งของ", "error");
      return false;
    }
  
    for (const item of items) {
      if (!item.name || !item.qty) {
        showStatusMessage("❌ กรุณากรอกชื่อและจำนวนสิ่งของให้ครบ", "error");
        return false;
      }
    }
  
    return true;
  }


  function formatDate(timestamp) {
    if (!timestamp) return '';
    
    // ถ้าเป็น Firebase Timestamp Object
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // ========== Render Functions ==========
  function renderDeliveries(docs) {
    const tableBody = document.getElementById("deliveryTableBody");
    tableBody.innerHTML = ""; // ล้างข้อมูลเก่า
  
    if (docs.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="9" style="text-align: center;">ไม่มีรายการขนส่ง</td></tr>
      `;
      return;
    }
  
    docs.forEach((doc, index) => {
      const data = doc.data();
      const orgName = organizationsCache.find(o => o.id === data.organization)?.name || "ไม่ระบุ";
      const locName = organizationsCache.find(o => o.id === data.fromLocation)?.name || "ไม่ระบุ";
      const itemsList = Array.isArray(data.items) ? data.items : [];
      const itemSummary = itemsList.length > 0
        ? itemsList.map(item => `${item.name} x${item.qty}`).join(', ')
        : "ไม่มีรายการ";
  
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${data.boxNumber || '-'}</td>
        <td>${data.sender || '-'}</td>
        <td>${locName}</td>
        <td>${orgName}</td>
        <td>${itemSummary}</td>
        <td>${data.note || '-'}</td>
        <td>${formatDate(data.createdAt)}</td>
        <td>
          <button class="btn-secondary" onclick="editDelivery('${doc.id}')"><i class="fas fa-edit"></i> แก้ไข</button>
          <button class="btn-danger" onclick="deleteDelivery('${doc.id}')"><i class="fas fa-trash"></i> ลบ</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }
  
  
  // ฟังก์ชันช่วยเหลือสำหรับดึงชื่อ organization
  async function getOrganizationName(orgId) {
    if (!orgId) return "ไม่ระบุ";
    const org = organizationsCache.find(o => o.id === orgId);
    if (org) return org.name;
    
    try {
      const doc = await db.collection("organizations").doc(orgId).get();
      return doc.exists ? doc.data().name : "ไม่ระบุ";
    } catch (error) {
      console.error("Error fetching organization:", error);
      return "ไม่ระบุ";
    }
  }
  
  // ฟังก์ชันช่วยเหลือสำหรับดึงชื่อ location
  async function getLocationName(locId) {
    if (!locId) return "ไม่ระบุ";
    const loc = locationsCache.find(l => l.id === locId);
    if (loc) return loc.name;
    
    try {
      const doc = await db.collection("organizations").doc(locId).get();
      return doc.exists ? doc.data().name : "ไม่ระบุ";
    } catch (error) {
      console.error("Error fetching location:", error);
      return "ไม่ระบุ";
    }
  }
  
  async function saveDelivery(data) {
    await db.collection("deliveries").add(data);
  }
  
  function showStatusMessage(message, type = "info") {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
  }
  
  // ทำให้ฟังก์ชันสามารถเรียกใช้จาก HTML ได้
  window.removeItemField = removeItemField;

  function editDelivery(id) {
    alert("🛠 อยู่ระหว่างพัฒนา: editDelivery ID = " + id);
  }
  
  async function deleteDelivery(id) {
    const confirmDelete = confirm("❗ คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?");
    if (!confirmDelete) return;
  
    try {
      await db.collection("deliveries").doc(id).delete();
      showStatusMessage("✅ ลบข้อมูลสำเร็จ", "success");
    } catch (err) {
      console.error("❌ Error deleting:", err);
      showStatusMessage("❌ ไม่สามารถลบได้", "error");
    }
  }

// =================== Pagination Setup for "การขนส่ง" ===================

let allDeliveries = [];         // ดึงจาก Firestore
let filteredDeliveries = [];    // หลังกรอง search/filter
let currentPage = 1;
let entriesPerPage = 10;

// Load from Firestore
function setupDeliveriesListener() {
  db.collection("deliveries")
    .orderBy("createdAt", "desc")
    .onSnapshot(async snapshot => {
      await loadOrganizations();
      allDeliveries = snapshot.docs;
      applyFilters();
    });
}

// Filter from keyword and status
function applyFilters() {
  const keyword = searchInput.value.toLowerCase();
  const status = filterSelect.value;

  filteredDeliveries = allDeliveries.filter(doc => {
    const data = doc.data();
    const matchKeyword = [data.sender, data.boxNumber, data.note].some(f =>
      f?.toLowerCase().includes(keyword)
    );
    const matchStatus = status === "all" || data.status === status;
    return matchKeyword && matchStatus;
  });

  currentPage = 1;
  renderTable();
  updatePagination();
}

function renderTable() {
  tableBody.innerHTML = "";
  if (filteredDeliveries.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">ไม่มีรายการ</td></tr>`;
    return;
  }

  const start = (currentPage - 1) * entriesPerPage;
  const end = start + entriesPerPage;
  const pageData = filteredDeliveries.slice(start, end);

  pageData.forEach((doc, index) => {
    const data = doc.data();
    const orgName = organizationsCache.find(o => o.id === data.organization)?.name || "ไม่ระบุ";
    const locName = organizationsCache.find(o => o.id === data.fromLocation)?.name || "ไม่ระบุ";
    const itemsList = Array.isArray(data.items) ? data.items : [];
    const itemSummary = itemsList.map(i => `${i.name} x${i.qty}`).join(", ") || "-";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${data.boxNumber || '-'}</td>
      <td>${data.sender || '-'}</td>
      <td>${locName}</td>
      <td>${orgName}</td>
      <td>${itemSummary}</td>
      <td>${data.note || '-'}</td>
      <td>${formatDate(data.createdAt)}</td>
      <td>
        <button class="btn-secondary" onclick="editDelivery('${doc.id}')"><i class="fas fa-edit"></i> แก้ไข</button>
        <button class="btn-danger" onclick="deleteDelivery('${doc.id}')"><i class="fas fa-trash"></i> ลบ</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function updatePagination() {
  const totalPages = Math.ceil(filteredDeliveries.length / entriesPerPage);
  pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages || 1}`;

  firstPageBtn.disabled = currentPage === 1;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// =================== Events ===================
searchInput.addEventListener("input", applyFilters);
filterSelect.addEventListener("change", applyFilters);
entriesSelect.addEventListener("change", e => {
  entriesPerPage = parseInt(e.target.value);
  currentPage = 1;
  renderTable();
  updatePagination();
});

firstPageBtn.addEventListener("click", () => {
  currentPage = 1;
  renderTable();
  updatePagination();
});
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
    updatePagination();
  }
});
nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredDeliveries.length / entriesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
    updatePagination();
  }
});
lastPageBtn.addEventListener("click", () => {
  currentPage = Math.ceil(filteredDeliveries.length / entriesPerPage);
  renderTable();
  updatePagination();
});

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    loadInitialData();
  
    // ⬇ เพิ่มตรงนี้ลงไปใน block นี้เลย
    searchInput.addEventListener("input", applyFilters);
    filterSelect.addEventListener("change", applyFilters);
    entriesSelect.addEventListener("change", e => {
      entriesPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderTable();
      updatePagination();
    });
  
    firstPageBtn.addEventListener("click", () => {
      currentPage = 1;
      renderTable();
      updatePagination();
    });
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
        updatePagination();
      }
    });
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredDeliveries.length / entriesPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        updatePagination();
      }
    });
    lastPageBtn.addEventListener("click", () => {
      currentPage = Math.ceil(filteredDeliveries.length / entriesPerPage);
      renderTable();
      updatePagination();
    });
  });

  