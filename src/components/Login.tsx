import { useState } from 'react'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Globe, Mail, Lock, ArrowLeft, Home, ShoppingBag, Shield } from 'lucide-react'
import { toast } from 'sonner@2.0.3'

type Props = {
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'lawyer-dashboard' | 'create-listing' | 'listing-view') => void
  setUser: (user: any) => void
  onLoginSuccess?: (user: any, userType: 'seller' | 'buyer' | 'lawyer') => void
}

export default function Login({ onNavigate, setUser, onLoginSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState<'seller' | 'buyer' | 'lawyer'>('seller')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials and try again.', {
            action: {
              label: 'Sign Up',
              onClick: () => onNavigate('signup')
            },
            duration: 6000
          })
          setLoading(false)
          return
        }
        throw error
      }

      if (data.session) {
        setUser(data.user)
        toast.success(`Login successful! Welcome ${userType}!`)
        
        if (onLoginSuccess) {
          onLoginSuccess(data.user, userType)
        } else {
          // Fallback for backward compatibility
          if (userType === 'buyer') {
            onNavigate('buyer-dashboard')
          } else if (userType === 'lawyer') {
            onNavigate('lawyer-dashboard')
          } else {
            onNavigate('dashboard')
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    toast.info('Password reset functionality coming soon')
  }

  const getUserTypeInfo = (type: 'seller' | 'buyer' | 'lawyer') => {
    switch (type) {
      case 'seller':
        return {
          icon: <Home className="w-5 h-5" />,
          title: 'Seller Login',
          description: 'List your properties and manage offers'
        }
      case 'buyer':
        return {
          icon: <ShoppingBag className="w-5 h-5" />,
          title: 'Buyer Login',
          description: 'Browse properties and make offers'
        }
      case 'lawyer':
        return {
          icon: <Shield className="w-5 h-5" />,
          title: 'Lawyer Login',
          description: 'Review and verify property contracts'
        }
    }
  }

  const currentUserInfo = getUserTypeInfo(userType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3FFF4] via-white to-[#F3FFF4] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Logo and Back Button */}
        <div className="flex items-center justify-between mb-12">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onNavigate('landing')}
            className="text-[#00985B] hover:bg-[#00985B]/10 font-['Poppins']"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00985B] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <span className="font-['Poppins'] text-[#048853] text-3xl">Remote Estate</span>
          </div>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
            {/* Left Side - Form */}
            <div className="p-12 lg:p-16">
              <div className="max-w-md mx-auto">
                <div className="mb-8">
                  <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-3">
                    Welcome Back
                  </h1>
                  <p className="font-['Poppins'] text-lg text-gray-600">
                    Sign in to your account to continue
                  </p>
                </div>

                {/* User Type Toggle */}
                <Tabs value={userType} onValueChange={(v) => setUserType(v as 'seller' | 'buyer' | 'lawyer')} className="mb-8">
                  <TabsList className="grid w-full grid-cols-3 h-14 p-1">
                    <TabsTrigger value="seller" className="font-['Poppins'] text-base">
                      <Home className="w-4 h-4 mr-2" />
                      Seller
                    </TabsTrigger>
                    <TabsTrigger value="buyer" className="font-['Poppins'] text-base">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Buyer
                    </TabsTrigger>
                    <TabsTrigger value="lawyer" className="font-['Poppins'] text-base">
                      <Shield className="w-4 h-4 mr-2" />
                      Lawyer
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="font-['Poppins'] text-base">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 font-['Poppins'] text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-['Poppins'] text-base">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-[#00985B] hover:underline font-['Poppins']"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 font-['Poppins'] text-base"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#00985B] hover:bg-[#048853] h-14 text-lg font-['Poppins']"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="text-center pt-2">
                    <p className="font-['Poppins'] text-base text-gray-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => onNavigate('signup')}
                        className="text-[#00985B] hover:underline"
                      >
                        Create one now
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Side - Info Panel */}
            <div className="bg-gradient-to-br from-[#00985B] to-[#048853] p-12 lg:p-16 text-white flex flex-col justify-center">
              <div className="max-w-md">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-8 backdrop-blur-sm">
                  {currentUserInfo.icon}
                </div>
                
                <h2 className="font-['Poppins'] text-4xl mb-4">
                  {currentUserInfo.title}
                </h2>
                <p className="font-['Poppins'] text-xl text-white/90 mb-12">
                  {currentUserInfo.description}
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-['Poppins'] text-lg mb-1">Secure Transactions</h3>
                      <p className="font-['Poppins'] text-white/80 text-sm">
                        All transactions are protected with verified lawyer oversight
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-['Poppins'] text-lg mb-1">Global Reach</h3>
                      <p className="font-['Poppins'] text-white/80 text-sm">
                        Connect with buyers and sellers from around the world
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-['Poppins'] text-lg mb-1">Easy Process</h3>
                      <p className="font-['Poppins'] text-white/80 text-sm">
                        Streamlined workflow from listing to contract signing
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                  <p className="font-['Poppins'] text-sm text-white/90 italic">
                    "Remote Estate made selling my property internationally seamless. The verified lawyer system gave me complete peace of mind."
                  </p>
                  <p className="font-['Poppins'] text-sm text-white/70 mt-3">
                    — Michael Chen, Property Seller
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
