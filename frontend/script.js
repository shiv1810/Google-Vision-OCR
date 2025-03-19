// DOM Elements
const fileInput = document.getElementById("fileInput");
const extractBtn = document.getElementById("extractBtn");
const fileName = document.getElementById("fileName");
const filePreview = document.getElementById("filePreview");
const removeFileBtn = document.getElementById("removeFile");
const loadingIndicator = document.querySelector(".loading-indicator");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const invoiceImg = document.getElementById("invoiceImg");
const imagePreview = document.getElementById("imagePreview");
const pdfPreview = document.getElementById("pdfPreview");
const successModal = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const confirmBtn = document.getElementById("confirmBtn");

// Document option selectors
const docTypeSelect = document.getElementById("docTypeSelect");
const docStyleSelect = document.getElementById("docStyleSelect");

// Event Listeners
fileInput.addEventListener("change", handleFileSelection);
removeFileBtn.addEventListener("click", removeFile);
extractBtn.addEventListener("click", uploadImage);
confirmBtn.addEventListener("click", confirmInvoice);
closeModalBtn.addEventListener("click", () => {
  successModal.classList.add("hidden");
  goBack();
});

// Handle file selection
function handleFileSelection(event) {
  const file = event.target.files[0];
  if (file) {
    fileName.textContent = file.name;
    filePreview.classList.remove("hidden");
    extractBtn.disabled = false;
    const fileType = file.type;
    if (fileType === "application/pdf") {
      // Show PDF preview in an iframe
      pdfPreview.src = URL.createObjectURL(file);
      pdfPreview.classList.remove("hidden");
      imagePreview.classList.add("hidden");
    } else {
      // Show image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove("hidden");
        pdfPreview.classList.add("hidden");
      };
      reader.readAsDataURL(file);
    }
  }
}

// Remove selected file
function removeFile() {
  fileInput.value = "";
  filePreview.classList.add("hidden");
  extractBtn.disabled = true;
}

// Go back to step 1 and clear form data
function goBack() {
  step1.classList.remove("hidden");
  step2.classList.add("hidden");
  document.getElementById("invoiceNumberInput").value = "";
  document.getElementById("invoiceDateInput").value = "";
  document.getElementById("invoiceAmountInput").value = "";
  document.getElementById("gstNumberInput").value = "";
  document.getElementById("gstPercentageInput").value = "";
  document.getElementById("itemsBody").innerHTML = "";
}

// Upload file and extract document data
function uploadImage() {
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a document file.");
    return;
  }
  extractBtn.disabled = true;
  loadingIndicator.classList.remove("hidden");

  const fileType = file.type;
  if (fileType !== "application/pdf") {
    const reader = new FileReader();
    reader.onload = (e) => {
      invoiceImg.src = e.target.result;
      invoiceImg.classList.remove("hidden"); // Ensure visibility
    };
    reader.readAsDataURL(file);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docTypeSelect.value);
  formData.append("doc_style", docStyleSelect.value);

  fetch("http://127.0.0.1:5000/upload-invoice", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      loadingIndicator.classList.add("hidden");
      extractBtn.disabled = false;
      if (data.status === "success") {
        document.getElementById("invoiceNumberInput").value =
          data.extracted_data.invoice_number || "";
        document.getElementById("invoiceDateInput").value =
          data.extracted_data.invoice_date || "";
        document.getElementById("invoiceAmountInput").value =
          data.extracted_data.invoice_amount || "";
        document.getElementById("gstNumberInput").value =
          data.extracted_data.gst_no || "";
        document.getElementById("gstPercentageInput").value =
          data.extracted_data.gst_percentage || "";

        // Populate itemized table
        populateItemsTable(data.extracted_data.items);

        step1.classList.add("hidden");
        step2.classList.remove("hidden");
      } else {
        alert("Error extracting details.");
      }
    })
    .catch((error) => {
      loadingIndicator.classList.add("hidden");
      extractBtn.disabled = false;
      console.error("Error:", error);
      alert("Connection error. Please try again.");
    });
}

// Populate the items table dynamically
function populateItemsTable(items) {
  const tableBody = document.getElementById("itemsBody");
  tableBody.innerHTML = ""; // Clear previous items

  items.forEach((item) => {
    addNewRow(item.name, item.quantity, item.rate, item.amount);
  });
}

// Function to add a new row dynamically
function addNewRow(name = "", quantity = 1, rate = 0, amount = 0) {
  const tableBody = document.getElementById("itemsBody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" value="${name}" /></td>
    <td><input type="number" value="${quantity}" onchange="updateAmount(this)" /></td>
    <td><input type="number" value="${rate}" onchange="updateAmount(this)" /></td>
    <td><input type="number" value="${amount}" readonly /></td>
    <td><button onclick="removeRow(this)">Remove</button></td>
  `;
  tableBody.appendChild(row);
}

// Function to update the amount when quantity or rate changes
function updateAmount(element) {
  const row = element.parentElement.parentElement;
  const quantity = row.children[1].children[0].value;
  const rate = row.children[2].children[0].value;
  row.children[3].children[0].value = (quantity * rate).toFixed(2);
}

// Remove a row from the table
function removeRow(button) {
  button.parentElement.parentElement.remove();
}

// Confirm and save document data
function confirmInvoice() {
  const invoiceNumber = document.getElementById("invoiceNumberInput").value;
  const invoiceDate = document.getElementById("invoiceDateInput").value;
  const invoiceAmount = document.getElementById("invoiceAmountInput").value;
  const gstNumber = document.getElementById("gstNumberInput").value;
  const gstPercentage = document.getElementById("gstPercentageInput").value;

  // Extract items from the table
  const items = [];
  document.querySelectorAll("#itemsBody tr").forEach((row) => {
    const name = row.children[0].children[0].value;
    const quantity = row.children[1].children[0].value;
    const rate = row.children[2].children[0].value;
    const amount = row.children[3].children[0].value;
    items.push({ name, quantity, rate, amount });
  });

  if (!invoiceNumber || !invoiceDate || !invoiceAmount) {
    alert("Please fill in all fields.");
    return;
  }

  const payload = {
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    invoice_amount: invoiceAmount,
    gst_no: gstNumber,
    gst_percentage: gstPercentage,
    items: items,
  };

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Saving...";

  fetch("http://127.0.0.1:5000/confirm-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm & Save";
      if (data.status === "success") {
        successModal.classList.remove("hidden");
      } else {
        alert("Error saving document data.");
      }
    })
    .catch((error) => {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm & Save";
      console.error("Error:", error);
      alert("Connection error. Please try again.");
    });
}
