window.editDelivery = async function(id) {
    try {
      const doc = await db.collection("deliveries").doc(id).get();
      if (!doc.exists) return alert("❌ ไม่พบข้อมูลรายการนี้");
  
      const data = doc.data();
  
      // ใส่ค่าลงฟอร์ม
      elements.form.sender.value = data.sender || '';
      elements.form.boxNumber.value = data.boxNumber || '';
      elements.form.note.value = data.note || '';
      elements.orgSelect.value = data.organization || '';
      document.getElementById("fromLocation").value = data.fromLocation || '';
  
      // ใส่รายการสิ่งของ
      elements.itemsContainer.innerHTML = '';
      (data.items || []).forEach(item => {
        const row = document.createElement("div");
        row.className = "item-row";
        row.innerHTML = `
          <input type="text" placeholder="ชื่อสิ่งของ" class="item-name" value="${item.name}" required />
          <input type="number" placeholder="จำนวน" class="item-qty" value="${item.qty}" min="1" required />
          <button type="button" class="btn-icon remove-btn" onclick="removeItemField(this)">
            <i class="fas fa-trash"></i>
          </button>
        `;
        elements.itemsContainer.appendChild(row);
      });
  
      // เปิด modal และกำหนดโหมดแก้ไข
      elements.modal.classList.remove("hidden");
      elements.statusMessage.textContent = '';
      window._editDeliveryMode = true;
      window._editDeliveryId = id;
  
    } catch (err) {
      console.error("❌ Error loading delivery:", err);
      alert("❌ ไม่สามารถโหลดข้อมูลได้");
    }
  };
  