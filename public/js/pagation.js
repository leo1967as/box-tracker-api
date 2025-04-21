// pagination.js

// ตัวแปรสำหรับการแบ่งหน้า
let currentPage = 1;
let rowsPerPage = 10;
let allData = [];
let filteredData = [];

export function setData(dataArray) {
  allData = dataArray;
  filteredData = [...allData];
  currentPage = 1;
  renderTable();
  renderPagination();
}

export function filterData(keyword) {
  const lower = keyword.toLowerCase();
  filteredData = allData.filter(item => item.name.toLowerCase().includes(lower));
  currentPage = 1;
  renderTable();
  renderPagination();
}

export function changeRowsPerPage(value) {
  rowsPerPage = parseInt(value);
  currentPage = 1;
  renderTable();
  renderPagination();
}

function renderTable() {
    const tableBody = document.getElementById("deliveryTableBody");
    tableBody.innerHTML = "";
  
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredDeliveries.slice(start, end);
  
    if (pageData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">ไม่มีรายการ</td></tr>`;
      return;
    }
  
    pageData.forEach((doc, index) => {
      const data = doc.data();
      const orgName = organizationsCache.find(o => o.id === data.organization)?.name || "ไม่ระบุ";
      const locName = organizationsCache.find(o => o.id === data.fromLocation)?.name || "ไม่ระบุ";
      const itemsList = Array.isArray(data.items) ? data.items : [];
      const itemSummary = itemsList.length > 0
        ? itemsList.map(item => `${item.name} x${item.qty}`).join(', ')
        : "ไม่มีรายการ";
  
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
  

  function renderPagination() {
    const totalPages = Math.ceil(filteredDeliveries.length / rowsPerPage);
    const container = document.getElementById("paginationControls");
    container.innerHTML = "";
  
    if (totalPages <= 1) return;
  
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = "pagination-btn";
      if (i === currentPage) btn.style.background = "#d1d5db";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderTable();
        renderPagination();
      });
      container.appendChild(btn);
    }
  }
  

