from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import mysql.connector
import re
import io
from datetime import datetime
from pdf2image import convert_from_bytes
import base64

app = Flask(__name__)


# Allow frontend to communicate with backend
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:5500"}}, supports_credentials=True)

# CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# REPLACE THIS WITH YOUR GOOGLE CLOUD API KEY
GOOGLE_CLOUD_VISION_API_KEY = ""
GOOGLE_VISION_URL = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_CLOUD_VISION_API_KEY}"

# MySQL connection
def connect_db():
    return mysql.connector.connect(
        host="",
        user="",
        password="",
        database=""
    )

# Convert text to a proper date format
def parse_date(raw_date):
    possible_formats = ["%d-%m-%y", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d"]
    for fmt in possible_formats:
        try:
            return datetime.strptime(raw_date, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None

# Format extracted amount values
def format_amount(amount_str):
    try:
        return float(amount_str.replace(",", "").replace("$", ""))
    except ValueError:
        return None

# Function to call Google Vision API using API Key
def extract_text_from_google_vision(image_bytes):
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    request_payload = {
        "requests": [
            {
                "image": {"content": image_base64},
                "features": [{"type": "TEXT_DETECTION"}]
            }
        ]
    }

    response = requests.post(GOOGLE_VISION_URL, json=request_payload)

    if response.status_code == 200:
        data = response.json()
        if "responses" in data and "textAnnotations" in data["responses"][0]:
            return data["responses"][0]["textAnnotations"][0]["description"]
    
    return ""

@app.route("/upload-invoice", methods=["POST"])
def upload_invoice():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    doc_type = request.form.get("doc_type", "invoice").lower()
    doc_style = request.form.get("doc_style", "digital").lower()
    file = request.files["file"]
    filename = file.filename.lower()

    extracted_text = ""

    try:
        if filename.endswith(".pdf"):
            pages = convert_from_bytes(file.read())
            for page in pages:
                img_bytes = io.BytesIO()
                page.save(img_bytes, format="PNG")
                img_bytes = img_bytes.getvalue()
                extracted_text += extract_text_from_google_vision(img_bytes) + "\n"
        else:
            img_bytes = file.read()
            extracted_text = extract_text_from_google_vision(img_bytes)
    except Exception as e:
        return jsonify({"error": f"Error processing file: {str(e)}"}), 500

    # Debugging
    print("OCR Extracted Text:\n", extracted_text)

    # ---------------------------
    # Regex Patterns for Key Fields
    # ---------------------------

    # Invoice Date
    date_match = re.search(r'(?:Date|Dt)\s*[:\-]?\s*([\d/\-\.]+)', extracted_text, re.IGNORECASE)

    # Total Amount
    total_match = re.search(r'(?:Total Amount|Total Due|Amount Payable|Net\s+Payable)\s*[:\-]?\s*\$?([\d,\.]+)', extracted_text, re.IGNORECASE)

    # Invoice/Bill Number
    invoice_number_match = re.search(r'(?:Bill\s*No|Invoice\s*(?:No\.?|Number|ID|#))\s*[:\-]?\s*([A-Za-z0-9-]+)', extracted_text, re.IGNORECASE)

    # GST Number
    gst_no_match = re.search(r'(?:GST\s*No\s*[:\-]?\s*)([A-Za-z0-9]+)', extracted_text, re.IGNORECASE)

    # GST Percentage
    gst_percentage_match = re.search(r'(\d+)%\s*GST', extracted_text, re.IGNORECASE)
    if not gst_percentage_match:
        gst_percentage_match = re.search(r'GST\s*(\d+)%', extracted_text, re.IGNORECASE)

    # ---------------------------
    # Extract Itemized Data
    # ---------------------------

    item_pattern = re.findall(r'([\w\s]+)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})', extracted_text)

    items = []
    for match in item_pattern:
        item_name, quantity, rate, amount = match
        items.append({
            "name": item_name.strip(),
            "quantity": int(quantity),
            "rate": float(rate.replace(",", "")),
            "amount": float(amount.replace(",", ""))
        })

    # ---------------------------
    # Extract & Format Data
    # ---------------------------

    raw_date = date_match.group(1) if date_match else None
    parsed_date = parse_date(raw_date) if raw_date else None

    raw_total = total_match.group(1) if total_match else None
    parsed_total = format_amount(raw_total) if raw_total else None

    invoice_number = invoice_number_match.group(1) if invoice_number_match else None
    gst_no = gst_no_match.group(1) if gst_no_match else None
    gst_percentage = gst_percentage_match.group(1) if gst_percentage_match else None

    extracted_data = {
        "invoice_number": invoice_number,
        "invoice_date": parsed_date,
        "invoice_amount": parsed_total,
        "gst_no": gst_no if gst_no else "",
        "gst_percentage": gst_percentage,
        "items": items,  # Send extracted items to frontend
        "doc_type": doc_type,
        "doc_style": doc_style
    }

    return jsonify({"status": "success", "extracted_data": extracted_data})

# Route to confirm invoice data and store it in MySQL
@app.route("/confirm-invoice", methods=["POST"])
def confirm_invoice():
    data = request.json

    conn = connect_db()
    cursor = conn.cursor()

    # Insert Invoice Details
    invoice_query = """
    INSERT INTO invoice_data (invoice_number, invoice_date, invoice_amount, gst_no, gst_percentage)
    VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(
        invoice_query,
        (data["invoice_number"], data["invoice_date"], data["invoice_amount"], data["gst_no"], data["gst_percentage"])
    )
    
    invoice_id = cursor.lastrowid  # Get the inserted invoice ID

    # Insert Item Details
    item_query = """
    INSERT INTO invoice_items (invoice_id, item_name, quantity, rate, amount)
    VALUES (%s, %s, %s, %s, %s)
    """
    
    for item in data["items"]:
        cursor.execute(item_query, (invoice_id, item["name"], item["quantity"], item["rate"], item["amount"]))

    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Invoice and items saved successfully"})

if __name__ == "__main__":
    app.run(debug=True)
