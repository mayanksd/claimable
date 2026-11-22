"""Builds the FICTIONAL sample policies (Aarogya is a made-up insurer; every person is made up too).

Run: python3 scripts/make-sample-pdf.py   (writes demo/aarogya-policy.pdf, demo/sample-arjun.pdf, demo/sample-priya.pdf)
Then copy them to public/demo/ and regenerate the fixtures:
  OUT=demo/redacted-policy.json npm run check:redact
  OUT=demo/redacted-arjun.json npm run check:redact -- demo/sample-arjun.pdf
  OUT=demo/redacted-priya.json npm run check:redact -- demo/sample-priya.pdf
Same insurer and benefits in all three; only the person and their policy / member numbers differ.
Each line is drawn as one text line so unpdf extracts it the same way (tables come out flattened).
"""
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

FONT, BOLD, SIZE = "Helvetica", "Helvetica-Bold", 8.4
W, H = A4
LEFT, RIGHT, TOP = 36, 36, 40
HEADER = [
    "Aarogya General Insurance Co. Ltd. (FICTIONAL - for demo use only). Regd. Office: 4th Floor, Example Towers, Mumbai 400001.",
    "UIN: AAGHLIP00000V012526. 24x7 Toll-free: 1800 000 1234. Email: care@aarogya-example.in",
]

PAGES = [
    [
        "#Aarogya Shield Premier - Policy Schedule",
        "Insurance is the subject matter of the solicitation. Please read the policy wording carefully.",
        "This is a FICTIONAL sample document created for a hackathon demo.",
        "#Field Details",
        "Policy No. {policy_no}",
        "Policyholder {title} {name}",
        "Address {address}",
        "Mobile / Email {mobile} / {email}",
        "PAN {pan}",
        "Product Aarogya Shield Premier (Individual)",
        "Policy period 01/01/2026 00:00 hrs to 31/12/2028 23:59 hrs",
        "Policy tenure 3 years",
        "Premium zone Zone B",
        "Sum Insured Rs. 30,00,000",
        "Gross premium (3 years, incl. GST) Rs. 57,600 (Rs. 19,200 per policy year)",
        "Claims administrator Aarogya Health Claims Unit, Hyderabad",
        "Intermediary DIRECT",
        "#Insured person",
        "Member ID Name DOB Age Gender Relationship Sum Insured Nominee",
        "{member_id} {name} {dob} {age} {gender} Self Rs. 30,00,000 {nominee}",
    ],
    [
        "#Benefits table",
        "Cover Limit Notes",
        "In-patient treatment Up to Sum Insured Hospitalisation of 24 hours or more",
        "Pre-hospitalisation / Post-hospitalisation 60 days / 90 days Medical expenses before and after admission",
        "Day care procedures Up to Sum Insured All listed day care treatments",
        "Room rent Up to 1% of Sum Insured per day (Rs. 30,000) Proportionate deduction applies if a higher room category is chosen",
        "ICU charges Up to 2% of Sum Insured per day",
        "Road ambulance Up to Rs. 3,000 per hospitalisation",
        "Emergency air ambulance Up to Rs. 2,50,000 per policy year Life-threatening emergency only, pre-approval required",
        "OPD treatment Up to Rs. 5,000 per policy year Consultations, diagnostics, prescribed medicines, including plaster/splint",
        "without admission. Reimbursement basis",
        "OPD dental treatment Up to Rs. 10,000 per policy year Extraction, fillings, root canal, scaling. Cosmetic dentistry excluded.",
        "Reimbursement basis",
        "Annual preventive health check-up Up to 1% of Sum Insured (Rs. 30,000) once per policy year Reimbursement at any",
        "accredited lab or diagnostic centre (NABL / NABH / CAP)",
        "Spectacles / contact lenses Up to Rs. 2,000 per policy year With a prescription from an optometrist",
        "Hearing aid 50% of cost, up to Rs. 10,000 per policy Prescribed by an ENT specialist",
        "Teleconsultation Unlimited General physician and specialists, via app 24x7",
        "Second opinion Covered For listed major illnesses",
        "Restore benefit 100% of Sum Insured once per policy year Unrelated illness",
        "Daily cash for shared room Rs. 1,000 per day, max Rs. 7,000 per hospitalisation If you choose a shared room",
        "Maternity Not covered",
        "Global cover Not covered Treatment outside India excluded",
        "#Preventive health check-up: scope",
        "Covered within the yearly limit: blood and urine tests, ECG, and imaging and advanced screening (for example MRI,",
        "low-dose CT, DEXA and advanced biomarkers) at an accredited lab or diagnostic centre.",
        "Genetic tests are covered only when prescribed by a registered medical practitioner for a medical reason. Wellness or",
        "lifestyle genetic tests without a prescription are not covered.",
        "The check-up is reimbursement only: pay the lab, then claim with the bill and test reports.",
    ],
    [
        "#Wellness and rewards programme",
        "1. Aarogya StepUp: earn 1 StepUp coin for every 10 steps above 3,000 steps a day, synced through the Aarogya app",
        "(max 1,000 coins a day). Coins can be redeemed in the in-app rewards store for fitness and health products.",
        "Coins expire 12 months after they are earned.",
        "2. Renewal discount: 10% premium discount at renewal if the insured averages 8,000 steps a day over the policy year.",
        "3. Discounts on partner services: up to 20% off at partner gyms, pharmacies and diagnostic centres listed in the app.",
        "4. Health condition management: diet and weight management programme; stress management programme, both free via app.",
        "#How to claim",
        "Cashless: available only at network hospitals. Check the network hospital list in the Aarogya app or on the website,",
        "or call 1800 000 1234. Intimate us at least 48 hours before a planned admission and within 24 hours of an emergency",
        "admission. Show your e-card at the hospital insurance desk.",
        "Reimbursement: submit the claim form, original bills, prescriptions and discharge summary within 30 days of discharge",
        "to claims@aarogya-example.in or via the app. OPD, OPD dental and spectacles claims are reimbursement only.",
        "Health check-up claims: submit the lab bill and test reports within 30 days of the test date via the app or to",
        "claims@aarogya-example.in. For a prescribed genetic test, also attach the doctor's prescription.",
        "#Important contacts",
        "Purpose Contact",
        "24x7 helpline (cashless approval, emergencies) 1800 000 1234",
        "Senior citizen helpline 1800 000 5678",
        "Claims email claims@aarogya-example.in",
        "Air ambulance desk 1800 000 9111",
        "Grievance officer grievance@aarogya-example.in",
    ],
    [
        "#Waiting periods and key exclusions",
        "Item Waiting period / condition",
        "Initial waiting period 30 days from policy start (except accidents)",
        "Specified illnesses (cataract, hernia, joint replacement, kidney stones and others) 24 months",
        "Pre-existing diseases 36 months",
        "OPD dental 90 days from policy start",
        "Bariatric surgery 36 months, BMI 40 or more",
        "Key exclusions: cosmetic or aesthetic treatment; spectacles beyond the stated limit; treatment outside India;",
        "maternity and newborn expenses; self-inflicted injury; injuries from adventure sports; experimental treatments;",
        "non-medical items such as gloves, masks and toiletries above Rs. 2,000 per hospitalisation.",
        "Co-payment: 20% co-payment applies on each claim if treatment is taken in a Zone A city (Mumbai, Delhi NCR) while the",
        "premium is paid for Zone B.",
        "Policy limits stated 'per policy' apply once across the full policy tenure unless stated as 'per policy year'.",
    ],
]


PEOPLE = {
    "demo/aarogya-policy.pdf": dict(
        policy_no="AGI-7781-2290-00", title="Mr", name="ROHAN MEHTA",
        address="Flat 302, Sunrise Residency, 12th Main, Indiranagar, Bengaluru 560038",
        mobile="9876543210", email="rohan.mehta@example.com", pan="ABCDE1234F",
        member_id="AGI-M-551902", dob="14/03/1992", age=33, gender="Male", nominee="Sunita Mehta (Mother)",
    ),
    # Age in the schedule is the age at policy start (1 Jan 2026); the app works the current age out from the DOB.
    "demo/sample-arjun.pdf": dict(
        policy_no="AGI-7781-3341-00", title="Mr", name="ARJUN RAO",
        address="Flat 104, Palm Grove Apartments, 5th Cross, HSR Layout, Bengaluru 560102",
        mobile="9812345670", email="arjun.rao@example.com", pan="BCDEF2345G",
        member_id="AGI-M-562114", dob="02/02/1999", age=26, gender="Male", nominee="Lakshmi Rao (Mother)",
    ),
    "demo/sample-priya.pdf": dict(
        policy_no="AGI-7781-4412-00", title="Ms", name="PRIYA NAIR",
        address="No. 21, Lake View Layout, 2nd Stage, Jayanagar, Bengaluru 560011",
        mobile="9845012345", email="priya.nair@example.com", pan="CDEFG3456H",
        member_id="AGI-M-573226", dob="18/06/1995", age=30, gender="Female", nominee="Anil Nair (Father)",
    ),
}


def main(path, person):
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle("Aarogya Shield Premier - Policy Schedule (FICTIONAL sample)")
    c.setAuthor("Claimable demo")
    for n, lines in enumerate(PAGES, start=1):
        y = H - TOP
        c.setFont(FONT, 7.2)
        for h in HEADER:
            c.drawString(LEFT, y, h)
            y -= 10
        c.drawString(LEFT, y, f"Policy No. {person['policy_no']} Page No. {n}")
        y -= 20
        for line in lines:
            bold = line.startswith("#")
            text = (line[1:] if bold else line).format(**person)
            font, size = (BOLD, SIZE + 2) if bold else (FONT, SIZE)
            if stringWidth(text, font, size) > W - LEFT - RIGHT:
                raise SystemExit(f"line too wide on page {n}: {text}")
            if bold:
                y -= 6
            c.setFont(font, size)
            c.drawString(LEFT, y, text)
            y -= size + (6 if bold else 4.5)
        c.showPage()
    c.save()
    print("wrote", path)


if __name__ == "__main__":
    for out, person in PEOPLE.items():
        main(out, person)
