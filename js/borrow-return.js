import { app, db, storage } from "./firebase-config.js";
import {
  collection, addDoc, getDoc, doc, updateDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
  // responsible for tab switching in sidebar
  const showBorrow = document.getElementById('showBorrow');
  const showSearch = document.getElementById('showSearch');
  const borrowForm = document.getElementById('borrowForm');
  const searchSection = document.getElementById('searchSection');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');

  if (showBorrow && showSearch && borrowForm && searchSection && formTitle && formSubtitle) {
    showBorrow.addEventListener('click', (e) => {
      e.preventDefault();
      borrowForm.style.display = 'block';
      searchSection.style.display = 'none';
      formTitle.innerHTML = 'Borrow <span class="highlight">Equipment</span>';
      formSubtitle.innerHTML = 'Fill out the form to borrow equipment';
      showBorrow.classList.add('active');
      showSearch.classList.remove('active');
    });

    showSearch.addEventListener('click', (e) => {
      e.preventDefault();
      borrowForm.style.display = 'none';
      searchSection.style.display = 'block';
      formTitle.innerHTML = 'Search <span class="highlight">Equipment</span>';
      formSubtitle.innerHTML = 'Find equipment using the search and filter options';
      showSearch.classList.add('active');
      showBorrow.classList.remove('active');
    });
  }

  // Populate equipment dropdown, this makes it so that only equipment that is registered in the database will be available for borrowing
  const equipmentDropdown = document.getElementById('equipmentDropdown');
  const quantityInput = document.querySelector('.quantity-input');

  if (equipmentDropdown) {
    async function populateEquipmentDropdown() {
      equipmentDropdown.innerHTML = '<option value="">Loading...</option>';
      const querySnapshot = await getDocs(collection(db, "equipment"));
      let options = '';
      querySnapshot.forEach(docSnap => {
        const item = docSnap.data();
        if (item.quantity > 0 && item.condition.toLowerCase() === "good") {
          options += `<option value="${docSnap.id}">${item.name}</option>`;
        }
      });
      equipmentDropdown.innerHTML = options || '<option value="">No equipment available</option>';
    }
    populateEquipmentDropdown();

    // set the max quantity to the equipment when changing in the dropdown(this detects the quantity of the selected equipment and set it to be the max quant)
    equipmentDropdown.addEventListener('change', async function() {
      const equipmentId = equipmentDropdown.value;
      if (!equipmentId) {
        quantityInput.removeAttribute('max');
        return;
      }
      const eqDocRef = doc(db, "equipment", equipmentId);
      const eqDoc = await getDoc(eqDocRef);
      if (eqDoc.exists()) {
        const eqData = eqDoc.data();
        quantityInput.max = eqData.quantity;
      } else {
        quantityInput.removeAttribute('max');
      }
    });
  }

  const filter = document.getElementById('filterSelect');

  if(filter){
    async function populateFilterOptions() {
      filter.innerHTML = '<option value="">All Categories</option>';
      const categories = new Set();
      const querySnapshot = await getDocs(collection(db, "equipment"));
      querySnapshot.forEach(docSnap => {
        const item = docSnap.data();
        categories.add(item.category);
      });
      categories.forEach(category => {
        filter.innerHTML += `<option value="${category}">${category}</option>`;
      });
    }
    populateFilterOptions();
  }

  // submission of borrow form
  if (borrowForm) {
    borrowForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      console.log("Borrow form submitted");

      const equipmentId = document.getElementById("equipmentDropdown").value;
      const quantity = parseInt(borrowForm.querySelector(".quantity-input").value);
      const borrowDate = borrowForm.querySelector(".date-input").value;
      const returnDate = borrowForm.querySelector(".return-date-input").value;
      const borrower = localStorage.getItem("fullName") || "Unknown";

      console.log({ equipmentId, quantity, borrowDate, returnDate, borrower });

      if (!equipmentId) {
        alert("Please select equipment.");
        return;
      }
      if (!quantity || quantity < 1) {
        alert("Please enter a valid quantity.");
        return;
      }
      if (!borrowDate) {
        alert("Please select a borrowing date.");
        return;
      }
      if (!returnDate) {
        alert("Please select a return date.");
        return;
      }

      // checks if user has penalty or not
      const userQuery = query(collection(db, "users"), where("fullName", "==", borrower));
      const userSnap = await getDocs(userQuery);
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        if (userData.penalty === true) {
          alert("You have a penalty and cannot borrow equipment.");
          return;
        }
      }

      // checks if equipment is available or not
      const eqDocRef = doc(db, "equipment", equipmentId);
      const eqDoc = await getDoc(eqDocRef);
      if (!eqDoc.exists()) {
        alert("Equipment not found.");
        return;
      }
      const eqData = eqDoc.data();
      if (quantity > eqData.quantity) {
        alert("Not enough quantity available.");
        return;
      }
      if (eqData.condition.toLowerCase() !== "good") {
        alert("Equipment is not available for borrowing.");
        return;
      }

      try {
        await addDoc(collection(db, "borrowRequests"), {
          equipment: eqData.name,
          equipmentId, 
          quantity,
          borrowDate,
          returnDate,
          borrower,
          status: "pending"
        });
        alert("Borrow request sent for admin confirmation.");
        borrowForm.reset();
      } catch (err) {
        alert("Failed to send request: " + err.message);
        console.error("Error adding borrowRequest:", err);
      }
    });
  }

  // Search Functions
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const equipmentList = document.getElementById('equipmentList');

  if (searchInput && filterSelect && equipmentList) {
    searchInput.addEventListener('input', renderEquipmentList);
    filterSelect.addEventListener('change', renderEquipmentList);
    renderEquipmentList();
  }

  async function renderEquipmentList() {
    const searchValue = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;

    equipmentList.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "equipment"));
    querySnapshot.forEach(docSnap => {
      const item = docSnap.data();

      
      if (item.condition.toLowerCase() !== "damaged") {
        if (item.name.toLowerCase().includes(searchValue)) {
          if (!filterValue || item.category === filterValue) {
            const li = document.createElement("li");
            li.innerHTML = `
              <strong>${item.name}</strong><br>
              <span style="font-size:0.9em;">Category: ${item.category} | Quantity: ${item.quantity}</span>
            `;
            equipmentList.appendChild(li);
          }
        }
      }
    });
  }
});
