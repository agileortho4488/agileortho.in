import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main data-testid="not-found-page" className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center max-w-lg"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="relative"
        >
          <span className="text-[180px] sm:text-[220px] font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Search className="h-10 w-10 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-4">
            Page Not Found
          </h1>
          <p className="mt-3 text-slate-600 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            asChild
            className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all"
          >
            <Link to="/" data-testid="not-found-home-link">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-slate-200 px-6 py-3"
          >
            <Link to="/education" data-testid="not-found-education-link">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Browse Education
            </Link>
          </Button>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 pt-8 border-t border-slate-200"
        >
          <p className="text-sm text-slate-500 mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/education/knee"
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
            >
              Knee Conditions
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              to="/education/spine"
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
            >
              Spine Problems
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              to="/join"
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
            >
              Join as Surgeon
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              to="/about"
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
            >
              About Us
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
