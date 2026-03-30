"""
Self-Learning Engine — Analyzes chatbot + WhatsApp conversations,
extracts product interests, enriches leads, and builds FAQ cache
for smarter chatbot responses. Runs as a background task.
"""
from datetime import datetime, timezone, timedelta
from collections import Counter
from db import db, leads_col
import re

chatbot_telemetry_col = db["chatbot_telemetry"]
chatbot_conversations_col = db["chatbot_conversations"]
wa_conversations_col = db["wa_conversations"]
learning_cache_col = db["learning_cache"]

# Product/brand keywords to detect in conversations
PRODUCT_KEYWORDS = {
    "stent": ["Cardiology", "BioMime Stents, Mozec Stents, Myval THV"],
    "biomime": ["Cardiology", "BioMime Morph DES"],
    "mozec": ["Cardiology", "Mozec DES Stent"],
    "myval": ["Cardiology", "Myval Transcatheter Heart Valve"],
    "plate": ["Trauma", "KET Locking Plates, Reconstruction Plates"],
    "locking plate": ["Trauma", "KET Locking Plates"],
    "nail": ["Trauma", "ISIN Intramedullary Nails"],
    "intramedullary": ["Trauma", "ISIN Intramedullary Nails"],
    "screw": ["Trauma", "Cortical Screws, Cancellous Screws, Pedicle Screws"],
    "hip": ["Joints / Arthroplasty", "Opulent Hip System"],
    "knee": ["Joints / Arthroplasty", "Freedom Knee System, DestiKnee"],
    "knee implant": ["Joints / Arthroplasty", "Freedom Knee, DestiKnee"],
    "freedom knee": ["Joints / Arthroplasty", "Freedom Total Knee System"],
    "arthroplasty": ["Joints / Arthroplasty", "Freedom Knee, Opulent Hip"],
    "joint replacement": ["Joints / Arthroplasty", "Freedom Knee, Opulent Hip"],
    "spine": ["Spine", "Pedicle Screw Systems, Interbody Cages"],
    "pedicle": ["Spine", "Pedicle Screw Systems"],
    "cage": ["Spine", "Interbody Fusion Cages"],
    "trocar": ["Endosurgery", "Laparo Trocars"],
    "stapler": ["Endosurgery", "Endo Staplers"],
    "laparoscop": ["Endosurgery", "Laparo Instruments"],
    "endoscop": ["Endosurgery", "Endoscopy Systems"],
    "suture": ["Consumables", "Filaprop Sutures, Merifix Sutures"],
    "catheter": ["Vascular", "Diagnostic & Guiding Catheters"],
    "balloon": ["Cardiology", "PTCA Balloon Catheters"],
    "diagnostic": ["Diagnostics", "Diagnostic Kits & Analyzers"],
    "reagent": ["Diagnostics", "Reagent Systems"],
    "ent": ["ENT", "ENT Implants & Instruments"],
    "dental": ["Dental", "Dental Implant Systems"],
    "bone graft": ["Orthobiologics", "Bone Grafts"],
    "prp": ["Orthobiologics", "PRP Systems"],
    "sports": ["Sports Medicine", "Anchor Systems"],
    "mesh": ["Endosurgery", "Surgical Mesh"],
    "gown": ["Consumables", "Surgical Gowns"],
    "drape": ["Consumables", "Surgical Drapes"],
    "trauma": ["Trauma", "Trauma Plating & Nailing Systems"],
    "fracture": ["Trauma", "Fracture Fixation Systems"],
    "wire": ["Trauma", "K-Wires, Guide Wires"],
    "implant": ["Trauma", "Orthopedic Implants"],
    "cardiovascular": ["Cardiology", "Cardiac Devices"],
    "cardiac": ["Cardiology", "Cardiac Devices"],
    "vascular": ["Vascular", "Vascular Intervention Devices"],
    "consumable": ["Consumables", "Surgical Consumables"],
}


def extract_product_interests(text: str) -> list:
    """Extract product interests from conversation text."""
    if not text:
        return []
    text_lower = text.lower()
    found = []
    seen_divisions = set()
    for keyword, (division, products) in PRODUCT_KEYWORDS.items():
        if keyword in text_lower and division not in seen_divisions:
            found.append({
                "division": division,
                "products": products,
                "keyword": keyword,
            })
            seen_divisions.add(division)
    return found


def extract_all_from_messages(messages: list) -> dict:
    """Extract intelligence from a list of conversation messages."""
    all_text = " ".join(m.get("content", "") or m.get("role_user", "") or "" for m in messages)
    interests = extract_product_interests(all_text)

    # Extract doctor questions (what they actually asked)
    questions = []
    for m in messages:
        content = m.get("content", "") or m.get("role_user", "")
        role = m.get("role", "")
        if role in ("customer", "user") and content:
            questions.append(content)

    return {
        "interests": interests,
        "questions": questions,
        "divisions_interested": list(set(i["division"] for i in interests)),
        "products_mentioned": list(set(i["products"] for i in interests)),
    }


async def learn_from_all_conversations():
    """Main learning loop — analyze all conversations and enrich leads."""
    insights_updated = 0
    faq_entries = 0

    # 1. Analyze WhatsApp conversations → enrich leads
    wa_convs = await wa_conversations_col.find(
        {"messages.0": {"$exists": True}},
        {"_id": 0, "phone": 1, "messages": {"$slice": -50}, "customer_name": 1}
    ).to_list(500)

    for conv in wa_convs:
        phone = conv.get("phone", "")
        if not phone:
            continue
        messages = conv.get("messages", [])
        intel = extract_all_from_messages(messages)

        if intel["interests"]:
            # Enrich the lead with product intelligence
            update = {
                "product_insights": {
                    "divisions_interested": intel["divisions_interested"],
                    "products_mentioned": intel["products_mentioned"],
                    "question_count": len(intel["questions"]),
                    "last_analyzed": datetime.now(timezone.utc).isoformat(),
                },
            }
            result = await leads_col.update_one(
                {"phone_whatsapp": phone},
                {"$set": update}
            )
            if result.modified_count > 0:
                insights_updated += 1

    # 2. Analyze chatbot conversations → build FAQ cache + enrich sessions
    chatbot_convs = await chatbot_conversations_col.find(
        {"turns.0": {"$exists": True}},
        {"_id": 0, "session_id": 1, "turns": {"$slice": -50}}
    ).to_list(500)

    faq_counter = Counter()
    product_associations = Counter()
    successful_answers = {}

    for conv in chatbot_convs:
        turns = conv.get("turns", [])
        for turn in turns:
            question = turn.get("role_user", "")
            answer = turn.get("role_assistant", "")
            confidence = turn.get("confidence", "")

            if confidence in ("high", "medium") and question and answer:
                q_normalized = question.strip().lower()
                faq_counter[q_normalized] += 1
                if q_normalized not in successful_answers or confidence == "high":
                    successful_answers[q_normalized] = {
                        "question": question,
                        "answer": answer,
                        "confidence": confidence,
                    }

            # Track product associations from queries
            interests = extract_product_interests(question)
            if len(interests) >= 2:
                divs = tuple(sorted(i["division"] for i in interests))
                product_associations[divs] += 1

    # 3. Build FAQ cache — top questions with good answers
    faq_cache = []
    for q, count in faq_counter.most_common(50):
        if count >= 2 and q in successful_answers:
            faq_cache.append({
                "question": successful_answers[q]["question"],
                "answer": successful_answers[q]["answer"],
                "confidence": successful_answers[q]["confidence"],
                "frequency": count,
            })
            faq_entries += 1

    # 4. Build product association map
    associations = []
    for divs, count in product_associations.most_common(20):
        if count >= 1:
            associations.append({
                "divisions": list(divs),
                "co_occurrence": count,
            })

    # 5. Analyze chatbot telemetry for trending products (last 7 days only)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    telemetry = await chatbot_telemetry_col.find(
        {"event_type": "query", "query": {"$exists": True, "$ne": ""}, "timestamp": {"$gte": cutoff}},
        {"_id": 0, "query": 1, "confidence": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(1000).to_list(1000)

    division_demand = Counter()
    for t in telemetry:
        interests = extract_product_interests(t.get("query", ""))
        for i in interests:
            division_demand[i["division"]] += 1

    trending_divisions = [
        {"division": div, "search_count": count}
        for div, count in division_demand.most_common(13)
    ]

    # 6. Store learning cache
    await learning_cache_col.update_one(
        {"type": "chatbot_learning"},
        {"$set": {
            "type": "chatbot_learning",
            "faq_cache": faq_cache,
            "product_associations": associations,
            "trending_divisions": trending_divisions,
            "total_conversations_analyzed": len(wa_convs) + len(chatbot_convs),
            "leads_enriched": insights_updated,
            "faq_entries": faq_entries,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    # 7. Enrich leads that came from website (match by chatbot session → lead)
    # For leads without phone (website-only), try to match by session telemetry
    website_leads = await leads_col.find(
        {"source": {"$in": ["website", "website_enquiry", "homepage_hero", "catalog"]},
         "product_insights": {"$exists": False}},
        {"_id": 1, "id": 1, "product_interest": 1, "department": 1, "inquiry_type": 1}
    ).limit(200).to_list(200)

    for lead in website_leads:
        text = f"{lead.get('product_interest', '')} {lead.get('department', '')} {lead.get('inquiry_type', '')}"
        interests = extract_product_interests(text)
        if interests:
            lead_filter = {"id": lead["id"]} if lead.get("id") else {"_id": lead["_id"]}
            await leads_col.update_one(
                lead_filter,
                {"$set": {
                    "product_insights": {
                        "divisions_interested": [i["division"] for i in interests],
                        "products_mentioned": [i["products"] for i in interests],
                        "question_count": 0,
                        "last_analyzed": datetime.now(timezone.utc).isoformat(),
                    }
                }}
            )
            insights_updated += 1

    return {
        "conversations_analyzed": len(wa_convs) + len(chatbot_convs),
        "leads_enriched": insights_updated,
        "faq_entries_cached": faq_entries,
        "trending_divisions": len(trending_divisions),
    }


async def get_faq_context_for_chatbot() -> str:
    """Get learned FAQ context to inject into chatbot prompts."""
    cache = await learning_cache_col.find_one(
        {"type": "chatbot_learning"}, {"_id": 0}
    )
    if not cache or not cache.get("faq_cache"):
        return ""

    faq_lines = []
    for faq in cache["faq_cache"][:10]:
        faq_lines.append(f"Q: {faq['question']}\nA: {faq['answer']}")

    trending = cache.get("trending_divisions", [])
    trending_text = ""
    if trending:
        trending_text = "\n\nTRENDING (doctors are most asking about): " + ", ".join(
            f"{t['division']} ({t['search_count']} queries)" for t in trending[:5]
        )

    return "LEARNED FROM PAST CONVERSATIONS:\n" + "\n\n".join(faq_lines) + trending_text


# Background scheduler
import asyncio

_learning_running = False

async def learning_scheduler():
    """Run learning analysis every 5 minutes."""
    global _learning_running
    if _learning_running:
        return
    _learning_running = True
    while True:
        try:
            result = await learn_from_all_conversations()
            if result["leads_enriched"] > 0:
                print(f"[LEARNING] Enriched {result['leads_enriched']} leads, cached {result['faq_entries_cached']} FAQs, {result['trending_divisions']} trending divisions")
        except Exception as e:
            print(f"[LEARNING] Error: {e}")
        await asyncio.sleep(300)  # Every 5 minutes
