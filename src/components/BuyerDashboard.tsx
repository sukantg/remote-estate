import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import DashboardHeader from './DashboardHeader'
import { Home, Search, Heart, FileText, User, MapPin, Bed, Bath, Square, Shield, X, CheckCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Badge } from './ui/badge'

const getCurrencySymbol = (currency: string): string => {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || currency
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Label } from './ui/label'

type Props = {
  user: any
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'listing-view' | 'purchase-process', listingId?: string, offerId?: string) => void
  onLogout: () => void
}

export default function BuyerDashboard({ user, onNavigate, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('browse')
  const [listings, setListings] = useState<any[]>([])
  const [filteredListings, setFilteredListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priceFilter, setPriceFilter] = useState('all')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all')
  const [savedListings, setSavedListings] = useState<string[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [lawyerDialogOpen, setLawyerDialogOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [lawyers, setLawyers] = useState<any[]>([])
  const [selectedLawyerId, setSelectedLawyerId] = useState('')
  const [creatingContract, setCreatingContract] = useState(false)
  const [algoliaEnabled, setAlgoliaEnabled] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    initializeAlgolia()
    fetchAllListings()
    loadSavedListings()
  }, [])

  useEffect(() => {
    if (activeTab === 'offers') {
      fetchMyOffers()
    }
  }, [activeTab])

  useEffect(() => {
    if (searchQuery.trim() && algoliaEnabled) {
      performAlgoliaSearch()
    } else {
      applyFilters()
    }
  }, [listings, searchQuery, priceFilter, propertyTypeFilter, algoliaEnabled])

  const initializeAlgolia = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/algolia-config`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )
      
      const data = await response.json()
      if (response.ok && data.enabled) {
        setAlgoliaEnabled(true)
        console.log('Algolia search enabled')
      } else {
        setAlgoliaEnabled(false)
        console.log('Algolia not configured, using standard search')
      }
    } catch (error) {
      console.error('Error checking Algolia availability:', error)
      setAlgoliaEnabled(false)
    }
  }

  const performAlgoliaSearch = async () => {
    if (!searchQuery.trim()) {
      applyFilters()
      return
    }

    setIsSearching(true)
    try {
      // Build filters for Algolia
      let filters = ''
      if (propertyTypeFilter !== 'all') {
        filters = `propertyType:"${propertyTypeFilter}"`
      }

      // Use server endpoint for search (works with or without Algolia)
      const params = new URLSearchParams({
        q: searchQuery,
        filters,
      })

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/search?${params}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      
      if (response.ok && data.listings) {
        // Apply price filter client-side
        let results = data.listings
        if (priceFilter !== 'all') {
          results = results.filter((listing: any) => {
            const price = listing.price
            switch (priceFilter) {
              case 'under-100k':
                return price < 100000
              case '100k-250k':
                return price >= 100000 && price < 250000
              case '250k-500k':
                return price >= 250000 && price < 500000
              case '500k-1m':
                return price >= 500000 && price < 1000000
              case 'over-1m':
                return price >= 1000000
              default:
                return true
            }
          })
        }

        setFilteredListings(results)
        
        // Log if using fallback
        if (data.fallback) {
          console.log('Using fallback search (Algolia not configured)')
        }
      } else {
        console.error('Search response error:', data)
        // Fallback to client-side filtering
        applyFilters()
      }
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to client-side filtering
      applyFilters()
    } finally {
      setIsSearching(false)
    }
  }

  const fetchAllListings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok) {
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
      toast.error('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const loadSavedListings = () => {
    const saved = localStorage.getItem(`saved_listings_${user.id}`)
    if (saved) {
      setSavedListings(JSON.parse(saved))
    }
  }

  const toggleSaveListing = (listingId: string) => {
    const newSaved = savedListings.includes(listingId)
      ? savedListings.filter(id => id !== listingId)
      : [...savedListings, listingId]
    
    setSavedListings(newSaved)
    localStorage.setItem(`saved_listings_${user.id}`, JSON.stringify(newSaved))
    toast.success(newSaved.includes(listingId) ? 'Listing saved' : 'Listing removed from saved')
  }

  const applyFilters = () => {
    let filtered = [...listings]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Property type filter
    if (propertyTypeFilter !== 'all') {
      filtered = filtered.filter(listing => listing.propertyType === propertyTypeFilter)
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(listing => {
        const price = listing.price
        switch (priceFilter) {
          case 'under-100k':
            return price < 100000
          case '100k-250k':
            return price >= 100000 && price < 250000
          case '250k-500k':
            return price >= 250000 && price < 500000
          case '500k-1m':
            return price >= 500000 && price < 1000000
          case 'over-1m':
            return price >= 1000000
          default:
            return true
        }
      })
    }

    setFilteredListings(filtered)
  }

  const getSavedListingsData = () => {
    return listings.filter(listing => savedListings.includes(listing.id))
  }

  const fetchMyOffers = async () => {
    setOffersLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login again')
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

      const data = await response.json()
      if (response.ok) {
        setMyOffers(data.offers || [])
      } else {
        console.error('Error fetching offers:', data.error)
        toast.error('Failed to load offers')
      }
    } catch (error) {
      console.error('Error fetching offers:', error)
      toast.error('Failed to load offers')
    } finally {
      setOffersLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRetractOffer = async (offerId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login again')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/offers/${offerId}`,
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
      fetchMyOffers() // Refresh offers list
    } catch (error: any) {
      console.error('Retract offer error:', error)
      toast.error(error.message || 'Failed to retract offer')
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
    } catch (error: any) {
      console.error('Error fetching lawyers:', error)
      toast.error('Failed to load lawyers')
    }
  }

  const handleSelectLawyer = async (offer: any) => {
    setSelectedOffer(offer)
    setSelectedLawyerId('')
    setLawyerDialogOpen(true)
    await fetchLawyers()
  }

  const handleCreateContract = async () => {
    if (!selectedLawyerId) {
      toast.error('Please select a lawyer')
      return
    }

    setCreatingContract(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login again')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/contracts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            lawyerId: selectedLawyerId,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create contract')
      }

      toast.success('Contract created successfully! The lawyer will now review it.')
      setLawyerDialogOpen(false)
      fetchMyOffers() // Refresh offers list
    } catch (error: any) {
      console.error('Create contract error:', error)
      toast.error(error.message || 'Failed to create contract')
    } finally {
      setCreatingContract(false)
    }
  }

  const headerTabs = [
    { id: 'browse', label: 'Browse Properties' },
    { id: 'saved', label: 'Saved' },
    { id: 'offers', label: 'My Offers' },
  ]

  return (
    <div className="min-h-screen bg-[#F3FFF4]">
      <DashboardHeader
        user={user}
        userType="buyer"
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={headerTabs}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'browse' && (
          <div>
            {/* Hero Section */}
            <div className="mb-8">
              <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-2">
                Discover Your Dream Property
              </h1>
              <p className="font-['Poppins'] text-gray-600">
                Browse verified property listings from sellers worldwide with lawyer-backed security
              </p>
            </div>

            {/* Search and Filters */}
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        placeholder="Search by location, title, or description..."
                        className="pl-10 pr-24 font-['Poppins']"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {algoliaEnabled && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-xs text-gray-400 font-['Poppins']">
                            ⚡ Algolia
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                      <SelectTrigger className="font-['Poppins']">
                        <SelectValue placeholder="Property Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="font-['Poppins']">
                        <SelectValue placeholder="Price Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="under-100k">Under $100k</SelectItem>
                        <SelectItem value="100k-250k">$100k - $250k</SelectItem>
                        <SelectItem value="250k-500k">$250k - $500k</SelectItem>
                        <SelectItem value="500k-1m">$500k - $1M</SelectItem>
                        <SelectItem value="over-1m">Over $1M</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Listings Grid */}
            {loading || isSearching ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-sm">
                  <div className="w-5 h-5 border-2 border-[#00985B] border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-['Poppins'] text-gray-600">
                    {isSearching ? 'Searching properties...' : 'Loading properties...'}
                  </p>
                </div>
              </div>
            ) : filteredListings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="font-['Poppins'] text-gray-600 text-center">
                    No properties found matching your criteria. Try adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Card
                    key={listing.id}
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer relative group"
                  >
                    <div onClick={() => onNavigate('listing-view', listing.id)}>
                      <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSaveListing(listing.id)
                          }}
                          className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              savedListings.includes(listing.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                        <Badge className="absolute top-3 left-3 bg-[#00985B] hover:bg-[#048853] font-['Poppins']">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="font-['Poppins'] text-xl text-[#048853]">
                            {listing.title}
                          </CardTitle>
                        </div>
                        <CardDescription className="font-['Poppins'] flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {listing.location}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="font-['Poppins'] text-2xl text-[#048853] mb-3">
                          {getCurrencySymbol(listing.currency)}{listing.price.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 font-['Poppins'] mb-3">
                          <span className="flex items-center gap-1">
                            <Bed className="w-4 h-4" />
                            {listing.bedrooms}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Bath className="w-4 h-4" />
                            {listing.bathrooms}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Square className="w-4 h-4" />
                            {listing.area}m²
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-['Poppins'] text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded-md capitalize">
                            {listing.propertyType}
                          </span>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            <div className="mb-8">
              <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-2">
                Saved Properties
              </h1>
              <p className="font-['Poppins'] text-gray-600">
                Your favorite properties are saved here for easy access
              </p>
            </div>

            {getSavedListingsData().length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Heart className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="font-['Poppins'] text-gray-600 text-center mb-4">
                    You haven't saved any properties yet.
                  </p>
                  <Button
                    className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
                    onClick={() => setActiveTab('browse')}
                  >
                    Browse Properties
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSavedListingsData().map((listing) => (
                  <Card
                    key={listing.id}
                    className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                    onClick={() => onNavigate('listing-view', listing.id)}
                  >
                    <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaveListing(listing.id)
                        }}
                        className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
                      >
                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                      </button>
                    </div>
                    <CardHeader>
                      <CardTitle className="font-['Poppins'] text-xl text-[#048853]">
                        {listing.title}
                      </CardTitle>
                      <CardDescription className="font-['Poppins'] flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {listing.location}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="font-['Poppins'] text-2xl text-[#048853] mb-3">
                        {getCurrencySymbol(listing.currency)}{listing.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 font-['Poppins']">
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {listing.bedrooms}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {listing.bathrooms}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Square className="w-4 h-4" />
                          {listing.area}m²
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div>
            {/* Header with Stats */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
                <div>
                  <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-2">
                    My Offers
                  </h1>
                  <p className="font-['Poppins'] text-gray-600">
                    Track all the offers you've submitted to sellers
                  </p>
                </div>
                {myOffers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#00985B] bg-opacity-10 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#00985B]" />
                          </div>
                          <div>
                            <p className="font-['Poppins'] text-2xl text-[#048853]">{myOffers.length}</p>
                            <p className="font-['Poppins'] text-xs text-gray-600">Total Offers</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-yellow-200 bg-yellow-50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse"></div>
                          </div>
                          <div>
                            <p className="font-['Poppins'] text-2xl text-yellow-800">
                              {myOffers.filter(o => o.status === 'pending').length}
                            </p>
                            <p className="font-['Poppins'] text-xs text-yellow-700">Pending</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-green-200 bg-green-50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-700" />
                          </div>
                          <div>
                            <p className="font-['Poppins'] text-2xl text-green-800">
                              {myOffers.filter(o => o.status === 'accepted').length}
                            </p>
                            <p className="font-['Poppins'] text-xs text-green-700">Accepted</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>

            {offersLoading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-sm">
                  <div className="w-5 h-5 border-2 border-[#00985B] border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-['Poppins'] text-gray-600">Loading offers...</p>
                </div>
              </div>
            ) : myOffers.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-[#F3FFF4] rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-[#00985B]" />
                  </div>
                  <h3 className="font-['Poppins'] text-xl text-[#048853] mb-2">
                    No Offers Yet
                  </h3>
                  <p className="font-['Poppins'] text-gray-600 text-center mb-6 max-w-md">
                    Start your property search and submit offers to sellers. All your offers will appear here.
                  </p>
                  <Button
                    className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
                    onClick={() => setActiveTab('browse')}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Browse Properties
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myOffers.map((offer) => {
                  const getBorderColor = () => {
                    if (offer.status === 'accepted') return 'border-l-green-500'
                    if (offer.status === 'pending') return 'border-l-yellow-500'
                    if (offer.status === 'declined') return 'border-l-red-500'
                    return 'border-l-gray-300'
                  }
                  
                  const priceDifference = offer.listing ? 
                    ((offer.amount - offer.listing.price) / offer.listing.price * 100).toFixed(1) : null

                  return (
                    <Card 
                      key={offer.id} 
                      className={`hover:shadow-xl transition-all duration-300 border-l-4 ${getBorderColor()} overflow-hidden group`}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Property Image */}
                          <div 
                            className="w-full md:w-80 aspect-video bg-gray-200 overflow-hidden cursor-pointer relative group/image flex-shrink-0"
                            onClick={() => offer.listing && onNavigate('listing-view', offer.listingId)}
                          >
                            {offer.listing?.images?.[0] ? (
                              <img
                                src={offer.listing.images[0]}
                                alt={offer.listing.title}
                                className="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <Home className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors duration-300"></div>
                            {offer.listing && (
                              <div className="absolute bottom-3 left-3 right-3">
                                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg">
                                  <MapPin className="w-4 h-4 text-[#00985B]" />
                                  <span className="font-['Poppins'] text-sm text-gray-700 truncate">
                                    {offer.listing.location}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Offer Details */}
                          <div className="flex-1 p-6 flex flex-col">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                  <h3 
                                    className="font-['Poppins'] text-2xl text-[#048853] cursor-pointer hover:text-[#00985B] transition-colors"
                                    onClick={() => offer.listing && onNavigate('listing-view', offer.listingId)}
                                  >
                                    {offer.listing?.title || 'Property Not Found'}
                                  </h3>
                                  {offer.listing && (
                                    <Badge variant="outline" className="capitalize font-['Poppins'] text-xs">
                                      {offer.listing.propertyType}
                                    </Badge>
                                  )}
                                </div>
                                {offer.listing && (
                                  <div className="flex items-center flex-wrap gap-2 gap-x-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1 font-['Poppins']">
                                      <User className="w-4 h-4" />
                                      {offer.listing.sellerName}
                                    </span>
                                    <span className="text-gray-400 hidden sm:inline">•</span>
                                    <span className="font-['Poppins']">
                                      {new Date(offer.createdAt).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Badge 
                                className={`${getStatusColor(offer.status)} capitalize font-['Poppins'] px-4 py-1.5 text-sm flex items-center gap-2 flex-shrink-0 self-start`}
                              >
                                {offer.status === 'accepted' && <CheckCircle className="w-4 h-4" />}
                                {offer.status === 'pending' && <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>}
                                {offer.status === 'declined' && <X className="w-4 h-4" />}
                                {offer.status}
                              </Badge>
                            </div>

                            {/* Property Details */}
                            {offer.listing && (
                              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex items-center flex-wrap gap-4 text-sm font-['Poppins']">
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Bed className="w-4 h-4 text-[#00985B]" />
                                    <span>{offer.listing.bedrooms} beds</span>
                                  </div>
                                  <span className="text-gray-300 hidden sm:inline">•</span>
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Bath className="w-4 h-4 text-[#00985B]" />
                                    <span>{offer.listing.bathrooms} baths</span>
                                  </div>
                                  <span className="text-gray-300 hidden sm:inline">•</span>
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Square className="w-4 h-4 text-[#00985B]" />
                                    <span>{offer.listing.area}m²</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Price Comparison */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              <div className="bg-gradient-to-br from-[#F3FFF4] to-white p-5 rounded-xl border-2 border-[#00985B]/30 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-2 h-2 bg-[#00985B] rounded-full"></div>
                                  <p className="font-['Poppins'] text-xs text-gray-600 uppercase tracking-wide">Your Offer</p>
                                </div>
                                <p className="font-['Poppins'] text-3xl text-[#048853] break-words">
                                  {getCurrencySymbol(offer.listing?.currency || 'USD')}{offer.amount.toLocaleString()}
                                </p>
                              </div>
                              {offer.listing && (
                                <>
                                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                      <p className="font-['Poppins'] text-xs text-gray-600 uppercase tracking-wide">Listed Price</p>
                                    </div>
                                    <p className="font-['Poppins'] text-3xl text-gray-700 break-words">
                                      {getCurrencySymbol(offer.listing.currency)}{offer.listing.price.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className={`p-5 rounded-xl border-2 shadow-sm sm:col-span-2 lg:col-span-1 ${
                                    priceDifference && parseFloat(priceDifference) < 0 
                                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
                                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'
                                  }`}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        priceDifference && parseFloat(priceDifference) < 0 
                                          ? 'bg-green-600' 
                                          : 'bg-blue-600'
                                      }`}></div>
                                      <p className="font-['Poppins'] text-xs text-gray-600 uppercase tracking-wide">Difference</p>
                                    </div>
                                    <p className={`font-['Poppins'] text-3xl ${
                                      priceDifference && parseFloat(priceDifference) < 0 
                                        ? 'text-green-700' 
                                        : 'text-blue-700'
                                    }`}>
                                      {priceDifference && parseFloat(priceDifference) > 0 ? '+' : ''}
                                      {priceDifference}%
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Message */}
                            {offer.message && (
                              <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <div className="flex items-start gap-2">
                                  <FileText className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="font-['Poppins'] text-sm text-blue-900 mb-1">Your Message</p>
                                    <p className="font-['Poppins'] text-sm text-blue-800">{offer.message}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Areas */}
                            {offer.status === 'pending' && (
                              <div className="mt-auto pt-4 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-50 rounded-lg border border-yellow-200 flex-1 sm:flex-initial">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0"></div>
                                    <p className="font-['Poppins'] text-sm text-yellow-900">Waiting for seller response</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRetractOffer(offer.id)}
                                    className="font-['Poppins'] border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-200 px-6 py-2 w-full sm:w-auto"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Retract Offer
                                  </Button>
                                </div>
                              </div>
                            )}

                            {offer.status === 'accepted' && !offer.contractId && (
                              <div className="mt-auto pt-4 border-t border-gray-200">
                                <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-6 rounded-2xl border-2 border-green-300 shadow-lg">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full -mr-16 -mt-16 opacity-30"></div>
                                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-300 rounded-full -ml-12 -mb-12 opacity-20"></div>
                                  <div className="relative">
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
                                      <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <CheckCircle className="w-7 h-7 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-['Poppins'] text-xl text-green-900 mb-2">
                                          🎉 Congratulations! Offer Accepted
                                        </p>
                                        <p className="font-['Poppins'] text-sm text-green-800 leading-relaxed">
                                          The seller has accepted your offer. Select a verified lawyer to proceed with the contract and finalize your purchase.
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex justify-end">
                                      <Button
                                        onClick={() => handleSelectLawyer(offer)}
                                        className="bg-gradient-to-r from-[#00985B] to-[#048853] hover:from-[#048853] hover:to-[#00985B] font-['Poppins'] px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto"
                                      >
                                        <Shield className="w-5 h-5 mr-2" />
                                        Select Lawyer & Continue
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {offer.status === 'accepted' && offer.contractId && (
                              <div className="mt-auto pt-4 border-t border-gray-200">
                                <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-green-300 shadow-lg">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200 rounded-full -mr-16 -mt-16 opacity-30"></div>
                                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-300 rounded-full -ml-12 -mb-12 opacity-20"></div>
                                  <div className="relative">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                          <Shield className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-['Poppins'] text-xl text-green-900">
                                            Ready to Purchase
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        onClick={() => onNavigate('purchase-process', undefined, offer.id)}
                                        className="bg-gradient-to-r from-[#00985B] to-[#048853] hover:from-[#048853] hover:to-[#00985B] font-['Poppins'] px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto flex-shrink-0"
                                      >
                                        <Shield className="w-5 h-5 mr-2" />
                                        Start Purchase Process
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {offer.status === 'declined' && (
                              <div className="mt-auto pt-4 border-t border-gray-200">
                                <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border border-red-200 shadow-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <X className="w-5 h-5 text-red-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-['Poppins'] text-red-900">
                                          Offer Declined
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => offer.listing && onNavigate('listing-view', offer.listingId)}
                                      className="bg-[#00985B] hover:bg-[#048853] font-['Poppins'] px-8 py-6 transition-all duration-200 w-full sm:w-auto flex-shrink-0"
                                    >
                                      Make New Offer
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lawyer Selection Dialog */}
      <Dialog open={lawyerDialogOpen} onOpenChange={setLawyerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-['Poppins'] text-2xl text-[#048853]">
              Select a Lawyer for Contract Review
            </DialogTitle>
            <DialogDescription className="font-['Poppins']">
              Choose a verified lawyer to handle the legal aspects of your property purchase for{' '}
              <span className="text-[#048853]">{selectedOffer?.listing?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {lawyers.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-['Poppins'] text-gray-600">
                  No verified lawyers available at the moment. Please try again later.
                </p>
              </div>
            ) : (
              lawyers.map((lawyer) => (
                <Card
                  key={lawyer.id}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedLawyerId === lawyer.id
                      ? 'border-[#00985B] border-2 bg-green-50'
                      : 'hover:border-[#00985B] hover:shadow-md'
                  }`}
                  onClick={() => setSelectedLawyerId(lawyer.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#00985B] bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-[#00985B]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-['Poppins'] text-lg text-[#048853]">
                              {lawyer.name}
                            </h4>
                            <p className="font-['Poppins'] text-sm text-gray-600">
                              {lawyer.email}
                            </p>
                          </div>
                          {lawyer.verified && (
                            <Badge className="bg-green-100 text-green-800 font-['Poppins']">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <p className="font-['Poppins'] text-xs text-gray-500">License Number</p>
                            <p className="font-['Poppins'] text-sm text-gray-700">
                              {lawyer.licenseNumber}
                            </p>
                          </div>
                          <div>
                            <p className="font-['Poppins'] text-xs text-gray-500">Bar Association</p>
                            <p className="font-['Poppins'] text-sm text-gray-700">
                              {lawyer.barAssociation}
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedLawyerId === lawyer.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-[#00985B] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLawyerDialogOpen(false)}
              className="font-['Poppins']"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateContract}
              disabled={!selectedLawyerId || creatingContract}
              className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
            >
              {creatingContract ? 'Creating Contract...' : 'Confirm & Create Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
