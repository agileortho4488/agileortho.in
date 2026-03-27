"""
Semantic Intelligence Layer — Seed + Enrichment Pipeline
Seeds brand_system_intelligence, family_relationships, semantic_rules
Then runs enrichment across ALL catalog_products
"""
import asyncio
import os
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

NOW = datetime.now(timezone.utc)

# ─── Collections ───
bsi_col = db["brand_system_intelligence"]
fr_col = db["family_relationships"]
sr_col = db["semantic_rules"]
cp_col = db["catalog_products"]
cs_col = db["catalog_skus"]


# ════════════════════════════════════════════════════════════
# 1) BRAND SYSTEM INTELLIGENCE SEED
# ════════════════════════════════════════════════════════════

BRAND_SYSTEMS = [
    {
        "entity_code": "ARMAR",
        "entity_name": "ARMAR",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Trauma",
        "category_bias": ["Plating Systems", "Screws"],
        "implant_class_bias": ["plates", "locking_screws"],
        "system_type": "plate_system",
        "material_default": "Titanium",
        "material_allowed": ["Titanium", "Titanium Alloy", "Ti-6Al-7Nb"],
        "coating_default": None,
        "technology_tags": ["LPS", "locking plate system"],
        "commercial_meaning": "Titanium plating system line for trauma fixation",
        "clinical_meaning": "Low Profile System titanium plates for fracture fixation across upper and lower limb anatomy",
        "common_use_cases": ["trauma plating", "upper limb fixation", "lower limb fixation"],
        "anatomy_scope": ["humerus", "radius", "ulna", "tibia", "femur", "calcaneus", "clavicle"],
        "known_aliases": ["Armar", "ARMAR Titanium Plates", "Armar Titanium LPS Plates"],
        "related_entities": [
            {"entity_code": "AURIC", "relationship": "premium_coated_variant_of_same_plate_family"},
            {"entity_code": "MBOSS", "relationship": "associated_screw_family"},
        ],
        "confidence": 0.95,
    },
    {
        "entity_code": "AURIC",
        "entity_name": "AURIC",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Trauma",
        "category_bias": ["Plating Systems"],
        "implant_class_bias": ["plates", "locking_screws"],
        "system_type": "plate_system",
        "material_default": "Titanium",
        "material_allowed": ["Titanium", "Titanium Alloy"],
        "coating_default": "TiNbN",
        "technology_tags": ["LPS", "Bionik Gold Surface", "TiNbN coating"],
        "commercial_meaning": "Premium gold-coated titanium plating system line (Bionik Gold Surface / TiNbN coating)",
        "clinical_meaning": "Coated titanium plates with enhanced biocompatibility and reduced metal ion release via TiNbN coating",
        "common_use_cases": ["trauma plating", "premium implant option"],
        "anatomy_scope": ["humerus", "radius", "ulna", "tibia", "femur", "calcaneus", "olecranon"],
        "known_aliases": ["Auric", "AURIC Titanium Plates", "Bionik Gold"],
        "related_entities": [
            {"entity_code": "ARMAR", "relationship": "base_uncoated_variant"},
            {"entity_code": "MBOSS", "relationship": "associated_screw_family"},
        ],
        "confidence": 0.97,
    },
    {
        "entity_code": "KET",
        "entity_name": "KET",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Trauma",
        "category_bias": ["Plating Systems", "Fixation Devices"],
        "implant_class_bias": ["plates", "screws"],
        "system_type": "plate_system",
        "material_default": "Stainless Steel",
        "material_allowed": ["Stainless Steel", "SS", "316L SS"],
        "coating_default": None,
        "technology_tags": ["stainless steel fixation"],
        "commercial_meaning": "Stainless steel fixation and plating system line",
        "clinical_meaning": "Stainless steel trauma fixation system for cost-effective fracture management",
        "common_use_cases": ["trauma plating", "economical fixation"],
        "anatomy_scope": ["femur", "tibia", "humerus", "radius", "ulna"],
        "known_aliases": ["Ket", "KET SS", "KET Stainless Steel"],
        "related_entities": [
            {"entity_code": "ARMAR", "relationship": "titanium_alternative"},
        ],
        "confidence": 0.95,
    },
    {
        "entity_code": "CLAVO",
        "entity_name": "CLAVO",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Trauma",
        "category_bias": ["Nailing Systems", "Intramedullary Nails"],
        "implant_class_bias": ["intramedullary_nails", "elastic_nails"],
        "system_type": "nail_system",
        "material_default": "Titanium",
        "material_allowed": ["Titanium", "Titanium Alloy", "Ti-6Al-4V"],
        "coating_default": None,
        "technology_tags": ["intramedullary nailing", "PFRN", "PFIN"],
        "commercial_meaning": "Intramedullary nailing system line for long bone fractures",
        "clinical_meaning": "Titanium nailing systems for femoral, tibial, and other long bone fracture fixation",
        "common_use_cases": ["femur nailing", "tibia nailing", "hip nailing", "pediatric elastic nailing"],
        "anatomy_scope": ["femur", "tibia", "humerus"],
        "known_aliases": ["Clavo", "CLAVO Nailing System", "CLAVO PFRN", "CLAVO PFIN"],
        "related_entities": [
            {"entity_code": "MBOSS", "relationship": "associated_screw_family"},
        ],
        "confidence": 0.98,
    },
    {
        "entity_code": "MBOSS",
        "entity_name": "MBOSS",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Trauma",
        "category_bias": ["Screws", "Locking Screws", "Cortical Screws", "Cancellous Screws"],
        "implant_class_bias": ["screws", "locking_screws", "cortical_screws", "cancellous_screws"],
        "system_type": "screw_system",
        "material_default": "Titanium",
        "material_allowed": ["Titanium", "Stainless Steel"],
        "coating_default": None,
        "technology_tags": ["self-tapping", "locking", "cortical", "cancellous"],
        "commercial_meaning": "Screw family used with ARMAR/AURIC plate systems and CLAVO nail systems",
        "clinical_meaning": "Locking, cortical, and cancellous screws for trauma fixation — compatible with Meril plate and nail systems",
        "common_use_cases": ["plate fixation screws", "nail locking screws", "standalone screw fixation"],
        "anatomy_scope": [],
        "known_aliases": ["Mboss", "MBOSS Screws"],
        "related_entities": [
            {"entity_code": "ARMAR", "relationship": "used_with_plate_system"},
            {"entity_code": "AURIC", "relationship": "used_with_plate_system"},
            {"entity_code": "CLAVO", "relationship": "used_with_nail_system"},
        ],
        "confidence": 0.96,
    },
    {
        "entity_code": "MIRUS",
        "entity_name": "MIRUS",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Endo Surgery",
        "category_bias": ["Staplers", "Cutters", "Trocars"],
        "implant_class_bias": ["staplers", "cutters", "trocars"],
        "system_type": "stapler_system",
        "material_default": None,
        "material_allowed": [],
        "coating_default": None,
        "technology_tags": ["endoscopic", "laparoscopic", "minimal access"],
        "commercial_meaning": "Endoscopic/laparoscopic surgical stapler and instrument line",
        "clinical_meaning": "Surgical staplers, cutters, and access devices for minimally invasive surgery",
        "common_use_cases": ["laparoscopic surgery", "endoscopic stapling", "tissue cutting"],
        "anatomy_scope": [],
        "known_aliases": ["Mirus", "MIRUS Staplers"],
        "related_entities": [],
        "confidence": 0.95,
    },
    {
        "entity_code": "BIOMIME",
        "entity_name": "BioMime",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Cardiovascular",
        "category_bias": ["Coronary Stents", "Drug Eluting Stents"],
        "implant_class_bias": ["stents", "coronary_stents"],
        "system_type": "stent_system",
        "material_default": "Cobalt Chromium",
        "material_allowed": ["Cobalt Chromium", "CoCr"],
        "coating_default": "Sirolimus",
        "technology_tags": ["sirolimus eluting", "DES", "coronary intervention"],
        "commercial_meaning": "Sirolimus-eluting coronary stent system for percutaneous coronary intervention",
        "clinical_meaning": "Drug-eluting stent platform for coronary artery disease treatment",
        "common_use_cases": ["coronary stenting", "PCI", "coronary intervention"],
        "anatomy_scope": ["coronary arteries"],
        "known_aliases": ["Biomime", "BioMime Aura", "BioMime Morph"],
        "related_entities": [
            {"entity_code": "MOZEC", "relationship": "same_division_different_platform"},
        ],
        "confidence": 0.98,
    },
    {
        "entity_code": "MOZEC",
        "entity_name": "MOZEC",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Cardiovascular",
        "category_bias": ["Peripheral Stents", "Vascular Devices"],
        "implant_class_bias": ["stents", "peripheral_stents"],
        "system_type": "stent_system",
        "material_default": "Nitinol",
        "material_allowed": ["Nitinol"],
        "coating_default": None,
        "technology_tags": ["self-expanding", "peripheral", "vascular"],
        "commercial_meaning": "Peripheral vascular stent and device line",
        "clinical_meaning": "Self-expanding stent systems for peripheral vascular intervention",
        "common_use_cases": ["peripheral vascular stenting"],
        "anatomy_scope": ["peripheral arteries", "iliac", "femoral"],
        "known_aliases": ["Mozec"],
        "related_entities": [
            {"entity_code": "BIOMIME", "relationship": "same_division_different_platform"},
        ],
        "confidence": 0.90,
    },
    {
        "entity_code": "MERISCREEN",
        "entity_name": "MeriScreen",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Diagnostics",
        "category_bias": ["Rapid Diagnostic Tests", "Immunoassay Tests", "Drug of Abuse Tests"],
        "implant_class_bias": [],
        "system_type": "diagnostic_line",
        "material_default": None,
        "material_allowed": [],
        "coating_default": None,
        "technology_tags": ["rapid test", "lateral flow", "immunochromatographic"],
        "commercial_meaning": "Rapid diagnostic test kit line for infectious diseases, drug screening, and biomarkers",
        "clinical_meaning": "Point-of-care rapid test kits for HIV, Syphilis, HBV, HCV, Dengue, Malaria, Drug of Abuse screening",
        "common_use_cases": ["infectious disease screening", "drug of abuse testing", "pregnancy testing", "cardiac markers"],
        "anatomy_scope": [],
        "known_aliases": ["Meriscreen", "MERISCREEN", "Meril Rapid Tests"],
        "related_entities": [
            {"entity_code": "MERISERA", "relationship": "same_division_different_platform"},
        ],
        "confidence": 0.97,
    },
    {
        "entity_code": "MERISERA",
        "entity_name": "MeriSera",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Diagnostics",
        "category_bias": ["Blood Grouping Reagents", "Serology"],
        "implant_class_bias": [],
        "system_type": "reagent_line",
        "material_default": None,
        "material_allowed": [],
        "coating_default": None,
        "technology_tags": ["blood grouping", "serology", "monoclonal"],
        "commercial_meaning": "Blood grouping and serology reagent line",
        "clinical_meaning": "Monoclonal blood grouping reagents for ABO/Rh typing and compatibility testing",
        "common_use_cases": ["blood grouping", "crossmatching", "antibody screening"],
        "anatomy_scope": [],
        "known_aliases": ["Merisera", "MERISERA", "Meril Blood Grouping"],
        "related_entities": [
            {"entity_code": "MERISCREEN", "relationship": "same_division_different_platform"},
        ],
        "confidence": 0.95,
    },
    {
        "entity_code": "AUTOQUANT",
        "entity_name": "AutoQuant",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Diagnostics",
        "category_bias": ["Biochemistry Reagents", "Clinical Chemistry"],
        "implant_class_bias": [],
        "system_type": "reagent_line",
        "material_default": None,
        "material_allowed": [],
        "coating_default": None,
        "technology_tags": ["biochemistry", "clinical chemistry", "automated analyzer"],
        "commercial_meaning": "Biochemistry and clinical chemistry reagent line for automated analyzers",
        "clinical_meaning": "Diagnostic reagents for liver, kidney, cardiac, lipid, and metabolic panel testing",
        "common_use_cases": ["biochemistry panel", "liver function", "renal function", "lipid profile"],
        "anatomy_scope": [],
        "known_aliases": ["Autoquant", "AUTOQUANT", "Meril Biochemistry"],
        "related_entities": [],
        "confidence": 0.95,
    },
    {
        "entity_code": "DESTIKNEE",
        "entity_name": "Destiknee",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Joint Replacement",
        "category_bias": ["Total Knee Replacement"],
        "implant_class_bias": ["knee_implants", "tibial_components", "femoral_components"],
        "system_type": "joint_system",
        "material_default": "Cobalt Chromium",
        "material_allowed": ["Cobalt Chromium", "UHMWPE", "Titanium"],
        "coating_default": None,
        "technology_tags": ["total knee", "cruciate retaining", "posterior stabilized"],
        "commercial_meaning": "Total knee replacement system",
        "clinical_meaning": "Primary total knee arthroplasty system with femoral, tibial, and patellar components",
        "common_use_cases": ["total knee replacement", "TKR"],
        "anatomy_scope": ["knee"],
        "known_aliases": ["DestiKnee", "DESTIKNEE"],
        "related_entities": [],
        "confidence": 0.95,
    },
    {
        "entity_code": "FREEDOM",
        "entity_name": "Freedom Knee",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Joint Replacement",
        "category_bias": ["Total Knee Replacement", "Tibial Inserts"],
        "implant_class_bias": ["knee_implants", "tibial_inserts"],
        "system_type": "joint_system",
        "material_default": "UHMWPE",
        "material_allowed": ["UHMWPE", "Cobalt Chromium", "Titanium"],
        "coating_default": None,
        "technology_tags": ["total knee", "medial congruent"],
        "commercial_meaning": "Knee replacement system — tibial insert platform",
        "clinical_meaning": "Total knee arthroplasty tibial insert system with medial congruent design",
        "common_use_cases": ["total knee replacement", "tibial insert"],
        "anatomy_scope": ["knee"],
        "known_aliases": ["Freedom", "FREEDOM"],
        "related_entities": [
            {"entity_code": "DESTIKNEE", "relationship": "same_division_different_platform"},
        ],
        "confidence": 0.92,
    },
    {
        "entity_code": "BIOLOX",
        "entity_name": "BIOLOX",
        "entity_type": "brand_system",
        "parent_brand": "CeramTec / Meril",
        "division_canonical": "Joint Replacement",
        "category_bias": ["Hip Implants", "Ceramic Components"],
        "implant_class_bias": ["hip_implants", "ceramic_heads"],
        "system_type": "joint_system",
        "material_default": "Ceramic",
        "material_allowed": ["Ceramic", "Alumina", "Zirconia Toughened Alumina"],
        "coating_default": None,
        "technology_tags": ["ceramic", "femoral head", "hip replacement"],
        "commercial_meaning": "Ceramic femoral head component for hip arthroplasty",
        "clinical_meaning": "Advanced ceramic bearing surface for total hip replacement with reduced wear",
        "common_use_cases": ["hip replacement", "ceramic bearing"],
        "anatomy_scope": ["hip"],
        "known_aliases": ["Biolox", "BIOLOX OPTION"],
        "related_entities": [
            {"entity_code": "LATITUD", "relationship": "used_with_hip_system"},
        ],
        "confidence": 0.90,
    },
    {
        "entity_code": "LATITUD",
        "entity_name": "LATITUD",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Joint Replacement",
        "category_bias": ["Hip Implants"],
        "implant_class_bias": ["hip_implants", "bipolar_shells"],
        "system_type": "joint_system",
        "material_default": "Cobalt Chromium",
        "material_allowed": ["Cobalt Chromium", "Stainless Steel"],
        "coating_default": None,
        "technology_tags": ["bipolar", "monoblock", "hip replacement"],
        "commercial_meaning": "Hip replacement bipolar and monoblock shell system",
        "clinical_meaning": "Bipolar monoblock shell for hemiarthroplasty and total hip replacement",
        "common_use_cases": ["hip replacement", "hemiarthroplasty"],
        "anatomy_scope": ["hip"],
        "known_aliases": ["Latitud", "LATITUD"],
        "related_entities": [
            {"entity_code": "BIOLOX", "relationship": "used_with_ceramic_head"},
        ],
        "confidence": 0.90,
    },
    {
        "entity_code": "NEXGEN_STENT",
        "entity_name": "NexGen",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Cardiovascular",
        "category_bias": ["Coronary Stents"],
        "implant_class_bias": ["stents", "coronary_stents"],
        "system_type": "stent_system",
        "material_default": "Cobalt Chromium",
        "material_allowed": ["Cobalt Chromium"],
        "coating_default": None,
        "technology_tags": ["bare metal stent", "coronary"],
        "commercial_meaning": "Cobalt chromium coronary stent system",
        "clinical_meaning": "Bare-metal and drug-eluting coronary stent platform",
        "common_use_cases": ["coronary stenting", "PCI"],
        "anatomy_scope": ["coronary arteries"],
        "known_aliases": ["Nexgen", "NexGen Stent"],
        "related_entities": [
            {"entity_code": "BIOMIME", "relationship": "same_division_different_platform"},
        ],
        "confidence": 0.92,
    },
    {
        "entity_code": "FLOMERO",
        "entity_name": "Flomero",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Cardiovascular",
        "category_bias": ["Heart Valves", "TAVR"],
        "implant_class_bias": ["heart_valves"],
        "system_type": "valve_system",
        "material_default": "Biological Tissue",
        "material_allowed": ["Porcine Pericardium", "Bovine Pericardium"],
        "coating_default": None,
        "technology_tags": ["TAVR", "transcatheter", "aortic valve"],
        "commercial_meaning": "Transcatheter aortic valve replacement system",
        "clinical_meaning": "Biological tissue heart valve for transcatheter aortic valve implantation",
        "common_use_cases": ["TAVR", "aortic stenosis"],
        "anatomy_scope": ["heart", "aortic valve"],
        "known_aliases": ["Flomero"],
        "related_entities": [],
        "confidence": 0.88,
    },
    {
        "entity_code": "MYCLIP",
        "entity_name": "MyClip",
        "entity_type": "brand_system",
        "parent_brand": "Meril",
        "division_canonical": "Cardiovascular",
        "category_bias": ["Left Atrial Appendage Closure"],
        "implant_class_bias": ["cardiac_occluders"],
        "system_type": "consumable_line",
        "material_default": "Nitinol",
        "material_allowed": ["Nitinol"],
        "coating_default": None,
        "technology_tags": ["LAA closure", "structural heart"],
        "commercial_meaning": "Left atrial appendage closure clip system",
        "clinical_meaning": "Device for left atrial appendage occlusion to reduce stroke risk in atrial fibrillation",
        "common_use_cases": ["LAA closure", "AF stroke prevention"],
        "anatomy_scope": ["heart", "left atrial appendage"],
        "known_aliases": ["Myclip", "MYCLIP"],
        "related_entities": [],
        "confidence": 0.85,
    },
]


# ════════════════════════════════════════════════════════════
# 2) FAMILY RELATIONSHIPS SEED
# ════════════════════════════════════════════════════════════

RELATIONSHIPS = [
    {"relationship_type": "coated_variant_of", "source_entity_type": "brand_system", "source_entity_code": "AURIC", "target_entity_type": "brand_system", "target_entity_code": "ARMAR", "relationship_label": "gold_coated_plate_line_variant", "confidence": 0.95},
    {"relationship_type": "uses_screw_family", "source_entity_type": "brand_system", "source_entity_code": "ARMAR", "target_entity_type": "brand_system", "target_entity_code": "MBOSS", "relationship_label": "associated_screw_family", "confidence": 0.90},
    {"relationship_type": "uses_screw_family", "source_entity_type": "brand_system", "source_entity_code": "AURIC", "target_entity_type": "brand_system", "target_entity_code": "MBOSS", "relationship_label": "associated_screw_family", "confidence": 0.90},
    {"relationship_type": "uses_screw_family", "source_entity_type": "brand_system", "source_entity_code": "CLAVO", "target_entity_type": "brand_system", "target_entity_code": "MBOSS", "relationship_label": "nail_locking_screw_family", "confidence": 0.88},
    {"relationship_type": "belongs_to_system", "source_entity_type": "brand_system", "source_entity_code": "CLAVO", "target_entity_type": "implant_class", "target_entity_code": "intramedullary_nail", "relationship_label": "nail_system_line", "confidence": 0.98},
    {"relationship_type": "belongs_to_system", "source_entity_type": "brand_system", "source_entity_code": "ARMAR", "target_entity_type": "implant_class", "target_entity_code": "plates", "relationship_label": "plate_system_line", "confidence": 0.95},
    {"relationship_type": "belongs_to_system", "source_entity_type": "brand_system", "source_entity_code": "MIRUS", "target_entity_type": "implant_class", "target_entity_code": "staplers", "relationship_label": "stapler_system_line", "confidence": 0.95},
    {"relationship_type": "belongs_to_system", "source_entity_type": "brand_system", "source_entity_code": "MERISCREEN", "target_entity_type": "implant_class", "target_entity_code": "diagnostic_tests", "relationship_label": "rapid_diagnostic_test_line", "confidence": 0.97},
    {"relationship_type": "belongs_to_system", "source_entity_type": "brand_system", "source_entity_code": "MERISERA", "target_entity_type": "implant_class", "target_entity_code": "reagents", "relationship_label": "blood_grouping_reagent_line", "confidence": 0.95},
    {"relationship_type": "same_family_as", "source_entity_type": "brand_system", "source_entity_code": "DESTIKNEE", "target_entity_type": "brand_system", "target_entity_code": "FREEDOM", "relationship_label": "both_knee_replacement_systems", "direction": "bidirectional", "confidence": 0.85},
    {"relationship_type": "used_with_hip_system", "source_entity_type": "brand_system", "source_entity_code": "BIOLOX", "target_entity_type": "brand_system", "target_entity_code": "LATITUD", "relationship_label": "ceramic_head_with_bipolar_shell", "direction": "bidirectional", "confidence": 0.88},
]


# ════════════════════════════════════════════════════════════
# 3) SEMANTIC RULES SEED
# ════════════════════════════════════════════════════════════

RULES = [
    {"rule_code": "ARMAR_PLATE_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "eq_ci", "value": "ARMAR"}]},
     "actions": [{"set": "semantic_system_type", "value": "plate_system"}, {"set": "semantic_implant_class", "value": "plates"}, {"set": "semantic_material_default", "value": "Titanium"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "ARMAR"}],
     "explanation": "ARMAR = Meril titanium plating system line", "confidence": 0.95},

    {"rule_code": "AURIC_COATED_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "eq_ci", "value": "AURIC"}]},
     "actions": [{"set": "semantic_system_type", "value": "plate_system"}, {"set": "semantic_implant_class", "value": "plates"}, {"set": "semantic_material_default", "value": "Titanium"}, {"set": "semantic_coating_default", "value": "TiNbN"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "AURIC"}],
     "explanation": "AURIC = Meril gold-coated (TiNbN) titanium plate line", "confidence": 0.97},

    {"rule_code": "KET_SS_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "eq_ci", "value": "KET"}]},
     "actions": [{"set": "semantic_system_type", "value": "plate_system"}, {"set": "semantic_implant_class", "value": "plates"}, {"set": "semantic_material_default", "value": "Stainless Steel"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "KET"}],
     "explanation": "KET = Meril stainless steel fixation line", "confidence": 0.95},

    {"rule_code": "CLAVO_NAIL_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "eq_ci", "value": "CLAVO"}]},
     "actions": [{"set": "semantic_system_type", "value": "nail_system"}, {"set": "semantic_implant_class", "value": "intramedullary_nails"}, {"set": "semantic_material_default", "value": "Titanium"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "CLAVO"}],
     "explanation": "CLAVO = Meril intramedullary nailing system", "confidence": 0.98},

    {"rule_code": "MBOSS_SCREW_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "eq_ci", "value": "MBOSS"}]},
     "actions": [{"set": "semantic_system_type", "value": "screw_system"}, {"set": "semantic_implant_class", "value": "screws"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "MBOSS"}],
     "explanation": "MBOSS = Meril screw family for plate and nail systems", "confidence": 0.96},

    {"rule_code": "MIRUS_STAPLER_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "eq_ci", "value": "MIRUS"}]},
     "actions": [{"set": "semantic_system_type", "value": "stapler_system"}, {"set": "semantic_implant_class", "value": "staplers"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "MIRUS"}],
     "explanation": "MIRUS = Meril endo surgery stapler/cutter line", "confidence": 0.95},

    {"rule_code": "BIOMIME_STENT_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "BioMime"}]},
     "actions": [{"set": "semantic_system_type", "value": "stent_system"}, {"set": "semantic_implant_class", "value": "coronary_stents"}, {"set": "semantic_material_default", "value": "Cobalt Chromium"}, {"set": "semantic_coating_default", "value": "Sirolimus"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "BIOMIME"}],
     "explanation": "BioMime = Meril sirolimus-eluting coronary stent system", "confidence": 0.98},

    {"rule_code": "NEXGEN_STENT_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "NexGen"}]},
     "actions": [{"set": "semantic_system_type", "value": "stent_system"}, {"set": "semantic_implant_class", "value": "coronary_stents"}, {"set": "semantic_material_default", "value": "Cobalt Chromium"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "NEXGEN_STENT"}],
     "explanation": "NexGen = Meril cobalt chromium coronary stent system", "confidence": 0.92},

    {"rule_code": "MERISCREEN_DX_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "MeriScreen"}]},
     "actions": [{"set": "semantic_system_type", "value": "diagnostic_line"}, {"set": "semantic_implant_class", "value": "rapid_diagnostic_tests"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "MERISCREEN"}],
     "explanation": "MeriScreen = rapid diagnostic test line", "confidence": 0.97},

    {"rule_code": "MERISERA_REAGENT_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "MeriSera"}]},
     "actions": [{"set": "semantic_system_type", "value": "reagent_line"}, {"set": "semantic_implant_class", "value": "blood_grouping_reagents"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "MERISERA"}],
     "explanation": "MeriSera = blood grouping reagent line", "confidence": 0.95},

    {"rule_code": "AUTOQUANT_REAGENT_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "AutoQuant"}]},
     "actions": [{"set": "semantic_system_type", "value": "reagent_line"}, {"set": "semantic_implant_class", "value": "biochemistry_reagents"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "AUTOQUANT"}],
     "explanation": "AutoQuant = biochemistry/clinical chemistry reagent line", "confidence": 0.95},

    {"rule_code": "DESTIKNEE_JOINT_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "Destiknee"}]},
     "actions": [{"set": "semantic_system_type", "value": "joint_system"}, {"set": "semantic_implant_class", "value": "knee_implants"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "DESTIKNEE"}],
     "explanation": "Destiknee = total knee replacement system", "confidence": 0.95},

    {"rule_code": "FREEDOM_JOINT_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "Freedom"}]},
     "actions": [{"set": "semantic_system_type", "value": "joint_system"}, {"set": "semantic_implant_class", "value": "knee_implants"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "FREEDOM"}],
     "explanation": "Freedom Knee = knee replacement tibial insert system", "confidence": 0.92},

    {"rule_code": "FLOMERO_VALVE_001", "priority": 10, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "brand", "operator": "contains_ci", "value": "Flomero"}]},
     "actions": [{"set": "semantic_system_type", "value": "valve_system"}, {"set": "semantic_implant_class", "value": "heart_valves"}, {"set": "semantic_parent_brand", "value": "Meril"}, {"set": "semantic_brand_system", "value": "FLOMERO"}],
     "explanation": "Flomero = TAVR heart valve system", "confidence": 0.88},

    # Brand match by product name patterns (for products where brand field may not match)
    {"rule_code": "PFRN_CLAVO_001", "priority": 5, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "product_name", "operator": "contains_ci", "value": "PFRN"}]},
     "actions": [{"set": "semantic_system_type", "value": "nail_system"}, {"set": "semantic_implant_class", "value": "intramedullary_nails"}, {"set": "semantic_brand_system", "value": "CLAVO"}, {"set": "semantic_anatomy_scope", "value": ["proximal_femur"]}],
     "explanation": "PFRN products belong to CLAVO nail system, anatomy = proximal femur", "confidence": 0.95},

    {"rule_code": "PFIN_CLAVO_001", "priority": 5, "applies_to": "catalog_product", "rule_type": "classification",
     "match_logic": {"all": [{"field": "product_name", "operator": "contains_ci", "value": "PFIN"}]},
     "actions": [{"set": "semantic_system_type", "value": "nail_system"}, {"set": "semantic_implant_class", "value": "intramedullary_nails"}, {"set": "semantic_brand_system", "value": "CLAVO"}, {"set": "semantic_anatomy_scope", "value": ["proximal_femur"]}],
     "explanation": "PFIN products belong to CLAVO nail system", "confidence": 0.93},
]


# ════════════════════════════════════════════════════════════
# 4) RULE ENGINE
# ════════════════════════════════════════════════════════════

def evaluate_condition(cond, context):
    """Evaluate a single rule condition against a product context."""
    field = cond["field"]
    op = cond["operator"]
    expected = cond.get("value")
    actual = context.get(field, "")
    if actual is None:
        actual = ""

    if op == "eq":
        return actual == expected
    if op == "eq_ci":
        return str(actual).lower() == str(expected).lower()
    if op == "contains":
        return expected in str(actual)
    if op == "contains_ci":
        return str(expected).lower() in str(actual).lower()
    if op == "starts_with":
        return str(actual).startswith(str(expected))
    if op == "in":
        return actual in expected
    if op == "not_in":
        return actual not in expected
    if op == "exists":
        return actual is not None and actual != ""
    if op == "regex":
        return bool(re.search(expected, str(actual), re.IGNORECASE))
    if op == "gte":
        return actual >= expected
    if op == "lte":
        return actual <= expected
    return False


def matches_rule(match_logic, context):
    """Check if a product context matches a rule's match logic."""
    all_conds = match_logic.get("all", [])
    any_conds = match_logic.get("any", [])
    none_conds = match_logic.get("none", [])

    all_ok = all(evaluate_condition(c, context) for c in all_conds) if all_conds else True
    any_ok = any(evaluate_condition(c, context) for c in any_conds) if any_conds else True
    none_ok = all(not evaluate_condition(c, context) for c in none_conds) if none_conds else True

    return all_ok and any_ok and none_ok


# ════════════════════════════════════════════════════════════
# 5) ENRICHMENT PIPELINE
# ════════════════════════════════════════════════════════════

async def run_enrichment():
    """Run semantic enrichment across ALL catalog_products."""

    # Load rules sorted by priority (highest first)
    rules = await sr_col.find({"is_active": True}).sort("priority", 1).to_list(500)
    print(f"Loaded {len(rules)} active rules")

    # Load brand intelligence for lookup
    bsi_map = {}
    async for bsi in bsi_col.find({"status": "active"}, {"_id": 0}):
        bsi_map[bsi["entity_code"]] = bsi
        for alias in bsi.get("known_aliases", []):
            bsi_map[alias.upper()] = bsi
    print(f"Loaded {len(bsi_map)} brand intelligence entries (incl aliases)")

    # Process ALL catalog products
    total = await cp_col.count_documents({})
    enriched = 0
    conflicts = 0

    cursor = cp_col.find({})
    async for product in cursor:
        pid = product["_id"]
        context = {
            "brand": product.get("brand", ""),
            "parent_brand": product.get("parent_brand", ""),
            "product_name": product.get("product_name", ""),
            "product_name_display": product.get("product_name_display", ""),
            "category": product.get("category", ""),
            "division_canonical": product.get("division_canonical", ""),
            "material_canonical": product.get("material_canonical", ""),
            "description_shadow": product.get("description_shadow", ""),
        }

        # Apply rules
        semantic = {}
        rule_hits = []
        for rule in rules:
            if rule.get("applies_to") not in ("catalog_product", "all"):
                continue
            if matches_rule(rule["match_logic"], context):
                for action in rule.get("actions", []):
                    semantic[action["set"]] = action["value"]
                rule_hits.append(rule["rule_code"])

        # Brand intelligence enrichment (fill gaps)
        brand_key = (product.get("brand") or "").upper()
        bsi = bsi_map.get(brand_key) or bsi_map.get(semantic.get("semantic_brand_system", ""))
        if bsi:
            if "semantic_brand_system" not in semantic:
                semantic["semantic_brand_system"] = bsi["entity_code"]
            if "semantic_parent_brand" not in semantic:
                semantic["semantic_parent_brand"] = bsi.get("parent_brand")
            if "semantic_system_type" not in semantic:
                semantic["semantic_system_type"] = bsi.get("system_type")
            if "semantic_material_default" not in semantic:
                semantic["semantic_material_default"] = bsi.get("material_default")
            if "semantic_coating_default" not in semantic:
                semantic["semantic_coating_default"] = bsi.get("coating_default")
            if "semantic_anatomy_scope" not in semantic:
                semantic["semantic_anatomy_scope"] = bsi.get("anatomy_scope", [])

        if not semantic:
            continue

        # Conflict detection
        conflict_codes = []
        brand_system = semantic.get("semantic_brand_system", "")
        if brand_system == "CLAVO" and semantic.get("semantic_system_type") != "nail_system":
            conflict_codes.append("brand_system_type_conflict")
        if brand_system == "KET" and semantic.get("semantic_material_default") not in ("Stainless Steel", "SS", None):
            conflict_codes.append("brand_material_conflict")
        if brand_system == "AURIC" and not semantic.get("semantic_coating_default"):
            conflict_codes.append("coating_missing_for_auric")

        semantic["semantic_rule_hits"] = rule_hits
        semantic["semantic_confidence"] = max(
            (r.get("confidence", 0) for r in rules if r["rule_code"] in rule_hits),
            default=0.5
        )
        semantic["semantic_conflict_codes"] = conflict_codes
        semantic["semantic_review_required"] = len(conflict_codes) > 0
        semantic["semantic_enriched_at"] = NOW

        await cp_col.update_one({"_id": pid}, {"$set": semantic})
        enriched += 1
        if conflict_codes:
            conflicts += 1

    print(f"\nEnriched {enriched}/{total} products")
    print(f"Conflicts detected: {conflicts}")


# ════════════════════════════════════════════════════════════
# 6) MAIN
# ════════════════════════════════════════════════════════════

async def create_indexes():
    """Create indexes for semantic collections."""
    await bsi_col.create_index("entity_code", unique=True, name="uq_bsi_entity_code")
    await bsi_col.create_index([("parent_brand", 1), ("division_canonical", 1)], name="idx_bsi_parent_division")
    await bsi_col.create_index([("system_type", 1), ("material_default", 1)], name="idx_bsi_system_material")
    await bsi_col.create_index("known_aliases", name="idx_bsi_aliases")

    await fr_col.create_index(
        [("source_entity_code", 1), ("relationship_type", 1), ("target_entity_code", 1)],
        unique=True, name="uq_fr_source_rel_target"
    )
    await fr_col.create_index([("target_entity_code", 1), ("status", 1)], name="idx_fr_target_status")

    await sr_col.create_index("rule_code", unique=True, name="uq_sr_rule_code")
    await sr_col.create_index([("is_active", 1), ("priority", -1)], name="idx_sr_active_priority")

    # Semantic indexes on catalog_products
    await cp_col.create_index([("semantic_brand_system", 1), ("semantic_system_type", 1)], name="idx_cp_semantic_brand_system")
    await cp_col.create_index("semantic_family_group", name="idx_cp_semantic_family_group", sparse=True)

    print("Indexes created")


async def seed_collections():
    """Seed brand intelligence, relationships, and rules."""
    # Clear and re-seed
    await bsi_col.delete_many({})
    for bsi in BRAND_SYSTEMS:
        bsi["created_at"] = NOW
        bsi["updated_at"] = NOW
        bsi["status"] = "active"
        bsi["review_required"] = False
    await bsi_col.insert_many(BRAND_SYSTEMS)
    print(f"Seeded {len(BRAND_SYSTEMS)} brand system intelligence records")

    await fr_col.delete_many({})
    for fr in RELATIONSHIPS:
        fr["status"] = "active"
        fr["review_required"] = False
        fr.setdefault("direction", "source_to_target")
        fr.setdefault("attributes", {})
    await fr_col.insert_many(RELATIONSHIPS)
    print(f"Seeded {len(RELATIONSHIPS)} family relationships")

    await sr_col.delete_many({})
    for rule in RULES:
        rule["is_active"] = True
        rule["created_at"] = NOW
        rule["updated_at"] = NOW
    await sr_col.insert_many(RULES)
    print(f"Seeded {len(RULES)} semantic rules")


async def main():
    print("=" * 60)
    print("SEMANTIC INTELLIGENCE LAYER — SEED & ENRICH")
    print("=" * 60)

    await create_indexes()
    await seed_collections()
    await run_enrichment()

    # Verification
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    tests = [
        ("ARMAR", "semantic_system_type", "plate_system"),
        ("KET", "semantic_material_default", "Stainless Steel"),
        ("CLAVO", "semantic_system_type", "nail_system"),
        ("AURIC", "semantic_coating_default", "TiNbN"),
        ("MBOSS", "semantic_implant_class", "screws"),
        ("MIRUS", "semantic_system_type", "stapler_system"),
    ]
    for brand, field, expected in tests:
        doc = await cp_col.find_one({"brand": {"$regex": brand, "$options": "i"}, field: expected}, {"_id": 0, "product_name_display": 1, field: 1})
        if doc:
            print(f"  PASS: {brand} → {field}={doc.get(field)}")
        else:
            print(f"  FAIL: {brand} → expected {field}={expected}")

    # Summary counts
    enriched_count = await cp_col.count_documents({"semantic_brand_system": {"$exists": True, "$ne": None}})
    total_count = await cp_col.count_documents({})
    print(f"\n  Enriched: {enriched_count}/{total_count} products")

    print("\nDONE.")


asyncio.run(main())
