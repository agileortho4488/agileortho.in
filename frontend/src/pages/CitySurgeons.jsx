import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Users, Award, ChevronRight, Search, Phone, Star, Building2, Stethoscope } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet";

// City data for SEO
const CITY_DATA = {
  hyderabad: { name: "Hyderabad", state: "Telangana", image: "https://images.unsplash.com/photo-1572445271230-a78b4b5573a5?w=1200" },
  vijayawada: { name: "Vijayawada", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  visakhapatnam: { name: "Visakhapatnam", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  vizag: { name: "Visakhapatnam", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  warangal: { name: "Warangal", state: "Telangana", image: "https://images.unsplash.com/photo-1572445271230-a78b4b5573a5?w=1200" },
  guntur: { name: "Guntur", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  tirupati: { name: "Tirupati", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  nellore: { name: "Nellore", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  karimnagar: { name: "Karimnagar", state: "Telangana", image: "https://images.unsplash.com/photo-1572445271230-a78b4b5573a5?w=1200" },
  rajahmundry: { name: "Rajahmundry", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  kakinada: { name: "Kakinada", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  khammam: { name: "Khammam", state: "Telangana", image: "https://images.unsplash.com/photo-1572445271230-a78b4b5573a5?w=1200" },
  nizamabad: { name: "Nizamabad", state: "Telangana", image: "https://images.unsplash.com/photo-1572445271230-a78b4b5573a5?w=1200" },
  kurnool: { name: "Kurnool", state: "Andhra Pradesh", image: "https://images.unsplash.com/photo-1590766940554-634e76a2d96a?w=1200" },
  secunderabad: { name: "Secunderabad", state: "Telangana", image: "https://images.unsplash.com/photo-1572445271230-a78b4b5573a5?w=1200" },
  mumbai: { name: "Mumbai", state: "Maharashtra", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200" },
  delhi: { name: "Delhi", state: "Delhi NCR", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200" },
  bangalore: { name: "Bangalore", state: "Karnataka", image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200" },
  chennai: { name: "Chennai", state: "Tamil Nadu", image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200" },
  pune: { name: "Pune", state: "Maharashtra", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200" },
  jaipur: { name: "Jaipur", state: "Rajasthan", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200" },
};

function SurgeonCard({ surgeon, index }) {
  const city = surgeon.locations?.[0]?.city || "";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link
        to={`/doctor/${surgeon.slug}`}
        className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-xl hover:border-teal-300 transition-all duration-300"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-500/20">
            {surgeon.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
              {surgeon.name}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {surgeon.qualifications}
            </p>
            {surgeon.subspecialties?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {surgeon.subspecialties.slice(0, 2).map(sub => (
                  <Badge key={sub} className="rounded-full bg-teal-50 text-teal-700 border-0 text-xs">
                    {sub}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
        </div>
        
        {surgeon.locations?.[0] && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{surgeon.locations[0].facility_name || surgeon.locations[0].city}</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export default function CitySurgeons() {
  const { city: cityParam } = useParams();
  const api = useMemo(() => apiClient(), []);
  
  const [surgeons, setSurgeons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("");

  // Get city info
  const cityKey = cityParam?.toLowerCase().replace(/[^a-z]/g, '');
  const cityInfo = CITY_DATA[cityKey] || { 
    name: cityParam?.charAt(0).toUpperCase() + cityParam?.slice(1) || "City", 
    state: "India",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200"
  };

  useEffect(() => {
    async function loadSurgeons() {
      setLoading(true);
      try {
        const res = await api.get("/profiles/all");
        // Filter by city
        const citySurgeons = (res.data || []).filter(s => {
          const surgeonCity = (s.locations?.[0]?.city || "").toLowerCase();
          return surgeonCity.includes(cityKey) || cityKey.includes(surgeonCity.replace(/[^a-z]/g, ''));
        });
        setSurgeons(citySurgeons);
      } catch (e) {
        console.error("Failed to load surgeons:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSurgeons();
  }, [api, cityKey]);

  // Filter surgeons
  const filteredSurgeons = useMemo(() => {
    return surgeons.filter(s => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!s.name?.toLowerCase().includes(query) && 
            !s.subspecialties?.some(sub => sub.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (selectedSubspecialty && !s.subspecialties?.includes(selectedSubspecialty)) {
        return false;
      }
      return true;
    });
  }, [surgeons, searchQuery, selectedSubspecialty]);

  // Get available subspecialties
  const subspecialties = useMemo(() => {
    const subs = new Set();
    surgeons.forEach(s => s.subspecialties?.forEach(sub => subs.add(sub)));
    return Array.from(subs).sort();
  }, [surgeons]);

  // SEO Schema
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": `Orthopaedic Surgeons in ${cityInfo.name}`,
    "description": `Find the best orthopaedic surgeons in ${cityInfo.name}, ${cityInfo.state}. Verified doctors for knee, hip, spine, trauma, and sports injuries.`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": cityInfo.name,
      "addressRegion": cityInfo.state,
      "addressCountry": "IN"
    }
  };

  return (
    <>
      <Helmet>
        <title>Best Orthopaedic Surgeons in {cityInfo.name} | OrthoConnect</title>
        <meta name="description" content={`Find ${surgeons.length}+ verified orthopaedic surgeons in ${cityInfo.name}, ${cityInfo.state}. Specialists in knee replacement, hip surgery, spine, trauma & sports injuries. Free consultations.`} />
        <meta name="keywords" content={`orthopaedic surgeon ${cityInfo.name}, bone doctor ${cityInfo.name}, knee replacement ${cityInfo.name}, hip surgery ${cityInfo.name}, spine surgeon ${cityInfo.name}`} />
        <link rel="canonical" href={`https://orthoconnect.agileortho.in/surgeons/${cityParam}`} />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <main className="min-h-screen bg-slate-50">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${cityInfo.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
          
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 border border-teal-500/30 px-4 py-1.5 mb-6">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span className="text-teal-300 text-sm font-medium">{cityInfo.state}</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                Orthopaedic Surgeons in{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                  {cityInfo.name}
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
                Find verified orthopaedic specialists for knee, hip, spine, trauma, and sports injuries. 
                All profiles are free - no paid rankings.
              </p>

              {/* Stats */}
              <div className="flex justify-center gap-8 mt-10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{surgeons.length}</div>
                  <div className="text-sm text-slate-400">Verified Surgeons</div>
                </div>
                <div className="text-center border-l border-slate-700 pl-8">
                  <div className="text-3xl font-bold text-white">{subspecialties.length}</div>
                  <div className="text-sm text-slate-400">Subspecialties</div>
                </div>
                <div className="text-center border-l border-slate-700 pl-8">
                  <div className="text-3xl font-bold text-teal-400">Free</div>
                  <div className="text-sm text-slate-400">No Hidden Costs</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={`Search surgeons in ${cityInfo.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-slate-200"
                />
              </div>
              <select
                value={selectedSubspecialty}
                onChange={(e) => setSelectedSubspecialty(e.target.value)}
                className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Subspecialties</option>
                {subspecialties.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Surgeons Grid */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="animate-pulse rounded-2xl bg-white border border-slate-200 p-5 h-40" />
              ))}
            </div>
          ) : filteredSurgeons.length === 0 ? (
            <div className="text-center py-16">
              <Stethoscope className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900">No surgeons found</h3>
              <p className="text-slate-500 mt-2">
                {searchQuery ? "Try adjusting your search" : `We're expanding to ${cityInfo.name} soon!`}
              </p>
              <Link to="/surgeons">
                <Button className="mt-6 rounded-full bg-teal-600 hover:bg-teal-700">
                  View All Surgeons
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  {filteredSurgeons.length} Orthopaedic Surgeon{filteredSurgeons.length !== 1 ? 's' : ''} in {cityInfo.name}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSurgeons.map((surgeon, index) => (
                  <SurgeonCard key={surgeon.id} surgeon={surgeon} index={index} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-teal-600 to-emerald-600 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white">
              Are you an Orthopaedic Surgeon in {cityInfo.name}?
            </h2>
            <p className="mt-4 text-lg text-teal-100">
              Join OrthoConnect for free and get discovered by patients looking for orthopaedic care.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join">
                <Button size="lg" className="rounded-full bg-white text-teal-700 hover:bg-teal-50 px-8">
                  Create Free Profile →
                </Button>
              </Link>
              <Link to="/claim">
                <Button size="lg" variant="outline" className="rounded-full border-white text-white hover:bg-white/10 px-8">
                  Claim Your Profile
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Finding the Right Orthopaedic Surgeon in {cityInfo.name}
            </h2>
            <div className="prose prose-slate max-w-none">
              <p>
                {cityInfo.name} is home to many skilled orthopaedic surgeons specializing in various conditions 
                including joint replacements, sports injuries, spine disorders, and trauma care. OrthoConnect 
                helps you find verified orthopaedic specialists in {cityInfo.name}, {cityInfo.state} without 
                any paid rankings or advertisements.
              </p>
              <h3>Common Orthopaedic Treatments in {cityInfo.name}</h3>
              <ul>
                <li><strong>Knee Replacement Surgery</strong> - Total and partial knee replacement procedures</li>
                <li><strong>Hip Replacement</strong> - Hip arthroplasty and revision surgeries</li>
                <li><strong>Spine Surgery</strong> - Disc problems, spinal fusion, and deformity correction</li>
                <li><strong>Sports Medicine</strong> - ACL reconstruction, rotator cuff repair, and arthroscopy</li>
                <li><strong>Trauma Care</strong> - Fracture management and complex reconstructions</li>
              </ul>
              <p>
                All surgeons listed on OrthoConnect are verified medical professionals. We do not accept 
                payments for better rankings - every surgeon gets fair visibility based on patient needs.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
