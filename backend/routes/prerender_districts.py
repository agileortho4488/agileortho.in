"""District data for server-side prerendering fallback."""

DISTRICTS = {
    "hyderabad": {
        "name": "Hyderabad", "population": "1.0 Cr+",
        "description": "Hyderabad is the capital city and largest healthcare market in Telangana, home to world-class hospitals including NIMS, Osmania General Hospital, Gandhi Hospital, Apollo, KIMS, Yashoda, and Continental.",
        "hospitals": ["NIMS", "Osmania General Hospital", "Gandhi Hospital", "Apollo Hospitals", "KIMS Hospital", "Yashoda Hospital", "Continental Hospitals", "AIG Hospitals", "Sunshine Hospital"],
        "medicalFocus": ["Joint Replacement", "Trauma", "Sports Medicine", "Cardiovascular", "Diagnostics", "Endo-surgical", "Robotics"],
    },
    "rangareddy": {
        "name": "Rangareddy", "population": "58 Lakh+",
        "description": "Rangareddy district, surrounding Hyderabad, has rapidly growing healthcare infrastructure with major hospitals in Shamshabad, LB Nagar, and Shadnagar.",
        "hospitals": ["Aware Global Hospital", "Paras HMRI Hospital", "Kamineni Hospital", "District Hospital Shadnagar"],
        "medicalFocus": ["Trauma", "Diagnostics", "Infection Prevention", "Endo-surgical"],
    },
    "warangal": {
        "name": "Warangal", "population": "8 Lakh+",
        "description": "Warangal is the second-largest city in Telangana and the primary healthcare hub for the northern districts.",
        "hospitals": ["MGM Hospital", "Kakatiya Medical College", "Star Hospital Warangal", "Anu Hospital"],
        "medicalFocus": ["Trauma", "Cardiovascular", "Endo-surgical", "Diagnostics"],
    },
    "karimnagar": {
        "name": "Karimnagar", "population": "11 Lakh+",
        "description": "Karimnagar is a major healthcare center in northern Telangana with a government general hospital and growing private infrastructure.",
        "hospitals": ["Government General Hospital Karimnagar", "Chalmeda Anand Rao Institute", "Aditya Hospital"],
        "medicalFocus": ["Trauma", "Cardiovascular", "Diagnostics"],
    },
    "khammam": {
        "name": "Khammam", "population": "15 Lakh+",
        "description": "Khammam is the primary healthcare hub for eastern Telangana, serving a large catchment area including bordering Andhra Pradesh districts.",
        "hospitals": ["Government General Hospital Khammam", "Mamata Medical College", "SRR Hospital"],
        "medicalFocus": ["Trauma", "Diagnostics", "Critical Care"],
    },
    "nizamabad": {
        "name": "Nizamabad", "population": "16 Lakh+",
        "description": "Nizamabad is the primary healthcare center for northwestern Telangana with government and private hospitals.",
        "hospitals": ["Government General Hospital Nizamabad", "Deccan Hospital", "Sri Sai Hospital"],
        "medicalFocus": ["Trauma", "Diagnostics", "Infection Prevention"],
    },
    "nalgonda": {
        "name": "Nalgonda", "population": "17 Lakh+",
        "description": "Nalgonda, a major district in central Telangana, has a large network of government and private hospitals.",
        "hospitals": ["Government General Hospital Nalgonda", "District Hospital Miryalaguda", "Swarna Hospital"],
        "medicalFocus": ["Trauma", "Diagnostics", "Infection Prevention"],
    },
    "mahbubnagar": {
        "name": "Mahbubnagar", "population": "14 Lakh+",
        "description": "Mahbubnagar is an important healthcare hub for southern Telangana, with growing hospital infrastructure.",
        "hospitals": ["Government General Hospital Mahbubnagar", "District Hospital", "SVS Hospital"],
        "medicalFocus": ["Trauma", "Diagnostics", "Critical Care"],
    },
    "adilabad": {
        "name": "Adilabad", "population": "7 Lakh+",
        "description": "Adilabad in northern Telangana serves a tribal healthcare region with growing demand for medical devices.",
        "hospitals": ["RIMS Adilabad", "District Hospital Adilabad"],
        "medicalFocus": ["Trauma", "Diagnostics"],
    },
}


def get_district_data(slug):
    return DISTRICTS.get(slug)
