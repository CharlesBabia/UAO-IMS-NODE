import { app, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Email utility
async function sendMail(to, subject, text, html) {
  try {
    const res = await fetch("http://localhost:3000/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text, html }),
    });
    const data = await res.json();
    if (data.success) {
      console.log("Email sent successfully!");
    } else {
      console.error("Failed to send email:", data.error);
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
  console.log("email sent Successfully")
}

// Helper to get user email by name
async function getUserEmailByName(name) {
  const userQuery = query(collection(db, "users"), where("fullName", "==", name));
  const userSnap = await getDocs(userQuery);
  if (!userSnap.empty) {
    return userSnap.docs[0].data().email;
  }
  return null;
}

// Helper to log equipment actions
async function logEquipmentAction(action, equipment, quantity) {
  await addDoc(collection(db, "equipmentLog"), {
    action,
    dateDone: new Date(),
    equipment,
    quantity
  });
}

// ====================== RETURN EQUIPMENT TAB ======================
async function renderBorrowedList() {
  const borrowedList = document.getElementById('borrowedList');
  if (!borrowedList) return;

  borrowedList.innerHTML = '';

  function parseFirestoreTimestamp(ts) {
    if (!ts) return null;
  
    // Firestore Timestamp objects have a .toDate() method
    if (typeof ts.toDate === "function") {
      return ts.toDate();
    }
  
    // Fallback: if it's a seconds/nanoseconds object
    if (ts.seconds) {
      return new Date(ts.seconds * 1000);
    }
  
    // Fallback: try parsing string
    return new Date(ts);
  }
  

  const querySnapshot = await getDocs(collection(db, "borrowRequests"));
  querySnapshot.forEach(async docSnap => {
    const req = docSnap.data();

    const borrowDate = req.borrowDate?.toDate ? req.borrowDate.toDate() : new Date(req.borrowDate.seconds * 1000);
    const returnDate = req.returnDate?.toDate ? req.returnDate.toDate() : new Date(req.returnDate.seconds * 1000);

    // Shows requests with "borrowed" status
    if (req.status === "borrowed") {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${req.equipment}</strong><br>
        <span style="font-size:0.95em;">
          Borrower: ${req.borrower} | Borrow Date: ${borrowDate ? borrowDate.toLocaleString() : "N/A"} |
          Return Date: ${returnDate ? returnDate.toLocaleString() : "N/A"} | Quantity: ${req.quantity}
        </span>
        ${req.returnDate < new Date() ? '<p style="color:red; font-weight:bold; margin-top:5px;">Overdue!</p>' : ''}
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          <label>Good:<br><input type="number" min="0" max="${req.quantity}" value="${req.quantity}" class="return-good" data-id="${docSnap.id}" style="width:160px;"></label>
          <label>Damaged:<br> <input type="number" min="0" max="${req.quantity}" value="0" class="return-damaged" data-id="${docSnap.id}" style="width:160px;"></label>
          <button class="mark-returned-btn uao-btn" data-id="${docSnap.id}" data-eq="${req.equipment}" data-qty="${req.quantity}">
            Return
          </button>
        </div>
      `;
      borrowedList.appendChild(li);
    }
    // Send overdue email to borrower
    if (returnDate < new Date()) {
      const borrowerEmail = await getUserEmailByName(req.borrower);
      if (borrowerEmail) {
        sendMail(
          borrowerEmail,
          "Overdue Equipment Notice",
          "Your borrowed equipment is overdue. Please return it immediately.",
          "<b>Your borrowed equipment is overdue. Please return it immediately.</b>"
        );
      }
    }
  });



  // Mark equipment as returned
  borrowedList.querySelectorAll('.mark-returned-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      const eqName = this.getAttribute('data-eq');
      const totalQty = parseInt(this.getAttribute('data-qty'));

      const goodInput = borrowedList.querySelector(`.return-good[data-id="${id}"]`);
      const damagedInput = borrowedList.querySelector(`.return-damaged[data-id="${id}"]`);
      const goodQty = parseInt(goodInput.value) || 0;
      const damagedQty = parseInt(damagedInput.value) || 0;

      if (goodQty + damagedQty !== totalQty) {
        alert("The sum of Good and Damaged quantities must equal the total borrowed quantity.");
        return;
      }
      if (goodQty < 0 || damagedQty < 0) {
        alert("Quantities cannot be negative.");
        return;
      }

      await updateDoc(doc(db, "borrowRequests", id), { status: "returned", goodQty, damagedQty });

      // Update good equipment quantity
      const eqQuery = query(collection(db, "equipment"), where("name", "==", eqName), where("condition", "==", "good"));
      const eqSnapshot = await getDocs(eqQuery);

      if (!eqSnapshot.empty && goodQty > 0) {
        const eqDoc = eqSnapshot.docs[0];
        const eqRef = doc(db, "equipment", eqDoc.id);
        const eqData = eqDoc.data();
        await updateDoc(eqRef, { quantity: (eqData.quantity || 0) + goodQty });
      }

      // Handle damaged equipment
      if (damagedQty > 0) {
        // Check if damaged equipment already exists
        const damagedQuery = query(collection(db, "equipment"), where("name", "==", eqName), where("condition", "==", "damaged"));
        const damagedSnapshot = await getDocs(damagedQuery);

        if (!damagedSnapshot.empty) {
          // Add to existing damaged equipment
          const damagedDoc = damagedSnapshot.docs[0];
          const damagedRef = doc(db, "equipment", damagedDoc.id);
          const damagedData = damagedDoc.data();
          await updateDoc(damagedRef, { quantity: (damagedData.quantity || 0) + damagedQty });
        } else {
          // Create new damaged equipment entry
          // Get category from good equipment if available
          let category = "miscellaneous";
          if (!eqSnapshot.empty) {
            category = eqSnapshot.docs[0].data().category || category;
          }
          await addDoc(collection(db, "equipment"), {
            name: eqName,
            category,
            quantity: damagedQty,
            condition: "damaged"
          });
        }

        // Set user penalty to true
        const reqDoc = await getDocs(query(collection(db, "borrowRequests"), where("__name__", "==", id)));
        if (!reqDoc.empty) {
          const reqData = reqDoc.docs[0].data();
          const borrowerName = reqData.borrower;
          const userQuery = query(collection(db, "users"), where("fullName", "==", borrowerName));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            await updateDoc(doc(db, "users", userDoc.id), { penalty: true });
          }
        }
      }

      renderBorrowedList();
    });
  });
}

// confirm borrow requests
async function renderConfirmList() {
  const confirmList = document.getElementById('confirmList');
  if (!confirmList) return;

  confirmList.innerHTML = '';

  const querySnapshot = await getDocs(collection(db, "borrowRequests"));
  querySnapshot.forEach(docSnap => {
    const req = docSnap.data();
    const borrowDate = req.borrowDate?.toDate ? req.borrowDate.toDate() : new Date(req.borrowDate.seconds * 1000);
    const returnDate = req.returnDate?.toDate ? req.returnDate.toDate() : new Date(req.returnDate.seconds * 1000);

    if (req.status === "pending") {
      const imageHtml = req.imageUrl
        ? `<div style="margin:8px 0;"><img src="${req.imageUrl}" alt="Attached Image" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid #ccc;"></div>`
        : '';

      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${req.equipment}</strong> (x${req.quantity})<br>
        <span style="font-size:0.95em;">
          Borrower: ${req.borrower} | Borrow Date: ${borrowDate ? borrowDate.toLocaleString() : "N/A"} |
          Return Date: ${returnDate ? returnDate.toLocaleString() : "N/A"} | Quantity: ${req.quantity}
        </span>
        ${imageHtml}
        <div class="uao-btn-group">
          <button class="confirm-borrow-btn uao-btn" data-id="${docSnap.id}" data-eq="${req.equipment}" data-qty="${req.quantity}">Confirm</button>
          <button class="reject-borrow-btn uao-btn delete" data-id="${docSnap.id}">Reject</button>
        </div>
      `;
      confirmList.appendChild(li);
    }
  });

  // Confirm borrows
  confirmList.querySelectorAll('.confirm-borrow-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      const eqName = this.getAttribute('data-eq');
      const qty = parseInt(this.getAttribute('data-qty'));

      // Find equipments by name
      const eqQuery = query(collection(db, "equipment"), where("name", "==", eqName));
      const eqSnapshot = await getDocs(eqQuery);

      if (!eqSnapshot.empty) {
        const eqDoc = eqSnapshot.docs[0];
        const eqRef = doc(db, "equipment", eqDoc.id);
        const eqData = eqDoc.data();
        const newQty = Math.max(0, (eqData.quantity || 0) - qty);
        await updateDoc(eqRef, { quantity: newQty });
      }

      await updateDoc(doc(db, "borrowRequests", id), { status: "borrowed" });

      // Send approval email
      const reqDoc = await getDocs(query(collection(db, "borrowRequests"), where("__name__", "==", id)));
      if (!reqDoc.empty) {
        const reqData = reqDoc.docs[0].data();
        const borrowerEmail = await getUserEmailByName(reqData.borrower);
        if (borrowerEmail) {
          sendMail(
            borrowerEmail,
            "Borrow Request Approved",
            "Your Request to Borrow Equipment has been Approved.",
            "<b>Your Request to Borrow Equipment has been Approved.</b>"
          );
        }
      }

      renderConfirmList();
    });
  });

  // Reject borrows
  confirmList.querySelectorAll('.reject-borrow-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      await updateDoc(doc(db, "borrowRequests", id), { status: "rejected" });

      // Send denial email
      const reqDoc = await getDocs(query(collection(db, "borrowRequests"), where("__name__", "==", id)));
      if (!reqDoc.empty) {
        const reqData = reqDoc.docs[0].data();
        const borrowerEmail = await getUserEmailByName(reqData.borrower);
        if (borrowerEmail) {
          sendMail(
            borrowerEmail,
            "Borrow Request Denied",
            "Your Request to Borrow Equipment has been Denied.",
            "<b>Your Request to Borrow Equipment has been Denied.</b>"
          );
        }
      }

      renderConfirmList();
    });
  });
}

// ====================== MANAGE EQUIPMENT TAB ======================
async function renderManageEquipment() {
  const manageList = document.getElementById('manageEquipmentList');
  if (!manageList) return;

  manageList.innerHTML = '';

  // Load equipment and make sure that damaged equipment cannot be edited
  const querySnapshot = await getDocs(collection(db, "equipment"));
  querySnapshot.forEach(docSnap => {
    const eq = docSnap.data();
    const isDamaged = eq.condition === "damaged";

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${eq.name}</strong> (${eq.category})<br>
      <label>Quantity:
        <input type="number" value="${eq.quantity}" min="0" class="eq-qty" data-id="${docSnap.id}" style="width:70px;" ${isDamaged ? "disabled" : ""}>
      </label>
      <label style="margin-left:10px;">Condition:
        <select class="eq-condition" data-id="${docSnap.id}" ${isDamaged ? "disabled" : ""}>
          <option value="good" ${eq.condition === "good" ? "selected" : ""}>Good</option>
          <option value="damaged" ${eq.condition === "damaged" ? "selected" : ""}>Damaged</option>
        </select>
      </label>
      <div class="uao-btn-group">
        <button class="save-eq-btn uao-btn" data-id="${docSnap.id}" ${isDamaged ? "disabled" : ""}>Save</button>
        <button class="delete-eq-btn uao-btn delete" data-id="${docSnap.id}">Delete</button>
      </div>
    `;
    manageList.appendChild(li);
  });

  // Save changes
  manageList.querySelectorAll('.save-eq-btn').forEach(btn => {
    if (btn.disabled) return;

    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      const qtyInput = manageList.querySelector(`.eq-qty[data-id="${id}"]`);
      const condSelect = manageList.querySelector(`.eq-condition[data-id="${id}"]`);
      const newQty = parseInt(qtyInput.value) || 0;
      const newCondition = condSelect.value;

      // Get previous quantity and equipment name
      const eqDocSnap = await getDocs(query(collection(db, "equipment"), where("__name__", "==", id)));
      let eqName = "";
      let prevQty = 0;
      if (!eqDocSnap.empty) {
        const eqData = eqDocSnap.docs[0].data();
        eqName = eqData.name;
        prevQty = eqData.quantity || 0;
      }

      await updateDoc(doc(db, "equipment", id), { quantity: newQty, condition: newCondition });

      // Log add/remove action
      if (newQty > prevQty) {
        await logEquipmentAction("add", eqName, newQty - prevQty);
      } else if (newQty < prevQty) {
        await logEquipmentAction("remove", eqName, prevQty - newQty);
      }

      alert("Equipment updated successfully!");
      renderManageEquipment();
    });
  });

  // Delete equipment
  manageList.querySelectorAll('.delete-eq-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this equipment? This action cannot be undone.")) {
        // Get equipment name and quantity before deletion
        const eqDocSnap = await getDocs(query(collection(db, "equipment"), where("__name__", "==", id)));
        let eqName = "";
        let eqQty = 0;
        if (!eqDocSnap.empty) {
          const eqData = eqDocSnap.docs[0].data();
          eqName = eqData.name;
          eqQty = eqData.quantity;
        }

        await deleteDoc(doc(db, "equipment", id));

        // Log remove action
        await logEquipmentAction("remove", eqName, eqQty);

        alert("Equipment deleted successfully!");
        renderManageEquipment();
      }
    });
  });
}

// ====================== EQUIPMENT LOGS TAB ======================
async function renderEquipmentLogs() {
  const logsList = document.getElementById('equipmentLogsList');
  if (!logsList) return;

  logsList.innerHTML = '';

  // Get logs ordered by dateDone descending
  const logsQuery = query(collection(db, "equipmentLog"), orderBy("dateDone", "desc"));
  const logsSnap = await getDocs(logsQuery);

  logsSnap.forEach(docSnap => {
    const log = docSnap.data();
    const dateStr = log.dateDone?.toDate ? log.dateDone.toDate().toLocaleString() : new Date(log.dateDone.seconds * 1000).toLocaleString();
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${log.action === "add" ? "Added" : "Removed"}</strong> 
      <span style="color:${log.action === "add" ? "#2e4a9e" : "#d9534f"};">
        ${log.quantity} x ${log.equipment}
      </span>
      <br>
      <span style="font-size:0.92em; color:#555;">${dateStr}</span>
    `;
    logsList.appendChild(li);
  });
}

// ====================== BORROW HISTORY TAB ======================
async function renderBorrowHistory() {
  const historyList = document.getElementById('borrowHistoryList');
  if (!historyList) return;

  historyList.innerHTML = '';

  const querySnapshot = await getDocs(collection(db, "borrowRequests"));
  querySnapshot.forEach(docSnap => {
    const req = docSnap.data();
    // Only show borrowed and returned
    if (req.status === "borrowed" || req.status === "returned") {
      const borrowDate = req.borrowDate?.toDate ? req.borrowDate.toDate() : new Date(req.borrowDate.seconds * 1000);
      const returnDate = req.returnDate?.toDate ? req.returnDate.toDate() : new Date(req.returnDate.seconds * 1000);
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${req.equipment}</strong> (x${req.quantity})<br>
        <span style="font-size:0.95em;">
          Borrower: ${req.borrower} | Status: <span style="color:${req.status === "borrowed" ? "#2e4a9e" : "#d4af37"};">${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span><br>
          Borrow Date: ${borrowDate ? borrowDate.toLocaleString() : "N/A"}<br>
          Return Date: ${returnDate ? returnDate.toLocaleString() : "N/A"}
        </span>
      `;
      historyList.appendChild(li);
    }
  });
}

// ====================== ADD EQUIPMENT ======================
const showAdd = document.getElementById('showAdd');
const addSection = document.getElementById('addSection');
const addEquipmentForm = document.getElementById('addEquipmentForm');

if (addEquipmentForm) {
  addEquipmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('equipmentName').value.trim();
    const category = document.getElementById('equipmentCategory').value.trim();
    const quantity = parseInt(document.getElementById('equipmentQuantity').value);

    if (!name || !category || isNaN(quantity) || quantity < 1) {
      alert("Please enter valid equipment name, category, and quantity.");
      return;
    }

    // Check if equipment already exists (good condition)
    const eqQuery = query(collection(db, "equipment"), where("name", "==", name), where("condition", "==", "good"));
    const eqSnapshot = await getDocs(eqQuery);

    if (!eqSnapshot.empty) {
      // if existing equipment update quantity only
      const eqDoc = eqSnapshot.docs[0];
      const eqRef = doc(db, "equipment", eqDoc.id);
      const eqData = eqDoc.data();
      await updateDoc(eqRef, { quantity: (eqData.quantity || 0) + quantity });
      await logEquipmentAction("add", name, quantity);
      alert("Equipment quantity updated successfully!");
    } else {
      // if not existing adds new equipment
      await addDoc(collection(db, "equipment"), { name, category, quantity, condition: "good" });
      await logEquipmentAction("add", name, quantity);
      alert("Equipment added successfully!");
    }
    addEquipmentForm.reset();
  });
}

// ====================== TAB SWITCHING ======================
const showReturn = document.getElementById('showReturn');
const showConfirm = document.getElementById('showConfirm');
const showManage = document.getElementById('showManage');
const showLogs = document.getElementById('showLogs');
const showHistory = document.getElementById('showHistory');
const returnSection = document.getElementById('returnSection');
const confirmSection = document.getElementById('confirmSection');
const manageSection = document.getElementById('manageSection');
const logsSection = document.getElementById('logsSection');
const historySection = document.getElementById('historySection');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

if (showReturn && showConfirm && showManage && showAdd && showLogs && showHistory && returnSection && confirmSection && manageSection && addSection && logsSection && historySection && formTitle && formSubtitle) {
  showReturn.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'block';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'none';
    addSection.style.display = 'none';
    logsSection.style.display = 'none';
    historySection.style.display = 'none';
    formTitle.innerHTML = 'Return <span class="highlight">Equipment</span>';
    formSubtitle.innerHTML = 'Mark borrowed equipment as returned';
    showReturn.classList.add('active');
    showConfirm.classList.remove('active');
    showManage.classList.remove('active');
    showAdd.classList.remove('active');
    showLogs.classList.remove('active');
    showHistory.classList.remove('active');
    renderBorrowedList();
  });

  showConfirm.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'block';
    manageSection.style.display = 'none';
    addSection.style.display = 'none';
    logsSection.style.display = 'none';
    historySection.style.display = 'none';
    formTitle.innerHTML = 'Confirm <span class="highlight">Borrow Requests</span>';
    formSubtitle.innerHTML = 'Confirm pending borrow requests';
    showConfirm.classList.add('active');
    showReturn.classList.remove('active');
    showManage.classList.remove('active');
    showAdd.classList.remove('active');
    showLogs.classList.remove('active');
    showHistory.classList.remove('active');
    renderConfirmList();
  });

  showManage.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'block';
    addSection.style.display = 'none';
    logsSection.style.display = 'none';
    historySection.style.display = 'none';
    formTitle.innerHTML = 'Manage <span class="highlight">Equipment</span>';
    formSubtitle.innerHTML = 'Add or reduce equipment quantity';
    showManage.classList.add('active');
    showReturn.classList.remove('active');
    showConfirm.classList.remove('active');
    showAdd.classList.remove('active');
    showLogs.classList.remove('active');
    showHistory.classList.remove('active');
    renderManageEquipment();
  });

  showAdd.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'none';
    addSection.style.display = 'block';
    logsSection.style.display = 'none';
    historySection.style.display = 'none';
    formTitle.innerHTML = 'Add <span class="highlight">Equipment</span>';
    formSubtitle.innerHTML = 'Add new equipment to the database';
    showAdd.classList.add('active');
    showReturn.classList.remove('active');
    showConfirm.classList.remove('active');
    showManage.classList.remove('active');
    showLogs.classList.remove('active');
    showHistory.classList.remove('active');
  });

  showLogs.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'none';
    addSection.style.display = 'none';
    logsSection.style.display = 'block';
    historySection.style.display = 'none';
    formTitle.innerHTML = 'Equipment <span class="highlight">Logs</span>';
    formSubtitle.innerHTML = 'View equipment add/remove history';
    showLogs.classList.add('active');
    showReturn.classList.remove('active');
    showConfirm.classList.remove('active');
    showManage.classList.remove('active');
    showAdd.classList.remove('active');
    showHistory.classList.remove('active');
    renderEquipmentLogs();
  });

  showHistory.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'none';
    addSection.style.display = 'none';
    logsSection.style.display = 'none';
    historySection.style.display = 'block';
    formTitle.innerHTML = 'Borrow <span class="highlight">History</span>';
    formSubtitle.innerHTML = 'View all borrowed and returned equipment';
    showHistory.classList.add('active');
    showReturn.classList.remove('active');
    showConfirm.classList.remove('active');
    showManage.classList.remove('active');
    showAdd.classList.remove('active');
    showLogs.classList.remove('active');
    renderBorrowHistory();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderBorrowedList();
});
