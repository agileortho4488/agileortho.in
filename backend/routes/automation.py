from fastapi import APIRouter, Depends, Request
from datetime import datetime, timezone, timedelta
import asyncio
import uuid
import json
import re

from db import leads_col, wa_conversations_col, products_col, db
from helpers import admin_required, EMERGENT_LLM_KEY

router = APIRouter()

followup_col = db["followup_queue"]
automation_logs_col = db["automation_logs"]

# B2B Medical Device Sales Pipeline — Staged Nurture Journey
# Based on industry best practices: 6-stage pipeline, spaced touchpoints,
# value-driven content, never more than 1 message per stage window.
# Goal: Build trust, not annoy. Let the physical sales team close.

FOLLOWUP_SEQUENCES = {
    "hot": [
        # Stage 1: Immediate acknowledgment (within 1 hour)
        {"delay_hours": 1, "type": "acknowledge", "stage": "engaged",
         "msg": "Hi {name}, thank you for your interest in {product}. Our {division} specialist for your region will reach out to discuss specifications and availability. — Agile Healthcare"},
        # Stage 2: Specialist introduction (next business day)
        {"delay_hours": 24, "type": "specialist_intro", "stage": "qualified",
         "msg": "Hi {name}, our field representative has been briefed about your {product} requirements. They'll coordinate a convenient time for a product demo at your facility. Ref: Agile Healthcare — Meril Authorized"},
        # Stage 3: Value reinforcement (Day 5 — clinical evidence)
        {"delay_hours": 120, "type": "clinical_proof", "stage": "proposal",
         "msg": "Hi {name}, quick note — Meril {product} is backed by 15+ years of clinical data across 4,000+ hospitals in India. Happy to share relevant case studies for your department. — Agile Healthcare"},
        # Stage 4: Check-in (Day 14 — only if no response)
        {"delay_hours": 336, "type": "gentle_checkin", "stage": "negotiation",
         "msg": "Hi {name}, just checking in. If you need a revised quotation or have questions about {product}, our team is a message away. No rush — we're here when you're ready."},
    ],
    "warm": [
        # Stage 1: Thank you (within 2 hours)
        {"delay_hours": 2, "type": "thank_you", "stage": "engaged",
         "msg": "Hi {name}, thanks for exploring our {division} range. If you'd like product specifications or pricing, just reply here and we'll have the details sent over. — Agile Healthcare"},
        # Stage 2: Educational value (Day 3)
        {"delay_hours": 72, "type": "education", "stage": "discovery",
         "msg": "Hi {name}, FYI — we support 1,800+ healthcare facilities across Telangana with Meril {division} devices. Our team can arrange a no-obligation product overview at your convenience."},
        # Stage 3: Soft follow-up (Day 10)
        {"delay_hours": 240, "type": "soft_followup", "stage": "proposal",
         "msg": "Hi {name}, wanted to share that we have comprehensive pricing available for {division} products. Reply QUOTE if you'd like us to prepare something specific for your facility. — Agile Healthcare"},
    ],
    "cold": [
        # Stage 1: Simple acknowledgment (Day 1)
        {"delay_hours": 24, "type": "acknowledge", "stage": "prospecting",
         "msg": "Hi, thanks for reaching out to Agile Healthcare — Telangana's authorized Meril Life Sciences franchise. We serve all 33 districts. Let us know how we can help with your medical device needs."},
        # Stage 2: Awareness (Day 7 — only once)
        {"delay_hours": 168, "type": "awareness", "stage": "discovery",
         "msg": "Hi, just a quick note — Agile Healthcare offers Meril's full range across 13 clinical divisions (Ortho, Cardio, Spine, ENT & more) with competitive institutional pricing. We're here if you need anything."},
    ],
}


async def extract_lead_info(messages: list) -> dict:
    """Use AI to extract lead information from conversation messages."""
    if not messages:
        return {}

    conversation_text = "\n".join(
        f"{'Customer' if m.get('role') == 'customer' else 'Bot'}: {m.get('content', '')}"
        for m in messages[-15:]
    )

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    extraction_prompt = """Analyze this WhatsApp conversation and extract customer information.
Return ONLY a JSON object with these fields (use null for unknown):
{
  "name": "customer's name if mentioned",
  "hospital_clinic": "hospital or clinic name if mentioned",
  "district": "district/city in Telangana if mentioned",
  "email": "email if mentioned",
  "product_interest": "specific products they asked about",
  "division_interest": "which medical division (Orthopedics, Cardiovascular, etc.)",
  "buying_intent": "high/medium/low based on conversation signals",
  "budget_mentioned": true/false,
  "urgency": "urgent/normal/exploring",
  "key_needs": "brief summary of what they need"
}
ONLY return the JSON. No explanation."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"extract-{uuid.uuid4().hex[:8]}",
        system_message=extraction_prompt,
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    try:
        response = await chat.send_message(UserMessage(text=conversation_text))
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"```json?\s*", "", cleaned)
            cleaned = cleaned.rstrip("`").strip()
        return json.loads(cleaned)
    except Exception:
        return {}


def calculate_lead_score(info: dict, message_count: int) -> tuple:
    """Calculate lead score based on extracted info and engagement."""
    score = 10

    if info.get("name"):
        score += 15
    if info.get("hospital_clinic"):
        score += 20
    if info.get("email"):
        score += 10
    if info.get("district"):
        score += 5
    if info.get("product_interest"):
        score += 15

    intent = info.get("buying_intent", "low")
    if intent == "high":
        score += 25
    elif intent == "medium":
        score += 15

    if info.get("budget_mentioned"):
        score += 10

    urgency = info.get("urgency", "exploring")
    if urgency == "urgent":
        score += 15
    elif urgency == "normal":
        score += 5

    if message_count >= 6:
        score += 10
    elif message_count >= 3:
        score += 5

    score = min(score, 100)

    if score >= 70:
        label = "hot"
    elif score >= 40:
        label = "warm"
    else:
        label = "cold"

    return score, label


async def update_lead_from_conversation(phone: str, conv: dict):
    """Auto-update or create lead from conversation data."""
    messages = conv.get("messages", [])
    customer_msgs = [m for m in messages if m.get("role") == "customer"]

    if len(customer_msgs) < 1:
        return

    info = await extract_lead_info(messages)
    score_value, score_label = calculate_lead_score(info, len(customer_msgs))

    existing_lead = await leads_col.find_one({"phone_whatsapp": phone})

    lead_data = {
        "phone_whatsapp": phone,
        "name": info.get("name") or conv.get("customer_name") or f"WhatsApp {phone}",
        "hospital_clinic": info.get("hospital_clinic") or "",
        "email": info.get("email") or "",
        "district": info.get("district") or "",
        "inquiry_type": "WhatsApp Chat",
        "product_interest": info.get("product_interest") or "",
        "division_interest": info.get("division_interest") or "",
        "source": "whatsapp",
        "score": score_label,
        "score_value": score_value,
        "buying_intent": info.get("buying_intent") or "low",
        "urgency": info.get("urgency") or "exploring",
        "key_needs": info.get("key_needs") or "",
        "message_count": len(messages),
        "last_interaction": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if existing_lead:
        update_fields = {}
        for key, val in lead_data.items():
            if val and key not in ("phone_whatsapp", "source", "inquiry_type", "created_at"):
                old_val = existing_lead.get(key, "")
                if not old_val or (val and val != old_val and key in (
                    "name", "hospital_clinic", "email", "district", "product_interest",
                    "division_interest", "score", "score_value", "buying_intent",
                    "urgency", "key_needs", "message_count", "last_interaction", "updated_at"
                )):
                    update_fields[key] = val

        if existing_lead.get("score_value", 0) < score_value:
            update_fields["score"] = score_label
            update_fields["score_value"] = score_value

        if update_fields:
            await leads_col.update_one({"phone_whatsapp": phone}, {"$set": update_fields})

        if existing_lead.get("status") == "new":
            await leads_col.update_one({"phone_whatsapp": phone}, {"$set": {"status": "contacted"}})
    else:
        lead_data["status"] = "new"
        lead_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await leads_col.insert_one(lead_data)

    await wa_conversations_col.update_one(
        {"phone": phone},
        {"$set": {
            "lead_created": True,
            "lead_score": score_label,
            "lead_score_value": score_value,
        }}
    )

    return info, score_value, score_label


async def schedule_followups(phone: str, score_label: str, conv: dict):
    """Schedule automated follow-up messages based on lead temperature."""
    sequence = FOLLOWUP_SEQUENCES.get(score_label, FOLLOWUP_SEQUENCES["cold"])
    info = await extract_lead_info(conv.get("messages", [])[-5:]) if conv.get("messages") else {}

    name = info.get("name") or conv.get("customer_name") or "there"
    product = info.get("product_interest") or "medical devices"
    division = info.get("division_interest") or "medical"

    await followup_col.delete_many({"phone": phone, "status": "pending"})

    now = datetime.now(timezone.utc)
    for step in sequence:
        send_at = now + timedelta(hours=step["delay_hours"])
        msg = step["msg"].format(name=name, product=product, division=division)

        await followup_col.insert_one({
            "phone": phone,
            "message": msg,
            "followup_type": step["type"],
            "delay_hours": step["delay_hours"],
            "send_at": send_at.isoformat(),
            "status": "pending",
            "score_label": score_label,
            "created_at": now.isoformat(),
        })


async def process_followup_queue():
    """Process pending follow-ups that are due. Called by background scheduler."""
    from routes.whatsapp import send_whatsapp_message

    now = datetime.now(timezone.utc)
    pending = await followup_col.find({
        "status": "pending",
        "send_at": {"$lte": now.isoformat()},
    }).to_list(50)

    sent = 0
    for fu in pending:
        phone = fu["phone"]

        conv = await wa_conversations_col.find_one({"phone": phone})
        if conv:
            msgs = conv.get("messages", [])
            if msgs:
                last_msg = msgs[-1]
                last_time = datetime.fromisoformat(last_msg["timestamp"].replace("Z", "+00:00"))
                if last_msg.get("role") == "customer" and (now - last_time).total_seconds() < 300:
                    await followup_col.update_one(
                        {"_id": fu["_id"]},
                        {"$set": {"status": "skipped", "reason": "customer_recently_active"}}
                    )
                    continue

            if conv.get("status") == "human":
                await followup_col.update_one(
                    {"_id": fu["_id"]},
                    {"$set": {"status": "skipped", "reason": "human_takeover"}}
                )
                continue

        result = await send_whatsapp_message(phone, fu["message"], callback_data="followup")

        outgoing_msg = {
            "role": "assistant",
            "content": fu["message"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "channel": "whatsapp",
            "type": "followup",
            "followup_type": fu["followup_type"],
        }
        await wa_conversations_col.update_one(
            {"phone": phone},
            {"$push": {"messages": outgoing_msg}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        status = "sent" if result.get("success") else "failed"
        await followup_col.update_one(
            {"_id": fu["_id"]},
            {"$set": {"status": status, "sent_at": datetime.now(timezone.utc).isoformat()}}
        )

        await automation_logs_col.insert_one({
            "type": "followup_sent",
            "phone": phone,
            "followup_type": fu["followup_type"],
            "score_label": fu.get("score_label"),
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        sent += 1

    return sent


# --- Background scheduler ---
_scheduler_running = False

async def followup_scheduler():
    """Background loop that checks for pending follow-ups every 60 seconds."""
    global _scheduler_running
    if _scheduler_running:
        return
    _scheduler_running = True
    while True:
        try:
            sent = await process_followup_queue()
            if sent > 0:
                print(f"[AUTOMATION] Sent {sent} follow-up messages")
        except Exception as e:
            print(f"[AUTOMATION] Error: {e}")
        await asyncio.sleep(60)


# --- Admin API endpoints ---

@router.get("/api/admin/automation/stats")
async def get_automation_stats(_=Depends(admin_required)):
    total_followups = await followup_col.count_documents({})
    pending = await followup_col.count_documents({"status": "pending"})
    sent = await followup_col.count_documents({"status": "sent"})
    skipped = await followup_col.count_documents({"status": "skipped"})
    failed = await followup_col.count_documents({"status": "failed"})

    pipeline = [
        {"$group": {"_id": "$score", "count": {"$sum": 1}}},
    ]
    lead_scores = await leads_col.aggregate(pipeline).to_list(None)
    lead_breakdown = {r["_id"]: r["count"] for r in lead_scores if r["_id"]}

    total_leads = await leads_col.count_documents({})
    wa_leads = await leads_col.count_documents({"source": "whatsapp"})

    pipeline_stages = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    stage_counts = await leads_col.aggregate(pipeline_stages).to_list(None)
    stages = {r["_id"]: r["count"] for r in stage_counts if r["_id"]}

    return {
        "followups": {
            "total": total_followups,
            "pending": pending,
            "sent": sent,
            "skipped": skipped,
            "failed": failed,
        },
        "leads": {
            "total": total_leads,
            "whatsapp_sourced": wa_leads,
            "by_score": lead_breakdown,
            "by_stage": stages,
        },
        "pipeline_info": {
            "stages": ["prospecting", "engaged", "discovery", "qualified", "proposal", "negotiation", "won", "lost"],
            "nurture_approach": "B2B staged journey — max 1 message per stage window, value-driven, no spam",
            "hot_touchpoints": 4,
            "warm_touchpoints": 3,
            "cold_touchpoints": 2,
            "hot_span_days": 14,
            "warm_span_days": 10,
            "cold_span_days": 7,
        },
    }


@router.get("/api/admin/automation/followup-queue")
async def get_followup_queue(_=Depends(admin_required)):
    queue = await followup_col.find(
        {}, {"_id": 0}
    ).sort("send_at", 1).limit(50).to_list(50)
    return {"queue": queue, "total": len(queue)}


@router.post("/api/admin/automation/trigger-followups")
async def trigger_followups(_=Depends(admin_required)):
    sent = await process_followup_queue()
    return {"sent": sent, "message": f"Processed {sent} follow-ups"}


@router.post("/api/admin/automation/rescore-leads")
async def rescore_all_leads(_=Depends(admin_required)):
    """Re-analyze all WhatsApp conversations and update lead scores."""
    convs = await wa_conversations_col.find({"messages.0": {"$exists": True}}).to_list(None)
    updated = 0
    for conv in convs:
        phone = conv.get("phone", "")
        if not phone:
            continue
        try:
            result = await update_lead_from_conversation(phone, conv)
            if result:
                updated += 1
        except Exception:
            pass
    return {"rescored": updated, "total_conversations": len(convs)}


@router.post("/api/admin/automation/schedule-followups/{phone}")
async def manual_schedule_followups(phone: str, _=Depends(admin_required)):
    conv = await wa_conversations_col.find_one({"phone": phone})
    if not conv:
        return {"error": "Conversation not found"}

    lead = await leads_col.find_one({"phone_whatsapp": phone})
    score_label = lead.get("score", "cold") if lead else "cold"

    await schedule_followups(phone, score_label, conv)
    pending = await followup_col.count_documents({"phone": phone, "status": "pending"})
    return {"message": f"Scheduled {pending} follow-ups for {phone}", "score": score_label}
