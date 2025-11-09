import { app, db } from "./firebase-config.js";
import {
  collection, getDocs, doc, updateDoc, query, where, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// returns
async function renderBorrowedList() {
  const borrowedList = document.getElementById('borrowedList');
  if (!borrowedList) return;
  borrowedList.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, "borrowRequests"));
  querySnapshot.forEach(docSnap => {
    const req = docSnap.data();

    // shows requests with "borrowed" status
    if (req.status === "borrowed") {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${req.equipment}</strong><br>
        <span style="font-size:0.95em;">Borrower: ${req.borrower} | Borrow Date: ${req.borrowDate} | Return Date: ${req.returnDate} | Quantity: ${req.quantity}</span>
        <select class="return-condition" data-id="${docSnap.id}" style="margin-left:10px;">
          <option value="">Set Condition</option>
          <option value="Good">Good</option>
          <option value="Damaged">Damaged</option>
        </select>
        <button class="mark-returned-btn" data-id="${docSnap.id}" data-eq="${req.equipment}" data-qty="${req.quantity}" style="margin-left:5px; float:right;">Mark as Returned</button>
      `;
      borrowedList.appendChild(li);
    }
  });

  // mark equipment as returned
  borrowedList.querySelectorAll('.mark-returned-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      const eqName = this.getAttribute('data-eq');
      const qty = parseInt(this.getAttribute('data-qty'));
      const select = borrowedList.querySelector(`.return-condition[data-id="${id}"]`);
      const condition = select ? select.value : "";
      if (!condition) {
        alert("Please select return condition.");
        return;
      }

      await updateDoc(doc(db, "borrowRequests", id), { status: "returned", condition });

      // search equipment(name)
      const eqQuery = query(collection(db, "equipment"), where("name", "==", eqName), where("condition", "==", "good"));
      const eqSnapshot = await getDocs(eqQuery);
      if (!eqSnapshot.empty) {
        const eqDoc = eqSnapshot.docs[0];
        const eqRef = doc(db, "equipment", eqDoc.id);
        const eqData = eqDoc.data();

      // function to create new damaged equipment entry to seperate from good ones
        if (condition === "Damaged") {
          
          await addDoc(collection(db, "equipment"), {
            name: eqData.name,
            category: eqData.category,
            quantity: qty,
            condition: "damaged"
          });
          // will not add quantity back to good equipment pool if marked as damaged on return

          // if returned equipment is marked as damaged, set user penalty to true
          const reqDoc = await getDocs(query(collection(db, "borrowRequests"), where("__name__", "==", id)));
          if (!reqDoc.empty) {
            const reqData = reqDoc.docs[0].data();
            const borrowerName = reqData.borrower;
            // Finds user by name
            const userQuery = query(collection(db, "users"), where("fullName", "==", borrowerName));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
              const userDoc = userSnap.docs[0];
              await updateDoc(doc(db, "users", userDoc.id), { penalty: true });
            }
          }
        } else {
          // adds quantity back to equipment in database after return if equipment is not damaged
          await updateDoc(eqRef, { quantity: (eqData.quantity || 0) + qty });
        }
      }

      renderBorrowedList();
    });
  });
}

// shows borrow requests to confirm
async function renderConfirmList() {
  const confirmList = document.getElementById('confirmList');
  if (!confirmList) return;
  confirmList.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, "borrowRequests"));
  querySnapshot.forEach(docSnap => {
    const req = docSnap.data();

    if (req.status === "pending") {
      const imageHtml = req.imageUrl
        ? `<div style="margin:8px 0;"><img src="${req.imageUrl}" alt="Attached Image" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid #ccc;"></div>`
        : '';
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${req.equipment}</strong> (x${req.quantity})<br>
        <span style="font-size:0.95em;">Borrower: ${req.borrower} | Borrow: ${req.borrowDate} | Return: ${req.returnDate}</span>
        ${imageHtml}
        <button class="confirm-borrow-btn" data-id="${docSnap.id}" data-eq="${req.equipment}" data-qty="${req.quantity}" style="margin-left:10px; float:right;">Confirm</button>
        <button class="reject-borrow-btn" data-id="${docSnap.id}" style="margin-left:10px; float:right;">Reject</button>
      `;
      confirmList.appendChild(li);
    }
  });

  // confirm borrows
  confirmList.querySelectorAll('.confirm-borrow-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      const eqName = this.getAttribute('data-eq');
      const qty = parseInt(this.getAttribute('data-qty'));

      // find equipments by name
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
      renderConfirmList();
    });
  });

  // reject borrows
  confirmList.querySelectorAll('.reject-borrow-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      await updateDoc(doc(db, "borrowRequests", id), { status: "rejected" });
      renderConfirmList();
    });
  });
}

// manage equipment tab
async function renderManageEquipment() {
  const manageList = document.getElementById('manageEquipmentList');
  if (!manageList) return;
  manageList.innerHTML = '';


  // load equipment and makes sure that damaged equipment cannot be edited
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
      <button class="save-eq-btn" data-id="${docSnap.id}" style="margin-left:10px; margin-top:10px; padding:2px; width:50px;" ${isDamaged ? "disabled" : ""}>Save</button>
      <button class="delete-eq-btn" data-id="${docSnap.id}" style="margin-left:10px; margin-top:10px; color:#fff; background:#d9534f; padding:2px; width:50px;">Delete</button>
    `;
    manageList.appendChild(li);
  });

  // save changes
  manageList.querySelectorAll('.save-eq-btn').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      const qtyInput = manageList.querySelector(`.eq-qty[data-id="${id}"]`);
      const condSelect = manageList.querySelector(`.eq-condition[data-id="${id}"]`);
      const newQty = parseInt(qtyInput.value) || 0;
      const newCondition = condSelect.value;

      await updateDoc(doc(db, "equipment", id), {
        quantity: newQty,
        condition: newCondition
      });

      alert("Equipment updated successfully!");
      renderManageEquipment();
    });
  });

  // delete equipment
  manageList.querySelectorAll('.delete-eq-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this equipment? This action cannot be undone.")) {
        await deleteDoc(doc(db, "equipment", id));
        alert("Equipment deleted successfully!");
        renderManageEquipment();
      }
    });
  });
}


const showAdd = document.getElementById('showAdd');
const addSection = document.getElementById('addSection');
const addEquipmentForm = document.getElementById('addEquipmentForm');

// add equipment
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
    await addDoc(collection(db, "equipment"), {
      name,
      category,
      quantity,
      condition: "good"
    });
    alert("Equipment added successfully!");
    addEquipmentForm.reset();
  });
}

// tabswitch
const showReturn = document.getElementById('showReturn');
const showConfirm = document.getElementById('showConfirm');
const showManage = document.getElementById('showManage');
const returnSection = document.getElementById('returnSection');
const confirmSection = document.getElementById('confirmSection');
const manageSection = document.getElementById('manageSection');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

if (showReturn && showConfirm && showManage && showAdd && returnSection && confirmSection && manageSection && addSection && formTitle && formSubtitle) {
  showReturn.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'block';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'none';
    addSection.style.display = 'none';
    formTitle.innerHTML = 'Return <span class="highlight">Equipment</span>';
    formSubtitle.innerHTML = 'Mark borrowed equipment as returned';
    showReturn.classList.add('active');
    showConfirm.classList.remove('active');
    showManage.classList.remove('active');
    showAdd.classList.remove('active');
    renderBorrowedList();
  });

  showConfirm.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'block';
    manageSection.style.display = 'none';
    addSection.style.display = 'none';
    formTitle.innerHTML = 'Confirm <span class="highlight">Borrow Requests</span>';
    formSubtitle.innerHTML = 'Confirm pending borrow requests';
    showConfirm.classList.add('active');
    showReturn.classList.remove('active');
    showManage.classList.remove('active');
    showAdd.classList.remove('active');
    renderConfirmList();
  });

  showManage.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'block';
    addSection.style.display = 'none';
    formTitle.innerHTML = 'Manage <span class="highlight">Equipment</span>';
    formSubtitle.innerHTML = 'Add or reduce equipment quantity';
    showManage.classList.add('active');
    showReturn.classList.remove('active');
    showConfirm.classList.remove('active');
    showAdd.classList.remove('active');
    renderManageEquipment();
  });

  showAdd.addEventListener('click', (e) => {
    e.preventDefault();
    returnSection.style.display = 'none';
    confirmSection.style.display = 'none';
    manageSection.style.display = 'none';
    addSection.style.display = 'block';
    formTitle.innerHTML = 'Add <span class="highlight">Equipment</span>';
    formSubtitle.innerHTML = 'Add new equipment to the database';
    showAdd.classList.add('active');
    showReturn.classList.remove('active');
    showConfirm.classList.remove('active');
    showManage.classList.remove('active');
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderBorrowedList();
});

