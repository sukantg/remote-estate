import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Globe, Mail, Lock, User, ArrowLeft, Shield, Home, ShoppingBag, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

type Props = {
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'lawyer-dashboard' | 'create-listing' | 'listing-view') => void
}

export default function SignUp({ onNavigate }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [userType, setUserType] = useState<'seller' | 'buyer' | 'lawyer'>('seller')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [barAssociation, setBarAssociation] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const signupData: any = { name, email, password, userType }
      
      // Add lawyer-specific fields if lawyer signup
      if (userType === 'lawyer') {
        signupData.licenseNumber = licenseNumber
        signupData.barAssociation = barAssociation
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(signupData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        // Handle duplicate email error (409)
        if (response.status === 409) {
          toast.error(data.error || 'This email is already registered', {
            action: {
              label: 'Login',
              onClick: () => onNavigate('login')
            },
            duration: 5000
          })
          return
        }
        throw new Error(data.error || 'Signup failed')
      }

      setStep(2)
      toast.success('Account created successfully!')
      
      setTimeout(() => {
        onNavigate('login')
      }, 2000)
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const getUserTypeInfo = (type: 'seller' | 'buyer' | 'lawyer') => {
    switch (type) {
      case 'seller':
        return {
          icon: <Home className="w-6 h-6" />,
          title: 'Join as a Seller',
          description: 'List properties and connect with global buyers',
          benefits: [
            'List unlimited properties',
            'Receive offers from verified buyers',
            'Secure lawyer-backed transactions',
            'Global property marketplace'
          ]
        }
      case 'buyer':
        return {
          icon: <ShoppingBag className="w-6 h-6" />,
          title: 'Join as a Buyer',
          description: 'Browse verified properties worldwide',
          benefits: [
            'Access verified property listings',
            'Make secure offers remotely',
            'Lawyer-verified contracts',
            'International property search'
          ]
        }
      case 'lawyer':
        return {
          icon: <Shield className="w-6 h-6" />,
          title: 'Join as a Lawyer',
          description: 'Review and verify property contracts',
          benefits: [
            'Expand your client base globally',
            'Review property contracts',
            'Earn from verification services',
            'Build your professional network'
          ]
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

        {step === 1 ? (
          <Card className="border-none shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">
              {/* Left Side - Form */}
              <div className="p-12 lg:p-16">
                <div className="max-w-md mx-auto">
                  <div className="mb-8">
                    <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-3">
                      Create Account
                    </h1>
                    <p className="font-['Poppins'] text-lg text-gray-600">
                      Get started with Remote Estate today
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
                      <Label htmlFor="name" className="font-['Poppins'] text-base">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-12 h-14 font-['Poppins'] text-base"
                          required
                        />
                      </div>
                    </div>

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
                      <Label htmlFor="password" className="font-['Poppins'] text-base">
                        Password
                      </Label>
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
                          minLength={6}
                        />
                      </div>
                      <p className="font-['Poppins'] text-sm text-gray-500">
                        Must be at least 6 characters
                      </p>
                    </div>

                    {/* Lawyer-specific fields */}
                    {userType === 'lawyer' && (
                      <>
                        <div className="space-y-3">
                          <Label htmlFor="licenseNumber" className="font-['Poppins'] text-base">
                            License Number
                          </Label>
                          <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="licenseNumber"
                              type="text"
                              placeholder="Your bar license number"
                              value={licenseNumber}
                              onChange={(e) => setLicenseNumber(e.target.value)}
                              className="pl-12 h-14 font-['Poppins'] text-base"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="barAssociation" className="font-['Poppins'] text-base">
                            Bar Association
                          </Label>
                          <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="barAssociation"
                              type="text"
                              placeholder="e.g., California State Bar"
                              value={barAssociation}
                              onChange={(e) => setBarAssociation(e.target.value)}
                              className="pl-12 h-14 font-['Poppins'] text-base"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-[#00985B] hover:bg-[#048853] h-14 text-lg font-['Poppins']"
                      disabled={loading}
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>

                    <div className="text-center pt-2">
                      <p className="font-['Poppins'] text-base text-gray-600">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => onNavigate('login')}
                          className="text-[#00985B] hover:underline"
                        >
                          Sign in
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

                  <div className="space-y-5">
                    {currentUserInfo.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <p className="font-['Poppins'] text-white/90">
                          {benefit}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white"></div>
                        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white"></div>
                        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white"></div>
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-sm text-white/70">
                          Join 10,000+ users
                        </p>
                      </div>
                    </div>
                    <p className="font-['Poppins'] text-sm text-white/90">
                      "The platform's security and ease of use made our international property sale effortless."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-none shadow-2xl max-w-2xl mx-auto">
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-[#00985B] rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-['Poppins'] text-4xl text-[#048853] mb-4">
                Welcome to Remote Estate!
              </h2>
              <p className="font-['Poppins'] text-lg text-gray-600 mb-12 max-w-md mx-auto">
                Your account has been created successfully. You can now log in and start your journey with us.
              </p>
              <Button
                onClick={() => onNavigate('login')}
                className="bg-[#00985B] hover:bg-[#048853] h-14 px-12 text-lg font-['Poppins']"
              >
                Continue to Login
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
