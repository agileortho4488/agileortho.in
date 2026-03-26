from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from db import products_col, conversations_col, leads_col
from models import ChatMessage, ChatLeadCapture
from helpers import EMERGENT_LLM_KEY

router = APIRouter()


CHATBOT_SYSTEM_PROMPT = """You are the AI Sales Assistant for Agile Ortho, an authorized master distributor of Meril Life Sciences medical devices in Telangana, India.

IDENTITY & PERSONALITY:
- You are professional, knowledgeable, and helpful
- You represent Agile Ortho — a premier B2B medical device distributor
- You speak with authority about medical device products but never give medical advice
- You are warm and approachable, using a consultative sales approach
- You address users as "Doctor" or "Sir/Madam" unless they specify otherwise

YOUR CAPABILITIES:
1. PRODUCT EXPERT: Answer questions about Meril medical devices — specifications, materials, sizes, categories, applications
2. LEAD CAPTURE: When a user shows buying interest, naturally collect their Name, Hospital/Clinic, WhatsApp number, and District
3. QUOTE ASSISTANCE: Guide users to request bulk pricing quotes
4. WHATSAPP ROUTING: When users want to speak with a human, provide the WhatsApp link

RULES:
- NEVER disclose pricing. Always say "We provide competitive bulk pricing tailored to your hospital's needs. Let me connect you with our sales team."
- NEVER give medical advice or treatment recommendations
- When asked about products not in your knowledge base, say "I don't have information on that specific product. Let me connect you with our product specialist."
- Always recommend products from the PRODUCT CONTEXT provided
- If the user gives their contact details (name, phone, hospital), acknowledge them warmly and confirm you'll have the team follow up
- Keep responses concise — 2-4 sentences max unless the user asks for detailed specs
- Use bullet points for listing multiple products or specs
- When the user wants human support, share the relevant contact number from the list below based on their query type

ABOUT AGILE ORTHO:
- Authorized Meril Life Sciences Master Distributor for Telangana
- Serves hospitals, clinics, and diagnostic centers across all 33 districts of Telangana
- Specializes in: Orthopedics, Cardiovascular, Diagnostics, ENT, Endo-surgical, Infection Prevention, Critical Care, Cardiac Surgery, Peripheral Intervention, Urology, Robotics devices
- 300+ products in our catalog across 15+ medical divisions
- ISO 13485 certified supply chain
- Offers bulk pricing, quick delivery, and after-sales support

CONTACT NUMBERS (Share the relevant number based on the query):
- Dispatch & Delivery Updates: 741818183
- Orthopedics & Spine Related Orders: 74161612350
- General Queries: 7416216262
- Consumables & Other Divisions: 7416416871
- Billing & Finance Issues: 7416416093
- WhatsApp Sales Support: https://wa.me/917416521222

PRODUCT CONTEXT (from catalog):
{product_context}
"""


async def search_relevant_products(query: str, limit: int = 12) -> list:
    results = []
    try:
        cursor = products_col.find(
            {"$text": {"$search": query}, "status": "published"},
            {"score": {"$meta": "textScore"}, "_id": 0, "slug": 0}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        async for doc in cursor:
            doc.pop("score", None)
            results.append(doc)
    except Exception:
        pass

    if len(results) < 5:
        keywords = [w.lower() for w in query.split() if len(w) > 2]
        for kw in keywords[:5]:
            regex = {"$regex": kw, "$options": "i"}
            cursor = products_col.find(
                {"$or": [
                    {"product_name": regex},
                    {"division": regex},
                    {"category": regex},
                    {"material": regex},
                    {"description": regex},
                    {"manufacturer": regex},
                ], "status": "published"},
                {"_id": 0, "slug": 0}
            ).limit(6)
            async for doc in cursor:
                if not any(r.get("sku_code") == doc.get("sku_code") for r in results):
                    results.append(doc)

    return results[:limit]


def format_product_context(products: list) -> str:
    if not products:
        return "No specific products found matching the query. Suggest the user browse the full catalog at /products or contact sales."

    lines = []
    for p in products:
        specs = p.get("technical_specifications", {})
        spec_str = ", ".join(f"{k}: {v}" for k, v in specs.items()) if isinstance(specs, dict) and specs else "N/A"
        size_vars = p.get("size_variables", [])
        if isinstance(size_vars, list) and size_vars:
            sizes = ", ".join(str(s) if not isinstance(s, dict) else str(s.get("size", s)) for s in size_vars)
        else:
            sizes = "N/A"
        lines.append(
            f"- **{p.get('product_name', 'Unknown')}** (SKU: {p.get('sku_code', 'N/A')})\n"
            f"  Division: {p.get('division', '')} | Category: {p.get('category', '')}\n"
            f"  Material: {p.get('material', 'N/A')} | Manufacturer: {p.get('manufacturer', 'Meril')}\n"
            f"  Description: {p.get('description', '')[:200]}\n"
            f"  Specs: {spec_str}\n"
            f"  Sizes: {sizes}\n"
            f"  Pack: {p.get('pack_size', 'N/A')}"
        )
    return "\n".join(lines)


@router.post("/api/chat")
async def chat_endpoint(msg: ChatMessage):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    session_id = msg.session_id or uuid.uuid4().hex
    user_text = msg.message.strip()
    if not user_text:
        raise HTTPException(400, "Message cannot be empty")

    relevant_products = await search_relevant_products(user_text)
    product_context = format_product_context(relevant_products)
    system_prompt = CHATBOT_SYSTEM_PROMPT.replace("{product_context}", product_context)

    conv = await conversations_col.find_one({"session_id": session_id})
    history = conv.get("messages", []) if conv else []

    initial_msgs = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        initial_msgs.append({"role": h["role"], "content": h["content"]})

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"chat-{session_id}",
        system_message=system_prompt,
        initial_messages=initial_msgs,
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    try:
        response = await chat.send_message(UserMessage(text=user_text))
    except Exception:
        response = "I'm having trouble connecting right now. Please try again in a moment, or reach our team directly on WhatsApp: https://wa.me/917416521222"

    new_messages = history + [
        {"role": "user", "content": user_text, "timestamp": datetime.now(timezone.utc).isoformat()},
        {"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()},
    ]

    await conversations_col.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_id": session_id,
            "messages": new_messages,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": len(new_messages),
        },
         "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    lead_captured = False
    lower_text = user_text.lower()
    if any(kw in lower_text for kw in ["my name is", "i am dr", "hospital", "clinic", "my number", "my phone", "whatsapp"]):
        lead_captured = True

    return {
        "response": response,
        "session_id": session_id,
        "products_referenced": len(relevant_products),
        "lead_signal": lead_captured,
    }


@router.post("/api/chat/lead")
async def chat_capture_lead(data: ChatLeadCapture):
    if not data.name or not data.phone_whatsapp:
        raise HTTPException(400, "Name and phone number are required")

    score = 20
    if data.hospital_clinic:
        score += 15
    if data.email:
        score += 10
    if data.district:
        score += 10

    score_label = "hot" if score >= 60 else "warm" if score >= 35 else "cold"

    lead = {
        "name": data.name,
        "hospital_clinic": data.hospital_clinic,
        "phone_whatsapp": data.phone_whatsapp,
        "email": data.email,
        "district": data.district,
        "inquiry_type": "AI Chat",
        "product_interest": "",
        "source": "chatbot",
        "score": score_label,
        "score_value": score,
        "status": "new",
        "notes": f"Lead captured via AI chatbot. Session: {data.session_id}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await leads_col.insert_one(lead)
    lead.pop("_id", None)

    await conversations_col.update_one(
        {"session_id": data.session_id},
        {"$set": {"lead_captured": True, "lead_name": data.name}}
    )

    return {"message": "Lead captured successfully", "lead_id": str(result.inserted_id)}


@router.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    conv = await conversations_col.find_one({"session_id": session_id}, {"_id": 0})
    if not conv:
        return {"messages": [], "session_id": session_id}
    return {"messages": conv.get("messages", []), "session_id": session_id}


@router.get("/api/chat/suggestions")
async def chat_suggestions():
    return {
        "suggestions": [
            "What orthopedic implants do you offer?",
            "Tell me about trauma plating systems",
            "Do you have locking plates for distal radius?",
            "What titanium screws are available?",
            "I need devices for my hospital in Hyderabad",
        ]
    }
