import Link from 'next/link';
import { Shield, Brain, Heart, Video, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
import Link from "next/link";
import { Shield, Brain, Heart, Video, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter text-blue-600">
            Companion<span className="text-slate-900">X</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-blue-600 transition">
              How it Works
            </Link>
            <Link href="#safety" className="hover:text-blue-600 transition">
              Safety
            </Link>
            <Link href="/login" className="hover:text-blue-600 transition">
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition shadow-md shadow-blue-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[100px] opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight leading-[1.1]">
            Your mind matters. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Heal anonymously.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Bangladesh's first AI-powered mental wellness platform. Connect with
            professional consultants and track your mood in total privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all"
            >
              Start Free Journey
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              No real name required
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Crafted for your well-being
            </h2>
            <p className="text-slate-500">
              Every feature is designed with privacy and science in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-600" />}
              title="Total Anonymity"
              description="Register with an avatar. We never ask for your real name in counseling sessions."
            />
            <FeatureCard
              icon={<Brain className="w-8 h-8 text-indigo-600" />}
              title="AI-Powered Care"
              description="Get personalized mental exercises and consultant matches based on your mood journal."
            />
            <FeatureCard
              icon={<Video className="w-8 h-8 text-blue-600" />}
              title="Private Video Calls"
              description="Secure, browser-based video sessions via Jitsi. No downloads, no footprints."
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="safety" className="py-24">
        <div className="max-w-5xl mx-auto px-6 bg-blue-600 rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <Heart className="w-16 h-16 mx-auto mb-8 opacity-80" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Always Safe. Always Here.
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto">
            Our AI monitors your journal for safety. If things get hard, we
            alert the right people immediately. You are never alone.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-lg"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p>
            © {new Date().getFullYear()} CompanionX. Made with care in
            Bangladesh.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group">
      <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:bg-blue-50 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
import Image from "next/image";

export function Home() {
>>>>>>> bb01e18 (frontend till upgrade 1)
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter text-blue-600">
            Companion<span className="text-slate-900">X</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-blue-600 transition">How it Works</Link>
            <Link href="#safety" className="hover:text-blue-600 transition">Safety</Link>
            <Link href="/login" className="hover:text-blue-600 transition">Sign In</Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition shadow-md shadow-blue-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[100px] opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight leading-[1.1]">
            Your mind matters. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Heal anonymously.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Bangladesh's first AI-powered mental wellness platform. Connect with professional consultants and track your mood in total privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all"
            >
              Start Free Journey
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                No real name required
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Crafted for your well-being</h2>
            <p className="text-slate-500">Every feature is designed with privacy and science in mind.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-600" />}
              title="Total Anonymity"
              description="Register with an avatar. We never ask for your real name in counseling sessions."
            />
            <FeatureCard
              icon={<Brain className="w-8 h-8 text-indigo-600" />}
              title="AI-Powered Care"
              description="Get personalized mental exercises and consultant matches based on your mood journal."
            />
            <FeatureCard
              icon={<Video className="w-8 h-8 text-blue-600" />}
              title="Private Video Calls"
              description="Secure, browser-based video sessions via Jitsi. No downloads, no footprints."
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="safety" className="py-24">
        <div className="max-w-5xl mx-auto px-6 bg-blue-600 rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <Heart className="w-16 h-16 mx-auto mb-8 opacity-80" />
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Always Safe. Always Here.</h2>
            <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto">
                Our AI monitors your journal for safety. If things get hard, we alert the right people immediately. You are never alone.
            </p>
            <Link
              href="/register"
              className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-lg"
            >
              Get Started for Free
            </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} CompanionX. Made with care in Bangladesh.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group">
      <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:bg-blue-50 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
