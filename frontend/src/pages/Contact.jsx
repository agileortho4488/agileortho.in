import { useState } from "react";
import { submitLead } from "../lib/api";
import { toast } from "sonner";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { SEO, buildBreadcrumbSchema } from "../components/SEO";

const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Nalgonda","Warangal","Karimnagar","Khammam","Nizamabad","Adilabad","Mahabubnagar","Medak","Siddipet","Suryapet","Jagtial","Peddapalli","Kamareddy","Mancherial","Wanaparthy","Nagarkurnool","Vikarabad","Jogulamba Gadwal","Rajanna Sircilla","Kumuram Bheem","Mulugu","Narayanpet","Mahabubabad","Jayashankar","Jangaon","Nirmal","Yadadri","Bhadradri","Hanumakonda"];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", inquiry_type: "Bulk Quote", product_interest: "", message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone_whatsapp) {
      toast.error("Name and WhatsApp number are required");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({ ...formData, source: "website" });
      toast.success("Your inquiry has been submitted! We'll contact you within 24 hours.");
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit. Please try again or contact us on WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SEO
        title="Contact Us - Request Bulk Quote for Medical Devices"
        description="Contact Agile Ortho for bulk medical device pricing, product samples, and technical consultation. Authorized Meril distributor in Telangana. Response within 24 hours."
        canonical="/contact"
        jsonLd={buildBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Contact" }])}
      />
      {/* Header */}
      <section className="bg-slate-900 py-16" data-testid="contact-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Get In Touch</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: "Chivo" }}>
            Request a Quote or Inquiry
          </h1>
          <p className="mt-3 text-slate-400 max-w-lg mx-auto">
            Need bulk pricing, product samples, or technical consultation? We respond within 24 hours.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Chivo" }}>Contact Information</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Office & Warehouse</p>
                    <p className="text-sm text-slate-500">1st Floor, Plot No 26, H.No 8-6-11/P20, Urmila Devi Complex, Engineers Colony, Hayathnagar, Hyderabad, Telangana - 500074</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Phone</p>
                    <a href="tel:+917416216262" className="text-sm text-slate-500 hover:text-emerald-600">+91 74162 16262</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Email</p>
                    <a href="mailto:info@agileortho.in" className="text-sm text-slate-500 hover:text-emerald-600">info@agileortho.in</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Business Hours</p>
                    <p className="text-sm text-slate-500">Mon-Sat: 9:00 AM - 7:00 PM</p>
                  </div>
                </li>
              </ul>
            </div>

            <a
              href="https://wa.me/917416521222?text=Hi, I'm interested in Meril medical devices for my hospital."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#25D366] text-white font-semibold rounded-sm hover:bg-[#1DA851] transition-colors"
              data-testid="contact-whatsapp-btn"
            >
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-sm p-6 sm:p-8" data-testid="contact-form-wrapper">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <Send size={24} className="text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>Inquiry Submitted!</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                    Thank you for your interest. Our team will contact you within 24 hours with pricing and availability.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", inquiry_type: "Bulk Quote", product_interest: "", message: "" }); }}
                    className="mt-6 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-slate-900 mb-6" style={{ fontFamily: "Chivo" }}>Submit Your Inquiry</h3>
                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="contact-form">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                          placeholder="Dr. Rajesh Kumar"
                          data-testid="contact-name-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital / Clinic</label>
                        <input
                          type="text"
                          value={formData.hospital_clinic}
                          onChange={(e) => setFormData({ ...formData, hospital_clinic: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                          placeholder="City Hospital"
                          data-testid="contact-hospital-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number *</label>
                        <input
                          type="tel"
                          value={formData.phone_whatsapp}
                          onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                          placeholder="+91 98765 43210"
                          data-testid="contact-phone-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                          placeholder="doctor@hospital.in"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                        <select
                          value={formData.district}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500 bg-white"
                        >
                          <option value="">Select District</option>
                          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Type</label>
                        <select
                          value={formData.inquiry_type}
                          onChange={(e) => setFormData({ ...formData, inquiry_type: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500 bg-white"
                          data-testid="contact-inquiry-type"
                        >
                          <option value="Bulk Quote">Bulk Quote</option>
                          <option value="Product Info">Product Information</option>
                          <option value="Brochure Download">Brochure Download</option>
                          <option value="General">General Inquiry</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Products of Interest</label>
                      <input
                        type="text"
                        value={formData.product_interest}
                        onChange={(e) => setFormData({ ...formData, product_interest: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                        placeholder="e.g., Destiknee TKR, BioMime Stents, AutoQuant Analyzers"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500 resize-none"
                        placeholder="Quantity needed, delivery location, any specific requirements..."
                        data-testid="contact-message-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-semibold rounded-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      data-testid="contact-submit-btn"
                    >
                      {submitting ? "Submitting..." : "Submit Inquiry"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
