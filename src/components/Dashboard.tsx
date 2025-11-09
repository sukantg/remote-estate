import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Home, FileText, Inbox, FileSignature, Settings, LogOut, Plus, Globe, Trash2, User as UserIcon, Shield } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'

const getCurrencySymbol = (currency: string): string => {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || currency
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"

type Props = {
  user: any
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'create-listing' | 'listing-view', listingId?: string) => void
  onLogout: () => void
}

export default function Dashboard({ user, onNavigate, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null)
  const [decliningOfferId, setDecliningOfferId] = useState<string | null>(null)
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null)
  const [lawyers, setLawyers] = useState<any[]>([])
  const [selectedLawyer, setSelectedLawyer] = useState<string>('')
  const [showLawyerDialog, setShowLawyerDialog] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<any>(null)

  useEffect(() => {
    fetchMyListings()
    fetchLawyers()
  }, [])

  const fetchMyListings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) return

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings/my`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok) {
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalOffers = listings.reduce((sum, listing) => 
    sum + (listing.offers?.filter((o: any) => o.status === 'pending').length || 0), 0
  )
  const activeListings = listings.filter(l => l.status === 'active').length

  const fetchLawyers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) return

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/lawyers`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok) {
        setLawyers(data.lawyers || [])
      }
    } catch (error) {
      console.error('Error fetching lawyers:', error)
    }
  }

  const handleShowLawyerSelection = (offer: any) => {
    setSelectedOffer(offer)
    setSelectedLawyer('')
    setShowLawyerDialog(true)
  }

  const handleAcceptOffer = async () => {
    if (!selectedOffer || !selectedLawyer) {
      toast.error('Please select a lawyer')
      return
    }

    setAcceptingOfferId(selectedOffer.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('No active session found')
        setAcceptingOfferId(null)
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/offers/${selectedOffer.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            status: 'accepted',
            lawyerId: selectedLawyer 
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept offer')
      }

      toast.success('Offer accepted! The contract has been sent to the lawyer for review.')
      
      // Close dialog and reset state
      setShowLawyerDialog(false)
      setSelectedOffer(null)
      setSelectedLawyer('')
      
      // Refresh listings to update UI
      await fetchMyListings()
    } catch (error: any) {
      console.error('Error accepting offer:', error)
      toast.error(error.message || 'Failed to accept offer. Please try again.')
    } finally {
      setAcceptingOfferId(null)
    }
  }

  const handleDeclineOffer = async (offerId: string) => {
    setDecliningOfferId(offerId)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('No active session found')
        setDecliningOfferId(null)
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/offers/${offerId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'declined' }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline offer')
      }

      toast.success('Offer declined successfully')
      
      // Refresh listings to update UI
      await fetchMyListings()
    } catch (error: any) {
      console.error('Error declining offer:', error)
      toast.error(error.message || 'Failed to decline offer. Please try again.')
    } finally {
      setDecliningOfferId(null)
    }
  }

  const handleDeleteListing = async (listingId: string) => {
    setDeletingListingId(listingId)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('No active session found')
        setDeletingListingId(null)
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings/${listingId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete listing')
      }

      toast.success('Listing deleted successfully')
      
      // Refresh listings
      await fetchMyListings()
    } catch (error: any) {
      console.error('Error deleting listing:', error)
      toast.error(error.message || 'Failed to delete listing. Please try again.')
    } finally {
      setDeletingListingId(null)
    }
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('No active session found')
        setDeletingAccount(false)
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/account`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      toast.success('Account deleted successfully')
      
      // Sign out and redirect to landing page
      await supabase.auth.signOut()
      onLogout()
      onNavigate('landing')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error(error.message || 'Failed to delete account. Please try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const getUserInitials = () => {
    const name = user?.user_metadata?.name || user?.email || ''
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-[#F3FFF4] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#00985B] to-[#048853] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-['Poppins'] text-[#048853] text-xl">Remote Estate</h1>
              <p className="font-['Poppins'] text-xs text-gray-500">Seller Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Poppins'] transition-all duration-300 hover:scale-[1.02] ${
                activeTab === 'dashboard'
                  ? 'bg-[#00985B] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <Home className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Poppins'] transition-all duration-300 hover:scale-[1.02] ${
                activeTab === 'listings'
                  ? 'bg-[#00985B] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <FileText className="w-5 h-5" />
              My Listings
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Poppins'] transition-all duration-300 hover:scale-[1.02] ${
                activeTab === 'offers'
                  ? 'bg-[#00985B] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <Inbox className="w-5 h-5" />
              Offers Received
              {totalOffers > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {totalOffers}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Poppins'] transition-all duration-300 hover:scale-[1.02] ${
                activeTab === 'contracts'
                  ? 'bg-[#00985B] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <FileSignature className="w-5 h-5" />
              Contracts
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Poppins'] transition-all duration-300 hover:scale-[1.02] ${
                activeTab === 'settings'
                  ? 'bg-[#00985B] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <Settings className="w-5 h-5" />
              Profile & Settings
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 border-2 border-[#00985B]">
                <AvatarFallback className="bg-gradient-to-br from-[#00985B] to-[#048853] text-white font-['Poppins']">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-['Poppins'] text-sm text-gray-900 truncate">
                  {user.user_metadata?.name || 'Seller'}
                </p>
                <p className="font-['Poppins'] text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 w-full justify-center font-['Poppins'] text-xs">
              Seller Account
            </Badge>
          </div>
          <Button
            variant="outline"
            className="w-full font-['Poppins'] text-gray-700 hover:text-red-600 hover:border-red-600 transition-colors"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-2">
                Welcome back, {user.user_metadata?.name || 'Seller'}!
              </h1>
              <p className="font-['Poppins'] text-gray-600">
                Manage your property listings and track offers from buyers worldwide
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                  <CardTitle className="font-['Poppins'] text-lg text-gray-600">
                    Total Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-['Poppins'] text-4xl text-[#048853]">
                    {listings.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                  <CardTitle className="font-['Poppins'] text-lg text-gray-600">
                    Offers Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-['Poppins'] text-4xl text-[#048853]">
                    {totalOffers}
                  </p>
                </CardContent>
              </Card>
              <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                  <CardTitle className="font-['Poppins'] text-lg text-gray-600">
                    Contracts Signed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-['Poppins'] text-4xl text-[#048853]">0</p>
                </CardContent>
              </Card>
            </div>

            {/* Add New Listing CTA */}
            <Card className="border-2 border-dashed border-[#00985B] bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                  onClick={() => onNavigate('create-listing')}>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-[#00985B] rounded-full flex items-center justify-center mb-4 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-['Poppins'] text-2xl text-[#048853] mb-2">
                  Add New Listing
                </h3>
                <p className="font-['Poppins'] text-gray-600 text-center">
                  Create a new property listing and reach buyers worldwide
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'listings' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-['Poppins'] text-4xl text-[#048853]">My Listings</h1>
              <Button
                className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
                onClick={() => onNavigate('create-listing')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Listing
              </Button>
            </div>

            {loading ? (
              <p className="font-['Poppins'] text-gray-600">Loading...</p>
            ) : listings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="font-['Poppins'] text-gray-600 text-center mb-4">
                    No listings yet. Create your first property listing to get started.
                  </p>
                  <Button
                    className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
                    onClick={() => onNavigate('create-listing')}
                  >
                    Create Listing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card
                    key={listing.id}
                    className="hover:shadow-lg transition-shadow relative"
                  >
                    <div 
                      className="cursor-pointer" 
                      onClick={() => onNavigate('listing-view', listing.id)}
                    >
                      <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardHeader>
                        <CardTitle className="font-['Poppins'] text-xl text-[#048853]">
                          {listing.title}
                        </CardTitle>
                        <CardDescription className="font-['Poppins']">
                          {listing.location}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="font-['Poppins'] text-2xl text-[#048853] mb-2">
                          {getCurrencySymbol(listing.currency)}{listing.price.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 font-['Poppins']">
                          <span>{listing.bedrooms} beds</span>
                          <span>•</span>
                          <span>{listing.bathrooms} baths</span>
                          <span>•</span>
                          <span>{listing.area}m²</span>
                        </div>
                        {listing.offers?.length > 0 && (
                          <div className="mt-3 text-sm font-['Poppins'] text-[#00985B]">
                            {listing.offers.length} {listing.offers.length === 1 ? 'offer' : 'offers'} received
                          </div>
                        )}
                      </CardContent>
                    </div>
                    <div className="px-6 pb-6">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full font-['Poppins'] text-red-600 hover:text-red-700 hover:border-red-600 transition-all duration-300"
                            disabled={deletingListingId === listing.id}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deletingListingId === listing.id ? 'Deleting...' : 'Delete Listing'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-['Poppins']">
                              Delete this listing?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-['Poppins']">
                              This action cannot be undone. This will permanently delete the listing
                              "{listing.title}" and remove all associated offers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-['Poppins']">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 font-['Poppins']"
                              onClick={() => handleDeleteListing(listing.id)}
                            >
                              Delete Listing
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div>
            <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-8">Offers Received</h1>
            {listings.filter(l => l.offers?.filter((o: any) => o.status === 'pending').length > 0).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Inbox className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="font-['Poppins'] text-gray-600 text-center">
                    No pending offers. Your active listings will appear here when buyers send offers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) =>
                  listing.offers?.filter((o: any) => o.status === 'pending').map((offer: any) => (
                    <Card key={offer.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="font-['Poppins'] text-xl text-[#048853]">
                              Offer for {listing.title}
                            </CardTitle>
                            <CardDescription className="font-['Poppins']">
                              From {offer.buyerName}
                            </CardDescription>
                          </div>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-['Poppins']">
                            Pending
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="font-['Poppins'] text-2xl text-[#048853] mb-2">
                          {getCurrencySymbol(listing.currency)}{offer.amount.toLocaleString()}
                        </p>
                        {offer.message && (
                          <p className="font-['Poppins'] text-gray-600 mb-4">
                            "{offer.message}"
                          </p>
                        )}
                        <p className="font-['Poppins'] text-sm text-gray-500">
                          Received {new Date(offer.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-3 mt-4">
                          <Button 
                            className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
                            onClick={() => handleShowLawyerSelection(offer)}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Select Lawyer & Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            className="font-['Poppins'] text-red-600 hover:text-red-700"
                            onClick={() => handleDeclineOffer(offer.id)}
                            disabled={decliningOfferId === offer.id}
                          >
                            {decliningOfferId === offer.id ? 'Declining...' : 'Decline'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-8">Contracts</h1>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSignature className="w-16 h-16 text-gray-300 mb-4" />
                <p className="font-['Poppins'] text-gray-600 text-center">
                  No contracts yet. Accepted offers will appear here for lawyer verification and signing.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-8">Profile & Settings</h1>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Poppins']">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-['Poppins'] text-sm text-gray-600">Name</p>
                    <p className="font-['Poppins'] text-lg text-[#048853]">
                      {user.user_metadata?.name || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="font-['Poppins'] text-sm text-gray-600">Email</p>
                    <p className="font-['Poppins'] text-lg text-[#048853]">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p className="font-['Poppins'] text-sm text-gray-600">Member Since</p>
                    <p className="font-['Poppins'] text-lg text-[#048853]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="font-['Poppins'] text-red-600">Danger Zone</CardTitle>
                  <CardDescription className="font-['Poppins']">
                    Irreversible actions that will permanently affect your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="font-['Poppins']"
                        disabled={deletingAccount}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletingAccount ? 'Deleting...' : 'Delete Account'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-['Poppins']">
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-['Poppins']">
                          This action cannot be undone. This will permanently delete your account,
                          all your property listings, uploaded images, and remove all associated data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="font-['Poppins']">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 font-['Poppins']"
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                        >
                          {deletingAccount ? 'Deleting...' : 'Delete Account'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="font-['Poppins'] text-sm text-gray-600 mt-3">
                    Once you delete your account, there is no going back. All your listings,
                    offers, and data will be permanently removed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Lawyer Selection Dialog */}
      <Dialog open={showLawyerDialog} onOpenChange={setShowLawyerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-['Poppins'] text-2xl text-[#048853]">
              <Shield className="inline w-6 h-6 mr-2" />
              Select Lawyer
            </DialogTitle>
            <DialogDescription className="font-['Poppins']">
              Choose a verified lawyer to handle the contract for this property transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="lawyer" className="font-['Poppins']">
              Verified Lawyer
            </Label>
            <Select value={selectedLawyer} onValueChange={setSelectedLawyer}>
              <SelectTrigger id="lawyer" className="w-full mt-2 font-['Poppins']">
                <SelectValue placeholder="Select a lawyer" />
              </SelectTrigger>
              <SelectContent>
                {lawyers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 font-['Poppins']">
                    No verified lawyers available
                  </div>
                ) : (
                  lawyers.map((lawyer) => (
                    <SelectItem key={lawyer.id} value={lawyer.id} className="font-['Poppins']">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#00985B]" />
                        <div>
                          <p className="font-medium">{lawyer.name}</p>
                          <p className="text-xs text-gray-500">
                            {lawyer.licenseNumber} • {lawyer.barAssociation}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLawyerDialog(false)
                setSelectedOffer(null)
                setSelectedLawyer('')
              }}
              className="font-['Poppins']"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptOffer}
              disabled={!selectedLawyer || acceptingOfferId === selectedOffer?.id}
              className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
            >
              {acceptingOfferId === selectedOffer?.id ? 'Accepting...' : 'Accept Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
