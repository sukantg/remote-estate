import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { ArrowLeft, Shield, CreditCard, CheckCircle, User, Building, Award, MapPin, Home, DollarSign } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { supabase } from '../utils/supabase/client'

const getCurrencySymbol = (currency: string): string => {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || currency
}

type Props = {
  offerId: string
  onNavigate: (page: string) => void
  user: any
}

export default function PurchaseProcess({ offerId, onNavigate, user }: Props) {
  const [offer, setOffer] = useState<any>(null)
  const [lawyers, setLawyers] = useState<any[]>([])
  const [selectedLawyer, setSelectedLawyer] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchOfferDetails()
    fetchLawyers()
  }, [offerId])

  const fetchOfferDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login again')
        onNavigate('login')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/offers/my`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Failed to fetch offers, status:', response.status)
        const text = await response.text()
        console.error('Response text:', text)
        toast.error('Failed to load offer details')
        onNavigate('buyer-dashboard')
        return
      }

      const responseText = await response.text()
      console.log('Raw response:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response was:', responseText)
        toast.error('Invalid response from server')
        onNavigate('buyer-dashboard')
        return
      }
      
      if (data.offers) {
        const currentOffer = data.offers.find((o: any) => o.id === offerId)
        if (currentOffer) {
          setOffer(currentOffer)
        } else {
          console.error('Offer not found. Looking for:', offerId)
          console.error('Available offers:', data.offers.map((o: any) => o.id))
          toast.error('Offer not found')
          onNavigate('buyer-dashboard')
        }
      } else {
        console.error('No offers in response:', data)
        toast.error('No offers found')
        onNavigate('buyer-dashboard')
      }
    } catch (error: any) {
      console.error('Error fetching offer:', error)
      toast.error(`Failed to load offer details: ${error.message}`)
      onNavigate('buyer-dashboard')
    }
  }

  const fetchLawyers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/lawyers`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setLawyers(data.lawyers || [])
      }
    } catch (error) {
      console.error('Error fetching lawyers:', error)
      toast.error('Failed to load lawyers')
    } finally {
      setLoading(false)
    }
  }

  const handleStartPurchase = async () => {
    if (!selectedLawyer) {
      toast.error('Please select a lawyer to continue')
      return
    }

    setProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login again')
        onNavigate('login')
        return
      }

      console.log('Creating checkout session for offer:', offerId, 'with lawyer:', selectedLawyer)

      // Create Stripe checkout session
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId,
            lawyerId: selectedLawyer,
            amount: 25000, // $250.00 in cents
          }),
        }
      )

      const data = await response.json()

      console.log('Checkout session response:', { ok: response.ok, status: response.status, data })

      if (!response.ok) {
        console.error('Checkout session creation failed:', data)
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout URL
      if (data.url) {
        console.log('Redirecting to Stripe checkout:', data.url)
        window.location.href = data.url
      } else {
        console.error('No checkout URL in response:', data)
        throw new Error('No checkout URL returned from server')
      }
    } catch (error: any) {
      console.error('Purchase process error:', error)
      toast.error(error.message || 'Failed to start purchase process')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3FFF4] flex items-center justify-center">
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-sm">
          <div className="w-5 h-5 border-2 border-[#00985B] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-['Poppins'] text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-[#F3FFF4] flex items-center justify-center">
        <div className="text-center">
          <p className="font-['Poppins'] text-gray-600 mb-4">Offer not found</p>
          <Button onClick={() => onNavigate('buyer-dashboard')} className="bg-[#00985B] hover:bg-[#048853]">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3FFF4]">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => onNavigate('buyer-dashboard')}
              className="text-[#00985B]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00985B] to-[#048853] rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-['Poppins'] text-xl text-[#048853]">Purchase Process</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-['Poppins'] text-sm text-gray-600">Step 1</p>
                <p className="font-['Poppins'] text-green-600">Offer Accepted</p>
              </div>
            </div>
            <div className="flex-1 h-1 bg-[#00985B] mx-4"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00985B] rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-['Poppins'] text-sm text-gray-600">Step 2</p>
                <p className="font-['Poppins'] text-[#048853]">Select Lawyer</p>
              </div>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-['Poppins'] text-sm text-gray-600">Step 3</p>
                <p className="font-['Poppins'] text-gray-500">Payment</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Poppins'] text-2xl text-[#048853]">
                  Property Summary
                </CardTitle>
                <CardDescription className="font-['Poppins']">
                  Review the property you're purchasing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {offer.listing?.images?.[0] && (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={offer.listing.images[0]}
                        alt={offer.listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-['Poppins'] text-xl text-[#048853] mb-2">
                      {offer.listing?.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span className="font-['Poppins'] text-sm">{offer.listing?.location}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-['Poppins'] text-xs text-gray-600">Accepted Offer</p>
                        <p className="font-['Poppins'] text-2xl text-[#048853]">
                          {getCurrencySymbol(offer.listing?.currency || 'USD')}{offer.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lawyer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Poppins'] text-2xl text-[#048853]">
                  Select Your Lawyer
                </CardTitle>
                <CardDescription className="font-['Poppins']">
                  Choose a verified lawyer to handle your contract and legal verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lawyer-select" className="font-['Poppins']">
                    Available Lawyers
                  </Label>
                  <Select value={selectedLawyer} onValueChange={setSelectedLawyer}>
                    <SelectTrigger id="lawyer-select" className="font-['Poppins']">
                      <SelectValue placeholder="Select a lawyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {lawyers.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="font-['Poppins'] text-sm text-gray-600">
                            No lawyers available
                          </p>
                        </div>
                      ) : (
                        lawyers.map((lawyer) => (
                          <SelectItem key={lawyer.id} value={lawyer.id}>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-[#00985B]" />
                              <span className="font-['Poppins']">{lawyer.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Lawyer Details */}
                {selectedLawyer && (
                  <Card className="bg-[#F3FFF4] border-[#00985B]">
                    <CardContent className="pt-6">
                      {lawyers.find(l => l.id === selectedLawyer) && (
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-[#00985B] rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-['Poppins'] text-lg text-[#048853] mb-1">
                                {lawyers.find(l => l.id === selectedLawyer)?.name}
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Building className="w-4 h-4" />
                                  <span className="font-['Poppins']">
                                    {lawyers.find(l => l.id === selectedLawyer)?.firmName || 'Independent Practice'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Award className="w-4 h-4" />
                                  <span className="font-['Poppins']">
                                    Bar License: {lawyers.find(l => l.id === selectedLawyer)?.barLicense}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-[#00985B]/20">
                            <div className="flex items-center gap-2 text-[#00985B]">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-['Poppins'] text-sm">Verified & Licensed</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Payment Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="font-['Poppins'] text-xl text-[#048853]">
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <span className="font-['Poppins'] text-sm text-gray-600">Legal Service Fee</span>
                    <span className="font-['Poppins'] text-gray-900">$250.00</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <span className="font-['Poppins'] text-sm text-gray-600">Processing Fee</span>
                    <span className="font-['Poppins'] text-gray-900">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-['Poppins'] text-lg">Total</span>
                    <span className="font-['Poppins'] text-2xl text-[#048853]">$250.00</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-['Poppins'] text-sm text-blue-900">
                    <strong>Note:</strong> This is a one-time fee for legal services including contract review, verification, and escrow management.
                  </p>
                </div>

                <Button
                  onClick={handleStartPurchase}
                  disabled={!selectedLawyer || processing}
                  className="w-full bg-[#00985B] hover:bg-[#048853] font-['Poppins'] py-6 text-lg"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Proceed to Payment
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 text-xs">
                    <Shield className="w-4 h-4" />
                    <span className="font-['Poppins']">Secure payment powered by Stripe</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Poppins'] text-lg text-[#048853]">
                  What's Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00985B] flex-shrink-0 mt-0.5" />
                    <span className="font-['Poppins'] text-sm text-gray-700">
                      Complete contract review
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00985B] flex-shrink-0 mt-0.5" />
                    <span className="font-['Poppins'] text-sm text-gray-700">
                      Legal verification of property documents
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00985B] flex-shrink-0 mt-0.5" />
                    <span className="font-['Poppins'] text-sm text-gray-700">
                      Escrow management services
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00985B] flex-shrink-0 mt-0.5" />
                    <span className="font-['Poppins'] text-sm text-gray-700">
                      Transaction security guarantee
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
