import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Progress } from './ui/progress'
import { ArrowLeft, ArrowRight, Upload, X, Check, Home, DollarSign, Shield, FileText } from 'lucide-react'
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
  user: any
  onNavigate: (page: 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'create-listing' | 'listing-view') => void
}

export default function CreateListing({ user, onNavigate }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Property Details
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Step 2: Pricing & Terms
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [area, setArea] = useState('')
  const [acceptCrypto, setAcceptCrypto] = useState(false)

  // Step 3: Legal Verification
  const [ownershipDocuments, setOwnershipDocuments] = useState<Array<{ url: string; name: string }>>([])
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [selectedLawyer, setSelectedLawyer] = useState('')
  
  // Available lawyers in the system (fetched from backend)
  const [availableLawyers, setAvailableLawyers] = useState<Array<{
    id: string
    name: string
    email: string
    licenseNumber: string
    barAssociation: string
    verified: boolean
  }>>([])
  const [loadingLawyers, setLoadingLawyers] = useState(false)

  // Step 4: Location
  const [location, setLocation] = useState('')

  // Fetch lawyers from backend
  useEffect(() => {
    const fetchLawyers = async () => {
      setLoadingLawyers(true)
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
          setAvailableLawyers(data.lawyers || [])
        } else {
          console.error('Failed to fetch lawyers:', data.error)
          toast.error('Failed to load lawyers')
        }
      } catch (error: any) {
        console.error('Error fetching lawyers:', error)
        toast.error('Failed to load lawyers')
      } finally {
        setLoadingLawyers(false)
      }
    }

    fetchLawyers()
  }, [])

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          toast.error('Please login again')
          return
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/upload-image`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              imageData: base64Data,
              fileName: file.name,
            }),
          }
        )

        const data = await response.json()

        if (response.ok) {
          setImages([...images, data.url])
          toast.success('Image uploaded successfully')
        } else {
          throw new Error(data.error || 'Upload failed')
        }
      }

      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if already have 3 documents
    if (ownershipDocuments.length >= 3) {
      toast.error('Maximum 3 documents allowed')
      return
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB')
      return
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document')
      return
    }

    setUploadingDocument(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          toast.error('Please login again')
          setUploadingDocument(false)
          return
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/upload-document`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              documentData: base64Data,
              fileName: file.name,
              fileSize: file.size,
            }),
          }
        )

        const data = await response.json()

        if (response.ok) {
          setOwnershipDocuments([...ownershipDocuments, { url: data.url, name: data.fileName }])
          toast.success('Document uploaded successfully')
        } else {
          throw new Error(data.error || 'Upload failed')
        }
        setUploadingDocument(false)
      }

      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload document')
      setUploadingDocument(false)
    }
  }

  const removeDocument = (index: number) => {
    setOwnershipDocuments(ownershipDocuments.filter((_, i) => i !== index))
    toast.success('Document removed')
  }

  const handleNext = () => {
    if (step === 1) {
      if (!title || !description || !propertyType) {
        toast.error('Please fill in all required fields')
        return
      }
    } else if (step === 2) {
      if (!price || !bedrooms || !bathrooms || !area || !location) {
        toast.error('Please fill in all required fields')
        return
      }
    } else if (step === 3) {
      if (!selectedLawyer) {
        toast.error('Please select a lawyer to verify your listing')
        return
      }
    }

    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handlePublish = async () => {
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please login again')
        setLoading(false)
        return
      }

      const listingData = {
        title,
        description,
        propertyType,
        price: parseFloat(price),
        currency,
        location,
        images,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        area: parseInt(area),
        acceptCrypto,
        lawyerId: selectedLawyer,
        lawyerName: availableLawyers.find(l => l.id === selectedLawyer)?.name || '',
        ownershipDocuments: ownershipDocuments,
      }

      console.log('Publishing listing with data:', listingData)

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/listings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(listingData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing')
      }

      toast.success('Listing published successfully!')
      setTimeout(() => {
        onNavigate('dashboard')
      }, 1500)
    } catch (error: any) {
      console.error('Publish error:', error)
      toast.error(error.message || 'Failed to publish listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3FFF4] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="mb-4 text-[#00985B]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="font-['Poppins'] text-4xl text-[#048853] mb-2">
            Create New Listing
          </h1>
          <p className="font-['Poppins'] text-gray-600">
            Step {step} of {totalSteps}
          </p>
          <Progress value={progress} className="mt-4" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-['Poppins'] text-2xl text-[#048853]">
              {step === 1 && (
                <span className="flex items-center gap-2">
                  <Home className="w-6 h-6" />
                  Property Details
                </span>
              )}
              {step === 2 && (
                <span className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  Pricing & Terms
                </span>
              )}
              {step === 3 && (
                <span className="flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Legal Verification
                </span>
              )}
              {step === 4 && (
                <span className="flex items-center gap-2">
                  <Check className="w-6 h-6" />
                  Review & Publish
                </span>
              )}
            </CardTitle>
            <CardDescription className="font-['Poppins']">
              {step === 1 && 'Tell us about your property'}
              {step === 2 && 'Set your price and property specifications'}
              {step === 3 && 'Upload documents and get lawyer verification'}
              {step === 4 && 'Review all details before publishing'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-['Poppins']">
                    Property Title *
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Modern Villa in Bali"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="font-['Poppins']"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-['Poppins']">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your property in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="font-['Poppins'] min-h-32"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyType" className="font-['Poppins']">
                    Property Type *
                  </Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="font-['Poppins']">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="House">House</SelectItem>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-['Poppins']">Property Images</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <ImageWithFallback
                          src={img}
                          alt={`Property ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-md hover:shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {images.length < 6 && (
                      <label className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#00985B] transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:bg-gray-50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="font-['Poppins'] text-sm text-gray-600">
                          {uploadingImage ? 'Uploading...' : 'Upload Image'}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="font-['Poppins']">
                      Asking Price *
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="200000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="font-['Poppins']"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="font-['Poppins']">
                      Currency *
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="font-['Poppins']">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="IDR">IDR (Rp)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="font-['Poppins']">
                    Location *
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., Bali, Indonesia"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="font-['Poppins']"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms" className="font-['Poppins']">
                      Bedrooms *
                    </Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      placeholder="3"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="font-['Poppins']"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms" className="font-['Poppins']">
                      Bathrooms *
                    </Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      placeholder="2"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="font-['Poppins']"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area" className="font-['Poppins']">
                      Area (m²) *
                    </Label>
                    <Input
                      id="area"
                      type="number"
                      placeholder="150"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="font-['Poppins']"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="crypto" className="font-['Poppins']">
                      Accept Cryptocurrency
                    </Label>
                    <p className="font-['Poppins'] text-sm text-gray-600">
                      Allow buyers to make offers in cryptocurrency
                    </p>
                  </div>
                  <Switch
                    id="crypto"
                    checked={acceptCrypto}
                    onCheckedChange={setAcceptCrypto}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-['Poppins']">
                    Ownership Proof ({ownershipDocuments.length}/3 documents uploaded)
                  </Label>
                  
                  {/* Display uploaded documents */}
                  {ownershipDocuments.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {ownershipDocuments.map((doc, index) => (
                        <div key={index} className="border-2 border-[#00985B] rounded-lg p-4 bg-[#E8F5E9]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#00985B] rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-['Poppins'] text-[#048853] truncate">
                                  {doc.name}
                                </p>
                                <p className="font-['Poppins'] text-sm text-gray-600">
                                  Document {index + 1}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => removeDocument(index)}
                              className="text-red-600 hover:text-red-700 hover:border-red-600 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload new document */}
                  {ownershipDocuments.length < 3 && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#00985B] transition-all duration-300 hover:bg-gray-50">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="font-['Poppins'] text-gray-600 mb-2">
                        Upload property deed or ownership documents
                      </p>
                      <p className="font-['Poppins'] text-sm text-gray-500 mb-4">
                        PDF or Word documents, max 10MB • Up to 3 documents
                      </p>
                      <label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleDocumentUpload}
                          className="hidden"
                          disabled={uploadingDocument}
                        />
                        <Button 
                          variant="outline" 
                          className="font-['Poppins']"
                          disabled={uploadingDocument}
                          asChild
                        >
                          <span>
                            {uploadingDocument ? 'Uploading...' : 'Choose File'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>

                <div className="bg-[#E8F5E9] border border-[#00985B] rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#00985B] rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-['Poppins'] text-lg text-[#048853] mb-2">
                        Lawyer Assignment
                      </h3>
                      <p className="font-['Poppins'] text-gray-700 mb-4">
                        Select a verified intermediary lawyer to oversee your transaction and ensure legal compliance.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="lawyer" className="font-['Poppins']">
                          Select Lawyer *
                        </Label>
                        <Select 
                          value={selectedLawyer} 
                          onValueChange={(value) => {
                            setSelectedLawyer(value)
                            const lawyer = availableLawyers.find(l => l.id === value)
                            console.log('Lawyer selected:', lawyer)
                            toast.success(`Lawyer assigned: ${lawyer?.name}`)
                          }}
                          disabled={loadingLawyers || availableLawyers.length === 0}
                        >
                          <SelectTrigger className="font-['Poppins'] bg-white">
                            <SelectValue placeholder={
                              loadingLawyers 
                                ? "Loading lawyers..." 
                                : availableLawyers.length === 0 
                                  ? "No lawyers available" 
                                  : "Choose a lawyer"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLawyers.map((lawyer) => (
                              <SelectItem key={lawyer.id} value={lawyer.id} className="font-['Poppins']">
                                <div className="flex flex-col">
                                  <span>{lawyer.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {lawyer.barAssociation} • License: {lawyer.licenseNumber}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!loadingLawyers && availableLawyers.length === 0 && (
                          <p className="font-['Poppins'] text-sm text-amber-600 mt-2">
                            No lawyers are currently registered in the system. Please try again later.
                          </p>
                        )}
                        {selectedLawyer && (
                          <div className="flex items-center gap-2 text-[#00985B] mt-3 p-3 bg-white rounded-lg">
                            <Check className="w-5 h-5" />
                            <span className="font-['Poppins']">
                              Lawyer Selected: {availableLawyers.find(l => l.id === selectedLawyer)?.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-['Poppins'] text-xl text-[#048853] mb-4">
                    Listing Summary
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-['Poppins'] text-sm text-gray-600">Title</p>
                      <p className="font-['Poppins'] text-lg text-[#048853]">{title}</p>
                    </div>
                    
                    <div>
                      <p className="font-['Poppins'] text-sm text-gray-600">Description</p>
                      <p className="font-['Poppins'] text-gray-700">{description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-['Poppins'] text-sm text-gray-600">Property Type</p>
                        <p className="font-['Poppins'] text-[#048853]">{propertyType}</p>
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-sm text-gray-600">Location</p>
                        <p className="font-['Poppins'] text-[#048853]">{location}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-['Poppins'] text-sm text-gray-600">Price</p>
                      <p className="font-['Poppins'] text-2xl text-[#048853]">
                        {getCurrencySymbol(currency)}{parseFloat(price).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="font-['Poppins'] text-sm text-gray-600">Bedrooms</p>
                        <p className="font-['Poppins'] text-[#048853]">{bedrooms}</p>
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-sm text-gray-600">Bathrooms</p>
                        <p className="font-['Poppins'] text-[#048853]">{bathrooms}</p>
                      </div>
                      <div>
                        <p className="font-['Poppins'] text-sm text-gray-600">Area</p>
                        <p className="font-['Poppins'] text-[#048853]">{area}m²</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-['Poppins'] text-sm text-gray-600">Images</p>
                      <p className="font-['Poppins'] text-[#048853]">{images.length} uploaded</p>
                    </div>

                    <div>
                      <p className="font-['Poppins'] text-sm text-gray-600">Ownership Documents</p>
                      {ownershipDocuments.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {ownershipDocuments.map((doc, index) => (
                            <p key={index} className="font-['Poppins'] text-[#048853] flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {doc.name}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-['Poppins'] text-[#048853]">Not uploaded</p>
                      )}
                    </div>

                    <div>
                      <p className="font-['Poppins'] text-sm text-gray-600">Verified Lawyer</p>
                      <p className="font-['Poppins'] text-[#048853]">
                        {selectedLawyer ? availableLawyers.find(l => l.id === selectedLawyer)?.name : 'Not selected'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#E8F5E9] border border-[#00985B] rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Check className="w-6 h-6 text-[#00985B] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-['Poppins'] text-lg text-[#048853] mb-2">
                        Ready to Publish
                      </h4>
                      <p className="font-['Poppins'] text-gray-700">
                        Your listing will be visible to buyers worldwide. You'll receive notifications for all offers and can manage them from your dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="font-['Poppins']"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={loading}
              className="bg-[#00985B] hover:bg-[#048853] font-['Poppins']"
            >
              {loading ? 'Publishing...' : 'Publish Listing'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
