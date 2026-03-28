import { useState } from "react";
import { X, MessageCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { submitLead } from "@/lib/api";
import { toast } from "sonner";
import { COMPANY } from "@/lib/constants";
import { modalOverlayVariants, modalContentVariants } from "@/lib/motion";

const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Nalgonda","Warangal","Karimnagar","Khammam","Nizamabad","Adilabad","Mahabubnagar","Medak","Siddipet","Suryapet","Jagtial","Peddapalli","Kamareddy","Mancherial","Wanaparthy","Nagarkurnool","Vikarabad","Jogulamba Gadwal","Rajanna Sircilla","Kumuram Bheem","Mulugu","Narayanpet","Mahabubabad","Jayashankar","Jangaon","Nirmal","Yadadri","Bhadradri","Hanumakonda"];

const DEPARTMENTS = [
  "Orthopedics", "Cardiology", "General Surgery", "Neurosurgery",
  "Urology", "ENT", "Spine Surgery", "Sports Medicine",
  "Diagnostics / Pathology", "Hospital Administration", "Procurement / Purchase",
  "Biomedical Engineering", "Other"
];

export default function LeadCaptureModal({ isOpen, onClose, inquiryType, productInterest, whatsappMessage, source }) {
  const [form, setForm] = useState({
    name: "", hospital_clinic: "", department: "",
    phone_whatsapp: "", email: "", district: ""
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone_whatsapp) {
      toast.error("Name and WhatsApp number are required");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({
        ...form,
        inquiry_type: inquiryType || "General",
        product_interest: productInterest || "",
        source: source || "website_enquiry",
        message: whatsappMessage || ""
      });

      const waMsg = whatsappMessage || `Hi, I'm ${form.name}${form.hospital_clinic ? ` from ${form.hospital_clinic}` : ""}. I'd like to enquire about your medical devices.`;
      const waUrl = `https://wa.me/${COMPANY.whatsapp.replace("+", "")}?text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, "_blank");

      toast.success("Details captured! Opening WhatsApp...");
      onClose();
      setForm({ name: "", hospital_clinic: "", department: "", phone_whatsapp: "", email: "", district: "" });
    } catch {
      toast.error("Failed to submit. Opening WhatsApp anyway...");
      const waUrl = `https://wa.me/${COMPANY.whatsapp.replace("+", "")}?text=${encodeURIComponent(whatsappMessage || "")}`;
      window.open(waUrl, "_blank");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="lead-capture-overlay"
        >
          <motion.div
            variants={modalContentVariants} initial="hidden" animate="visible" exit="exit"
            className="bg-[#0A0A0A] border border-white/10 rounded-sm shadow-2xl w-full max-w-md overflow-hidden"
            data-testid="lead-capture-modal"
          >
        <div className="bg-[#0D0D0D] px-6 py-4 flex items-center justify-between border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold text-base" style={{ fontFamily: 'Outfit' }}>Quick Enquiry</h3>
            <p className="text-white/40 text-xs mt-0.5">Share your details and we'll connect on WhatsApp</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors" data-testid="lead-capture-close"><X size={18} /></button>
        </div>
        {productInterest && (
          <div className="px-6 py-2.5 bg-[#D4AF37]/5 border-b border-[#D4AF37]/10">
            <p className="text-xs text-[#D4AF37] font-medium truncate">Enquiry: {productInterest}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-5 space-y-3" data-testid="lead-capture-form">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="col-span-2 w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-colors" data-testid="lead-name" />
            <input type="text" placeholder="Hospital / Clinic" value={form.hospital_clinic} onChange={(e) => setForm({ ...form, hospital_clinic: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-colors" data-testid="lead-hospital" />
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-sm text-sm text-white/70 outline-none focus:border-[#D4AF37]/50 transition-colors" data-testid="lead-department">
              <option value="">Department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="tel" placeholder="WhatsApp Number *" value={form.phone_whatsapp} onChange={(e) => setForm({ ...form, phone_whatsapp: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-colors" data-testid="lead-phone" />
            <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-colors" data-testid="lead-email" />
          </div>
          <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-sm text-sm text-white/70 outline-none focus:border-[#D4AF37]/50 transition-colors" data-testid="lead-district">
            <option value="">Select District</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#1DA851] text-white text-sm font-semibold rounded-sm transition-all disabled:opacity-50" data-testid="lead-submit">
            <MessageCircle size={16} /> {submitting ? "Submitting..." : "Continue to WhatsApp"}
            {!submitting && <ArrowRight size={14} />}
          </button>
          <p className="text-[10px] text-white/25 text-center">Your details help us serve you better. We never share your info.</p>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
