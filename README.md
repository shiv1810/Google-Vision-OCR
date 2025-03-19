# **Invoice OCR - Google Vision API Boilerplate**

## **Overview**

This project provides a **boilerplate codebase** for extracting invoice details using **Google Vision OCR API**. It processes invoices (PDFs or images), extracts structured data (invoice number, total amount, GST, etc.), and stores it in a **MySQL database**.

This template allows users to **quickly integrate Google OCR** by adding their API key and installing dependencies.

---

## **Features**

- **Google Vision OCR Integration**: Uses Google Cloud’s OCR for extracting text from invoices.
- **Image & PDF Support**: Converts PDFs to images and processes them.
- **Preprocessing Enhancements**: Includes adaptive thresholding, contrast improvement, and deskewing.
- **Structured Data Extraction**: Extracts invoice number, date, total amount, and GST details.
- **MySQL Database Integration**: Stores extracted invoice data in a structured format.
- **Frontend Integration**: Simple HTML form for uploading invoices.

---

## **Prerequisites**

1. **Python 3.8+**
2. **Google Cloud API Key** (for Vision OCR)
3. **MySQL Database** (if storing extracted data)
4. **Flask for Backend**
5. **Basic HTML & JavaScript for Frontend**

---

## **Setup Instructions**

### **1️⃣ Clone the Repository**

```sh
git clone https://github.com/your-username/Google-Vision-OCR.git
cd Google-Vision-OCR
```

### **2️⃣ Install Dependencies**

Install the required Python packages:

```sh
pip install -r backend/requirements.txt
```

If `requirements.txt` is missing, manually install:

```sh
pip install flask flask-cors mysql-connector-python pillow pytesseract pdf2image opencv-python numpy requests python-dotenv
```

### **3️⃣ Set Up Your Google Cloud API Key**

1. Obtain your API key from **Google Cloud Console**.
2. Create a `.env` file inside the `backend/` folder:
   ```
   API_KEY=your-google-cloud-api-key
   ```
3. The backend will automatically load the API key from `.env`.

### **4️⃣ Start the Backend**

```sh
cd backend
python app.py
```

This will start the **Flask API** at `http://127.0.0.1:5000`.

### **5️⃣ Start the Frontend**

Simply open `frontend/index.html` in a browser.

---

## **API Endpoints**

### **1️⃣ Upload Invoice Image**

- **Endpoint:** `POST /upload-invoice`
- **Description:** Accepts an image or PDF, extracts text using **Google Vision OCR**, and returns structured invoice data.
- **Request Format:**
  - **Form-data:**
    - `file`: Invoice image or PDF file.
- **Response Example:**
  ```json
  {
    "status": "success",
    "extracted_data": {
      "invoice_number": "INV-12345",
      "invoice_date": "2024-01-10",
      "invoice_amount": "3450.00",
      "gst_no": "24ABCDE1234F1ZP",
      "gst_percentage": "5"
    }
  }
  ```

### **2️⃣ Save Extracted Invoice Data**

- **Endpoint:** `POST /confirm-invoice`
- **Description:** Saves extracted invoice details into **MySQL**.
- **Request Format (JSON):**
  ```json
  {
    "invoice_number": "INV-12345",
    "invoice_date": "2024-01-10",
    "invoice_amount": "3450.00",
    "gst_no": "24ABCDE1234F1ZP",
    "gst_percentage": "5"
  }
  ```
- **Response:**
  ```json
  { "status": "success", "message": "Invoice data saved successfully" }
  ```

---

## **Project Structure**

```
/Google-Vision-OCR
│── backend/
│   ├── app.py               # Main Flask API
│   ├── ocr_processor.py     # Image preprocessing & text extraction
│   ├── utils.py             # Helper functions
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # API key (not committed)
│   ├── static/              # Static assets
│   ├── templates/           # Flask templates (if needed)
│   ├── uploads/             # Temporary storage for uploaded invoices
│── frontend/
│   ├── index.html           # Basic UI for uploading invoices
│   ├── script.js            # Handles API calls to backend
│   ├── styles.css           # Basic styling
│── .gitignore               # Ensures API key & sensitive files aren't committed
│── README.md                # Project documentation
│── LICENSE                  # MIT License (allows open-source usage)
```

---

## **Deployment Instructions**

If deploying on **Heroku, Vercel, or AWS**, set up **environment variables** instead of a `.env` file.

Example for **Heroku**:

```sh
heroku config:set API_KEY=your-google-cloud-api-key
```

Then start the Flask server:

```sh
gunicorn backend.app:app
```

---

## **Security Considerations**

- **Never expose your API key** in frontend code or public repositories.
- Use `.gitignore` to prevent committing `.env`:
  ```
  .env
  ```
- Rotate API keys periodically to prevent misuse.

---

## **License**

This project is licensed under the **MIT License**, allowing free use, modification, and distribution with attribution.

---

## **Contributing**

Feel free to contribute by:

- Improving OCR accuracy (e.g., better regex patterns).
- Adding support for more invoice formats.
- Enhancing the frontend UI.

---

## **Acknowledgments**

This project is based on Google Vision API and various open-source tools like **Tesseract OCR**, **Flask**, and **OpenCV**.

---
