import { app, db } from "./firebase-config.js";
import {
  collection, getDocs, updateDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function renderPenaltyList() {
  const penaltyList = document.getElementById('penaltyList');
  if (!penaltyList) return;
  penaltyList.innerHTML = '';
  const q = query(collection(db, "users"), where("penalty", "==", true));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(docSnap => {
    const user = docSnap.data();
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${user.fullName}</strong> (${user.email || "No email"})<br>
      <span style="font-size:0.95em;">Penalty: <span style="color:red;">Active</span></span>
      <button class="clear-penalty-btn" data-id="${docSnap.id}" style="margin-left:10px;">Clear Penalty</button>
    `;
    penaltyList.appendChild(li);
  });

  penaltyList.querySelectorAll('.clear-penalty-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.getAttribute('data-id');
      await updateDoc(doc(db, "users", id), { penalty: false });
      renderPenaltyList();
    });
  });
}

document.addEventListener("DOMContentLoaded", renderPenaltyList);
