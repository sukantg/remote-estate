import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import DashboardHeader from './DashboardHeader'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  Eye,
  Shield,
  User as UserIcon,
  Upload
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

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
} from './ui/dialog'
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
} from './ui/alert-dialog'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'

type Props = {
  user: any
  onNavigate: (page: string) => void
  onLogout: () => void
}

type Contract = {
  id: string
  offerId: string
  listingId: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  lawyerId: string
  lawyerName: string
  lawyerEmail: string
  propertyTitle: string
  propertyLocation: string
  saleAmount: number
  currency: string
  status: string
  contractDocument?: string
  legalNotes?: string
  createdAt: string
  updatedAt: string
  reviewedAt?: string
}

type Listing = {
  id: string
  title: string
  description: string
  propertyType: string
  price: number
  currency: string
  location: string
  images: string[]
  bedrooms: number
  bathrooms: number
  area: number
  sellerId: string
  sellerName: string
  ownerEmail: string
  lawyerId: string
  lawyerName: string
  ownershipDocuments: Array<{ url: string; name: string }>
  legalVerificationStatus: string
  verificationNotes?: string
  verifiedAt?: string
  createdAt: string
}

export default function LawyerDashboard({ user, onNavigate, onLogout }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingListings, setLoadingListings] = useState(true)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [legalNotes, setLegalNotes] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [activeTab, setActiveTab] = useState('documents')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [uploadingContract, setUploadingContract] = useState<string | null>(null)

  useEffect(() => {
    fetchContracts()
    fetchAssignedListings()
  }, [])

  const fetchContracts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please login to continue')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/contracts/review`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setContracts(data.contracts || [])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load contracts')
      }
    } catch (error: any) {
      console.error('Error fetching contracts:', error)
      toast.error('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignedListings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please login to continue')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings/lawyer/assigned`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setListings(data.listings || [])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load assigned listings')
      }
    } catch (error: any) {
      console.error('Error fetching assigned listings:', error)
      toast.error('Failed to load assigned listings')
    } finally {
      setLoadingListings(false)
    }
  }

  const handleReview = (contract: Contract) => {
    setSelectedContract(contract)
    setLegalNotes(contract.legalNotes || '')
    setReviewDialogOpen(true)
  }

  const handleVerify = (listing: Listing) => {
    setSelectedListing(listing)
    setVerificationNotes(listing.verificationNotes || '')
    setVerifyDialogOpen(true)
  }

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!selectedContract) return
    
    setReviewing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please login to continue')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/contracts/${selectedContract.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status,
            legalNotes,
          }),
        }
      )

      if (response.ok) {
        toast.success(`Contract ${status} successfully`)
        setReviewDialogOpen(false)
        setSelectedContract(null)
        setLegalNotes('')
        fetchContracts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit review')
      }
    } catch (error: any) {
      console.error('Error submitting review:', error)
      toast.error('Failed to submit review')
    } finally {
      setReviewing(false)
    }
  }

  const submitVerification = async (status: 'approved' | 'rejected') => {
    if (!selectedListing) return
    
    setVerifying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please login to continue')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings/${selectedListing.id}/verify`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status,
            verificationNotes,
          }),
        }
      )

      if (response.ok) {
        toast.success(`Property verification ${status} successfully`)
        setVerifyDialogOpen(false)
        setSelectedListing(null)
        setVerificationNotes('')
        fetchAssignedListings()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit verification')
      }
    } catch (error: any) {
      console.error('Error submitting verification:', error)
      toast.error('Failed to submit verification')
    } finally {
      setVerifying(false)
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

  const handleContractUpload = async (contractId: string, file: File) => {
    setUploadingContract(contractId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please login to continue')
        return
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${contractId}-${Date.now()}.${fileExt}`
      const filePath = `contracts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('make-f2a42ca2-contracts')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('make-f2a42ca2-contracts')
        .createSignedUrl(filePath, 31536000) // 1 year expiry

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get signed URL')
      }

      // Update contract with document URL
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/contracts/${contractId}/upload`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            contractDocument: urlData.signedUrl,
          }),
        }
      )

      if (response.ok) {
        toast.success('Contract uploaded successfully')
        fetchContracts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update contract')
      }
    } catch (error: any) {
      console.error('Error uploading contract:', error)
      toast.error(error.message || 'Failed to upload contract')
    } finally {
      setUploadingContract(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      case 'pending_review':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Awaiting Review</Badge>
    }
  }

  const pendingContracts = contracts.filter(c => c.status === 'pending_review')
  const approvedContracts = contracts.filter(c => c.status === 'approved')
  const rejectedContracts = contracts.filter(c => c.status === 'rejected')

  const pendingListings = listings.filter(l => l.legalVerificationStatus === 'pending')
  const approvedListings = listings.filter(l => l.legalVerificationStatus === 'approved')
  const rejectedListings = listings.filter(l => l.legalVerificationStatus === 'rejected')

  const headerTabs = [
    { id: 'documents', label: 'Documents' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-[#F3FFF4]">
      <DashboardHeader
        user={user}
        userType="lawyer"
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={headerTabs}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === 'documents' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="font-['Poppins']">Total Properties</CardDescription>
                  <CardTitle className="font-['Poppins'] text-4xl text-[#048853]">
                    {listings.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="font-['Poppins']">Pending Verification</CardDescription>
                  <CardTitle className="font-['Poppins'] text-4xl text-orange-500">
                    {pendingListings.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="font-['Poppins']">Approved</CardDescription>
                  <CardTitle className="font-['Poppins'] text-4xl text-green-500">
                    {approvedListings.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="font-['Poppins']">Rejected</CardDescription>
                  <CardTitle className="font-['Poppins'] text-4xl text-red-500">
                    {rejectedListings.length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Property Verifications List */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Poppins'] text-2xl text-[#048853]">
                  <FileText className="inline w-6 h-6 mr-2" />
                  Document Review
                </CardTitle>
                <CardDescription className="font-['Poppins']">
                  Review and verify ownership documents from property listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="pending" className="font-['Poppins']">
                      Pending ({pendingListings.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="font-['Poppins']">
                      Approved ({approvedListings.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="font-['Poppins']">
                      Rejected ({rejectedListings.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending" className="space-y-4">
                    {loadingListings ? (
                      <p className="font-['Poppins'] text-gray-500 text-center py-8">Loading...</p>
                    ) : pendingListings.length === 0 ? (
                      <p className="font-['Poppins'] text-gray-500 text-center py-8">
                        No pending property verifications
                      </p>
                    ) : (
                      pendingListings.map((listing) => (
                        <Card key={listing.id} className="border-orange-200">
                          <CardContent className="pt-6">
                            {listing.ownershipDocuments && listing.ownershipDocuments.length > 0 ? (
                              listing.ownershipDocuments.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-4 py-2">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="w-5 h-5 text-[#00985B] flex-shrink-0" />
                                    <span className="font-['Poppins'] text-gray-700 truncate">
                                      {listing.title} - {doc.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="font-['Poppins']"
                                      onClick={() => window.open(doc.url, '_blank')}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="font-['Poppins']"
                                      onClick={() => handleVerify(listing)}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="font-['Poppins'] bg-green-500 hover:bg-green-600"
                                      onClick={() => handleVerify(listing)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Accept
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-between gap-4 py-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="font-['Poppins'] text-gray-700">
                                    {listing.title} - No documents uploaded
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="approved" className="space-y-4">
                    {approvedListings.length === 0 ? (
                      <p className="font-['Poppins'] text-gray-500 text-center py-8">
                        No approved properties yet
                      </p>
                    ) : (
                      approvedListings.map((listing) => (
                        <Card key={listing.id} className="border-green-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                <span className="font-['Poppins'] text-gray-700 truncate">
                                  {listing.title}
                                </span>
                              </div>
                              {listing.verifiedAt && (
                                <span className="font-['Poppins'] text-sm text-gray-500 flex-shrink-0">
                                  {new Date(listing.verifiedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {listing.verificationNotes && (
                              <div className="mt-3 p-3 bg-green-50 rounded text-sm">
                                <p className="font-['Poppins'] text-gray-600">{listing.verificationNotes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="rejected" className="space-y-4">
                    {rejectedListings.length === 0 ? (
                      <p className="font-['Poppins'] text-gray-500 text-center py-8">
                        No rejected properties
                      </p>
                    ) : (
                      rejectedListings.map((listing) => (
                        <Card key={listing.id} className="border-red-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <span className="font-['Poppins'] text-gray-700 truncate">
                                  {listing.title}
                                </span>
                              </div>
                              {listing.verifiedAt && (
                                <span className="font-['Poppins'] text-sm text-gray-500 flex-shrink-0">
                                  {new Date(listing.verifiedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {listing.verificationNotes && (
                              <div className="mt-3 p-3 bg-red-50 rounded text-sm">
                                <p className="font-['Poppins'] text-gray-600">{listing.verificationNotes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'contracts' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="font-['Poppins']">Total Contracts</CardDescription>
              <CardTitle className="font-['Poppins'] text-4xl text-[#048853]">
                {contracts.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="font-['Poppins']">Pending Review</CardDescription>
              <CardTitle className="font-['Poppins'] text-4xl text-orange-500">
                {pendingContracts.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="font-['Poppins']">Approved</CardDescription>
              <CardTitle className="font-['Poppins'] text-4xl text-green-500">
                {approvedContracts.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="font-['Poppins']">Rejected</CardDescription>
              <CardTitle className="font-['Poppins'] text-4xl text-red-500">
                {rejectedContracts.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Contracts List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Poppins'] text-2xl text-[#048853]">
              <Shield className="inline w-6 h-6 mr-2" />
              Contract Review
            </CardTitle>
            <CardDescription className="font-['Poppins']">
              Review contracts for accepted property offers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="font-['Poppins']">
                  Pending ({pendingContracts.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="font-['Poppins']">
                  Approved ({approvedContracts.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="font-['Poppins']">
                  Rejected ({rejectedContracts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {loading ? (
                  <p className="font-['Poppins'] text-gray-500 text-center py-8">Loading...</p>
                ) : pendingContracts.length === 0 ? (
                  <p className="font-['Poppins'] text-gray-500 text-center py-8">
                    No pending contracts to review
                  </p>
                ) : (
                  pendingContracts.map((contract) => (
                    <Card key={contract.id} className="border-orange-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-['Poppins'] text-xl text-[#048853]">
                                {contract.propertyTitle}
                              </h3>
                              {getStatusBadge(contract.status)}
                            </div>
                            {contract.legalNotes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="font-['Poppins'] text-sm text-gray-700">
                                  <strong>Notes:</strong> {contract.legalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-start ml-4">
                            <input
                              type="file"
                              id={`contract-upload-${contract.id}`}
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleContractUpload(contract.id, file)
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-['Poppins']"
                              onClick={() => document.getElementById(`contract-upload-${contract.id}`)?.click()}
                              disabled={uploadingContract === contract.id}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingContract === contract.id ? 'Uploading...' : 'Upload Contract'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                {approvedContracts.length === 0 ? (
                  <p className="font-['Poppins'] text-gray-500 text-center py-8">
                    No approved contracts yet
                  </p>
                ) : (
                  approvedContracts.map((contract) => (
                    <Card key={contract.id} className="border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-['Poppins'] text-xl text-[#048853]">
                                {contract.propertyTitle}
                              </h3>
                              {getStatusBadge(contract.status)}
                            </div>
                            <p className="font-['Poppins'] text-gray-600 mb-1">
                              {contract.propertyLocation}
                            </p>
                            <p className="font-['Poppins'] text-sm text-gray-500">
                              Sale Amount: {getCurrencySymbol(contract.currency)}{contract.saleAmount.toLocaleString()}
                            </p>
                            <p className="font-['Poppins'] text-sm text-gray-500">
                              Buyer: {contract.buyerName} • Seller: {contract.sellerName}
                            </p>
                            {contract.legalNotes && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                <p className="font-['Poppins'] text-sm text-gray-700">
                                  <strong>Review Notes:</strong> {contract.legalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            {contract.contractDocument && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-['Poppins']"
                                onClick={() => window.open(contract.contractDocument, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Contract
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {rejectedContracts.length === 0 ? (
                  <p className="font-['Poppins'] text-gray-500 text-center py-8">
                    No rejected contracts
                  </p>
                ) : (
                  rejectedContracts.map((contract) => (
                    <Card key={contract.id} className="border-red-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-['Poppins'] text-xl text-[#048853]">
                                {contract.propertyTitle}
                              </h3>
                              {getStatusBadge(contract.status)}
                            </div>
                            <p className="font-['Poppins'] text-gray-600 mb-1">
                              {contract.propertyLocation}
                            </p>
                            <p className="font-['Poppins'] text-sm text-gray-500">
                              Sale Amount: {getCurrencySymbol(contract.currency)}{contract.saleAmount.toLocaleString()}
                            </p>
                            <p className="font-['Poppins'] text-sm text-gray-500">
                              Buyer: {contract.buyerName} • Seller: {contract.sellerName}
                            </p>
                            {contract.legalNotes && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                <p className="font-['Poppins'] text-sm text-gray-700">
                                  <strong>Rejection Reason:</strong> {contract.legalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            {contract.contractDocument && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-['Poppins']"
                                onClick={() => window.open(contract.contractDocument, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Contract
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'settings' && (
          <div>
            <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-8">Profile & Settings</h1>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Poppins'] flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Account Information
                  </CardTitle>
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
                    <p className="font-['Poppins'] text-sm text-gray-600">License Number</p>
                    <p className="font-['Poppins'] text-lg text-[#048853]">
                      {user.user_metadata?.licenseNumber || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="font-['Poppins'] text-sm text-gray-600">Bar Association</p>
                    <p className="font-['Poppins'] text-lg text-[#048853]">
                      {user.user_metadata?.barAssociation || 'Not set'}
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
                        {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-['Poppins']">
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-['Poppins']">
                          This action cannot be undone. This will permanently delete your lawyer account
                          and remove all your data from our servers. All contract reviews associated with
                          your account will remain, but you will no longer have access to them.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="font-['Poppins']">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 font-['Poppins']"
                          onClick={handleDeleteAccount}
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-['Poppins'] text-2xl text-[#048853]">
              Review Contract - {selectedContract?.propertyTitle}
            </DialogTitle>
            <DialogDescription className="font-['Poppins']">
              Add your legal notes and approve or reject the contract
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes" className="font-['Poppins']">
                Legal Notes / Comments
              </Label>
              <Textarea
                id="notes"
                value={legalNotes}
                onChange={(e) => setLegalNotes(e.target.value)}
                placeholder="Enter your legal assessment, requirements, or concerns..."
                className="mt-2 font-['Poppins'] min-h-[150px]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
                className="font-['Poppins']"
                disabled={reviewing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => submitReview('rejected')}
                className="font-['Poppins']"
                disabled={reviewing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {reviewing ? 'Submitting...' : 'Reject Contract'}
              </Button>
              <Button
                onClick={() => submitReview('approved')}
                className="bg-green-500 hover:bg-green-600 font-['Poppins']"
                disabled={reviewing}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {reviewing ? 'Submitting...' : 'Approve Contract'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Poppins'] text-2xl text-[#048853]">
              Verify Property Documents
            </DialogTitle>
            <DialogDescription className="font-['Poppins']">
              {selectedListing?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {selectedListing?.ownershipDocuments && selectedListing.ownershipDocuments.length > 0 && (
              <div>
                <Label className="font-['Poppins'] text-base">Uploaded Documents</Label>
                <div className="mt-3 space-y-3">
                  {selectedListing.ownershipDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-[#00985B] flex-shrink-0" />
                        <span className="font-['Poppins'] text-sm text-gray-700 truncate">{doc.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-['Poppins'] flex-shrink-0"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="verificationNotes" className="font-['Poppins'] text-base">
                Verification Notes (Optional)
              </Label>
              <Textarea
                id="verificationNotes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Enter your assessment of the ownership documents, any concerns, or requirements..."
                className="mt-3 font-['Poppins'] min-h-[120px]"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setVerifyDialogOpen(false)}
                className="font-['Poppins']"
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => submitVerification('rejected')}
                className="font-['Poppins']"
                disabled={verifying}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {verifying ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                onClick={() => submitVerification('approved')}
                className="bg-green-500 hover:bg-green-600 font-['Poppins']"
                disabled={verifying}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {verifying ? 'Accepting...' : 'Accept'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
