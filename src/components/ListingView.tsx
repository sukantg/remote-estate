import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { ArrowLeft, Bed, Bath, Maximize, MapPin, Shield, Check, DollarSign, Globe } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { projectId, publicAnonKey } from '../utils/supabase/info'

const getCurrencySymbol = (currency: string): string => {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || currency
}

type Props = {
  listingId: string
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'create-listing' | 'listing-view') => void
  user: any
}

export default function ListingView({ listingId, onNavigate, user }: Props) {
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [sendingOffer, setSendingOffer] = useState(false)
  const [showOfferDialog, setShowOfferDialog] = useState(false)
  const [myOffer, setMyOffer] = useState<any>(null)
  const [retractingOffer, setRetractingOffer] = useState(false)

  useEffect(() => {
    fetchListing()
  }, [listingId])

  const fetchListing = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings/${listingId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok) {
        setListing(data.listing)
        
        // Check if the current user has a pending offer on this listing
        if (user && data.listing.offers) {
          const userOffer = data.listing.offers.find((offer: any) => 
            offer.buyerId === user.id && offer.status === 'pending'
          )
          setMyOffer(userOffer || null)
        }
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
      toast.error('Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOffer = async () => {
    if (!user) {
      toast.error('Please login to send an offer')
      onNavigate('login')
      return
    }

    if (!offerAmount) {
      toast.error('Please enter an offer amount')
      return
    }

    setSendingOffer(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please login again')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/offers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            listingId,
            amount: parseFloat(offerAmount),
            message: offerMessage,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send offer')
      }

      toast.success('Offer sent successfully!')
      setShowOfferDialog(false)
      setOfferAmount('')
      setOfferMessage('')
      fetchListing()
    } catch (error: any) {
      console.error('Send offer error:', error)
      toast.error(error.message || 'Failed to send offer')
    } finally {
      setSendingOffer(false)
    }
  }

  const handleRetractOffer = async () => {
    if (!myOffer) return

    setRetractingOffer(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please login again')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/offers/${myOffer.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retract offer')
      }

      toast.success('Offer retracted successfully')
      setMyOffer(null)
      fetchListing()
    } catch (error: any) {
      console.error('Retract offer error:', error)
      toast.error(error.message || 'Failed to retract offer')
    } finally {
      setRetractingOffer(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3FFF4] flex items-center justify-center">
        <p className="font-['Poppins'] text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#F3FFF4] flex items-center justify-center">
        <div className="text-center">
          <p className="font-['Poppins'] text-gray-600 mb-4">Listing not found</p>
          <Button onClick={() => onNavigate('dashboard')} className="bg-[#00985B] hover:bg-[#048853]">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const isSeller = user?.id === listing.sellerId

  const handleBackClick = () => {
    if (isSeller) {
      onNavigate('dashboard')
    } else {
      onNavigate('buyer-dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#F3FFF4]">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackClick}
              className="text-[#00985B]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#00985B] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="font-['Poppins'] text-[#048853] text-2xl">Remote Estate</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Carousel */}
            <Card className="overflow-hidden">
              {listing.images && listing.images.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {listing.images.map((image: string, index: number) => (
                      <CarouselItem key={index}>
                        <div className="aspect-video">
                          <ImageWithFallback
                            src={image}
                            alt={`${listing.title} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </Carousel>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <p className="font-['Poppins'] text-gray-500">No images available</p>
                </div>
              )}
            </Card>

            {/* Property Details */}
            <Card>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-2">
                        {listing.title}
                      </h1>
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                        <MapPin className="w-5 h-5" />
                        <span className="font-['Poppins']">{listing.location}</span>
                      </div>
                    </div>
                    <Badge className="bg-[#00985B] text-white hover:bg-[#048853]">
                      {listing.propertyType}
                    </Badge>
                  </div>

                  <p className="font-['Poppins'] text-5xl text-[#048853] mb-6">
                    {getCurrencySymbol(listing.currency)}{listing.price.toLocaleString()}
                  </p>

                  {/* Property Stats */}
                  <div className="grid grid-cols-3 gap-6 py-6 border-y border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#E8F5E9] rounded-lg flex items-center justify-center">
                        <Bed className="w-6 h-6 text-[#00985B]" />
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-2xl text-[#048853]">
                          {listing.bedrooms}
                        </p>
                        <p className="font-['Poppins'] text-sm text-gray-600">Bedrooms</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#E8F5E9] rounded-lg flex items-center justify-center">
                        <Bath className="w-6 h-6 text-[#00985B]" />
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-2xl text-[#048853]">
                          {listing.bathrooms}
                        </p>
                        <p className="font-['Poppins'] text-sm text-gray-600">Bathrooms</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#E8F5E9] rounded-lg flex items-center justify-center">
                        <Maximize className="w-6 h-6 text-[#00985B]" />
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-2xl text-[#048853]">
                          {listing.area}m²
                        </p>
                        <p className="font-['Poppins'] text-sm text-gray-600">Area</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-6">
                    <h2 className="font-['Poppins'] text-2xl text-[#048853] mb-4">
                      Description
                    </h2>
                    <p className="font-['Poppins'] text-gray-700 whitespace-pre-line">
                      {listing.description}
                    </p>
                  </div>

                  {listing.acceptCrypto && (
                    <div className="mt-6 p-4 bg-[#E8F5E9] border border-[#00985B] rounded-lg">
                      <div className="flex items-center gap-2 text-[#00985B]">
                        <Check className="w-5 h-5" />
                        <span className="font-['Poppins']">
                          Seller accepts cryptocurrency payments
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Info */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-['Poppins'] text-xl text-[#048853] mb-4">
                  Seller Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-['Poppins'] text-sm text-gray-600">Name</p>
                    <p className="font-['Poppins'] text-[#048853]">
                      {listing.sellerName}
                    </p>
                  </div>
                  <div>
                    <p className="font-['Poppins'] text-sm text-gray-600">Listed</p>
                    <p className="font-['Poppins'] text-[#048853]">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lawyer Verification */}
            <Card className="bg-[#E8F5E9] border-[#00985B]">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-[#00985B] rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-['Poppins'] text-lg text-[#048853] mb-2">
                      Verified by Lawyer
                    </h3>
                    <p className="font-['Poppins'] text-sm text-gray-700 mb-2">
                      This listing is verified and monitored by a licensed intermediary lawyer.
                    </p>
                    <p className="font-['Poppins'] text-sm text-[#00985B]">
                      {listing.lawyerName || 'Sarah Johnson, Esq.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Button */}
            {!isSeller && (
              myOffer ? (
                <div className="space-y-3">
                  <Button
                    disabled
                    className="w-full bg-[#00985B] hover:bg-[#048853] font-['Poppins'] py-6 text-lg"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Offer Submitted
                  </Button>
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-['Poppins'] text-sm text-gray-600">Your Offer</p>
                          <Badge className={`${
                            myOffer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            myOffer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          } capitalize`}>
                            {myOffer.status}
                          </Badge>
                        </div>
                        <p className="font-['Poppins'] text-2xl text-[#048853]">
                          {getCurrencySymbol(listing.currency)}{myOffer.amount.toLocaleString()}
                        </p>
                        {myOffer.message && (
                          <p className="font-['Poppins'] text-sm text-gray-600 pt-2 border-t">
                            {myOffer.message}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Button
                    variant="outline"
                    onClick={handleRetractOffer}
                    disabled={retractingOffer}
                    className="w-full font-['Poppins'] border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {retractingOffer ? 'Retracting...' : 'Retract Offer'}
                  </Button>
                </div>
              ) : (
                <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-[#00985B] hover:bg-[#048853] font-['Poppins'] py-6 text-lg">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Send Offer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-['Poppins']">Send an Offer</DialogTitle>
                      <DialogDescription className="font-['Poppins']">
                        Make an offer to the seller for this property
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="offer-amount" className="font-['Poppins']">
                          Offer Amount ({listing.currency})
                        </Label>
                        <Input
                          id="offer-amount"
                          type="number"
                          placeholder={listing.price.toString()}
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          className="font-['Poppins']"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offer-message" className="font-['Poppins']">
                          Message (Optional)
                        </Label>
                        <Textarea
                          id="offer-message"
                          placeholder="Add a message to the seller..."
                          value={offerMessage}
                          onChange={(e) => setOfferMessage(e.target.value)}
                          className="font-['Poppins']"
                        />
                      </div>
                      <Button
                        onClick={handleSendOffer}
                        disabled={sendingOffer}
                        className="w-full bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
                      >
                        {sendingOffer ? 'Sending...' : 'Send Offer'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            )}

            {isSeller && listing.offers && listing.offers.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-['Poppins'] text-lg text-[#048853] mb-4">
                    Recent Offers
                  </h3>
                  <div className="space-y-3">
                    {listing.offers.slice(0, 3).map((offer: any) => (
                      <div key={offer.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-['Poppins'] text-sm text-gray-600">
                            {offer.buyerName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {offer.status}
                          </Badge>
                        </div>
                        <p className="font-['Poppins'] text-lg text-[#048853]">
                          {getCurrencySymbol(listing.currency)}{offer.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
