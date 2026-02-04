import pandas as pd
import json

COLUMN_MAP = {
    "Username": "username",
    "User Status": "status",

    "Business Name": "business.name",
    "Doing Business As": "business.doing_business_as",
    "Business Category": "business.category",
    "If you are a Health & Safety business, what is your specialty": "business.specialty",
    "Business Website": "business.website",
    "Year Business was incorporated": "business.year_incorporated",

    "Business License Issuer": "business.license.issuer",
    "Business License Number": "business.license.number",

    "Primary Contact First Name": "contacts.primary.first_name",
    "Primary Contact Last Name": "contacts.primary.last_name",
    "Mobile Number": "contacts.primary.mobile",
    "Phone number": "contacts.primary.phone",
    "Preferred language": "contacts.primary.language",

    "PO First Name": "contacts.po.first_name",
    "PO Last Name": "contacts.po.last_name",
    "PO Phone Number": "contacts.po.phone",

    "Street": "address.street",
    "City": "address.city",
    "Province": "address.province",
    "Postal": "address.postal",

    "Mailing Address": "address.mailing.street",
    "Mailing City": "address.mailing.city",
    "Mailing Province": "address.mailing.province",
    "Mailing Postal": "address.mailing.postal",
    "Same as above": "address.mailing.same_as_physical",

    "Counties": "operations.counties",
    "Languages": "operations.languages",
    "Multiple Office Locations": "operations.multiple_offices",
    "Number of employees": "operations.employee_count",
    "Primary Program Measures": "operations.program_measures",
    "Retrofit enabling measures": "operations.retrofit_measures",

    "Review Comments": "review.comments",
    "Reviewed By": "review.reviewed_by",

    "Unique Code": "metadata.unique_code",
}

def set_nested(d, path, value):
    keys = path.split(".")
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    d[keys[-1]] = value

def normalize_value(key, value):
    if pd.isna(value):
        return None

    # comma-separated lists
    if key in {
        "operations.counties",
        "operations.languages",
        "operations.program_measures",
        "operations.retrofit_measures"
    }:
        return [v.strip() for v in str(value).split(",") if v.strip()]

    # booleans
    if key in {
        "operations.multiple_offices",
        "address.mailing.same_as_physical"
    }:
        return str(value).lower() in ("yes", "true", "1")

    # integers
    if key in {
        "operations.employee_count",
        "business.year_incorporated"
    }:
        try:
            return int(value)
        except ValueError:
            return None

    return value

# Load Excel
df = pd.read_excel("esp_contractor_data.xlsx")
df = df.dropna(how="all")

records = []

for _, row in df.iterrows():
    obj = {}
    for excel_col, json_path in COLUMN_MAP.items():
        if excel_col in row:
            val = normalize_value(json_path, row[excel_col])
            if val is not None:
                set_nested(obj, json_path, val)
    records.append(obj)

with open("output.json", "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(records)} records")