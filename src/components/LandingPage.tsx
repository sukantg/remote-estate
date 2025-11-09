import { Button } from './ui/button'
import { Shield, FileCheck, Globe, ArrowRight } from 'lucide-react'

type Props = {
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'create-listing' | 'listing-view') => void
}

export default function LandingPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#00985B] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="font-['Poppins'] text-white text-2xl">Remote Estate</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 font-['Poppins']"
              onClick={() => onNavigate('login')}
            >
              Login
            </Button>
            <Button 
              className="bg-white text-[#00985B] hover:bg-white/90 font-['Poppins']"
              onClick={() => onNavigate('signup')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[700px] bg-[#00985B] overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1622015663381-d2e05ae91b72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBtb2Rlcm4lMjB2aWxsYXxlbnwxfHx8fDE3NjI1MDgxNTV8MA&ixlib=rb-4.1.0&q=80&w=1080)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-8 pt-32 pb-20">
          <div className="text-center">
            <h1 className="font-['Poppins'] text-white text-6xl mb-6">
              Sell your property remotely, securely
            </h1>
            <p className="font-['Poppins'] text-white/90 text-2xl mb-12 max-w-4xl mx-auto">
              Connect with global buyers and finalize contracts through verified intermediary lawyers. 
              Save time, reduce stress, and eliminate hidden costs.
            </p>
            <Button 
              size="lg"
              className="bg-white text-[#00985B] hover:bg-white/90 px-12 py-6 text-xl"
              onClick={() => onNavigate('signup')}
            >
              Create Your First Listing <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-[#F3FFF4] py-20">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="font-['Poppins'] text-[#048853] text-5xl text-center mb-16">
            Why Choose Remote Estate?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white rounded-xl p-8 text-center shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
              <div className="w-16 h-16 bg-[#00985B] rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-['Poppins'] text-2xl text-[#048853] mb-3">
                Verified Lawyers
              </h3>
              <p className="font-['Poppins'] text-gray-600">
                All transactions are overseen by licensed, verified legal professionals who ensure compliance and security.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 text-center shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
              <div className="w-16 h-16 bg-[#00985B] rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                <FileCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-['Poppins'] text-2xl text-[#048853] mb-3">
                Secure Contract Signing
              </h3>
              <p className="font-['Poppins'] text-gray-600">
                Digital contract management with secure e-signatures and document verification at every step.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 text-center shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
              <div className="w-16 h-16 bg-[#00985B] rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-['Poppins'] text-2xl text-[#048853] mb-3">
                Global Buyers
              </h3>
              <p className="font-['Poppins'] text-gray-600">
                Reach international buyers looking for remote property investments worldwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="font-['Poppins'] text-[#048853] text-5xl text-center mb-16">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00985B] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                1
              </div>
              <h3 className="font-['Poppins'] text-xl text-[#048853] mb-2">Create Account</h3>
              <p className="font-['Poppins'] text-gray-600">Sign up and verify your identity</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00985B] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                2
              </div>
              <h3 className="font-['Poppins'] text-xl text-[#048853] mb-2">List Property</h3>
              <p className="font-['Poppins'] text-gray-600">Add details, photos, and documents</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00985B] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                3
              </div>
              <h3 className="font-['Poppins'] text-xl text-[#048853] mb-2">Review Offers</h3>
              <p className="font-['Poppins'] text-gray-600">Receive and negotiate with buyers</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#00985B] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                4
              </div>
              <h3 className="font-['Poppins'] text-xl text-[#048853] mb-2">Sign Contract</h3>
              <p className="font-['Poppins'] text-gray-600">Finalize with verified lawyer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Triple CTA Section */}
      <section className="bg-[#00985B] py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]">
              <h2 className="font-['Poppins'] text-white text-4xl mb-4">
                For Sellers
              </h2>
              <p className="font-['Poppins'] text-white/90 text-lg mb-6">
                List your property and connect with verified buyers worldwide
              </p>
              <Button 
                size="lg"
                className="bg-white text-[#00985B] hover:bg-white/90 px-8 py-4 text-lg font-['Poppins']"
                onClick={() => onNavigate('signup')}
              >
                List Your Property
              </Button>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]">
              <h2 className="font-['Poppins'] text-white text-4xl mb-4">
                For Buyers
              </h2>
              <p className="font-['Poppins'] text-white/90 text-lg mb-6">
                Browse verified properties with lawyer-backed security
              </p>
              <Button 
                size="lg"
                className="bg-white text-[#00985B] hover:bg-white/90 px-8 py-4 text-lg font-['Poppins']"
                onClick={() => onNavigate('login')}
              >
                Browse Properties
              </Button>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]">
              <h2 className="font-['Poppins'] text-white text-4xl mb-4">
                For Lawyers
              </h2>
              <p className="font-['Poppins'] text-white/90 text-lg mb-6">
                Review and verify property contracts for secure transactions
              </p>
              <Button 
                size="lg"
                className="bg-white text-[#00985B] hover:bg-white/90 px-8 py-4 text-lg font-['Poppins']"
                onClick={() => onNavigate('signup')}
              >
                Join as Lawyer
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#00985B] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="font-['Poppins'] text-xl">Remote Estate</span>
              </div>
              <p className="font-['Poppins'] text-gray-400 text-sm">
                Secure remote property transactions worldwide
              </p>
            </div>
            <div>
              <h4 className="font-['Poppins'] mb-4">About</h4>
              <ul className="space-y-2 font-['Poppins'] text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">How It Works</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-['Poppins'] mb-4">Support</h4>
              <ul className="space-y-2 font-['Poppins'] text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-['Poppins'] mb-4">Legal</h4>
              <ul className="space-y-2 font-['Poppins'] text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Legal Notices</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="font-['Poppins'] text-gray-400 text-sm">
              © 2025 Remote Estate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
