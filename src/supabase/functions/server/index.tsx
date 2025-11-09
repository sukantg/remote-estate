import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'
import algoliasearch from 'npm:algoliasearch@4'

const app = new Hono()

app.use('*', cors())
app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Initialize Algolia
const algoliaClient = algoliasearch(
  Deno.env.get('ALGOLIA_APP_ID') ?? '',
  Deno.env.get('ALGOLIA_ADMIN_API_KEY') ?? '',
)
const listingsIndex = algoliaClient.initIndex('listings')

// Initialize storage buckets
async function initializeBuckets() {
  const buckets = ['make-f2a42ca2-property-images', 'make-f2a42ca2-contracts']
  const { data: existingBuckets } = await supabase.storage.listBuckets()
  
  for (const bucketName of buckets) {
    const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName)
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false })
      console.log(`Created bucket: ${bucketName}`)
    }
  }
}

// Initialize Algolia index and sync existing listings
async function initializeAlgolia() {
  const appId = Deno.env.get('ALGOLIA_APP_ID')
  const adminKey = Deno.env.get('ALGOLIA_ADMIN_API_KEY')
  
  if (!appId || !adminKey) {
    console.log('Algolia not configured - skipping initialization')
    return
  }

  try {
    // Set index settings for better search
    await listingsIndex.setSettings({
      searchableAttributes: [
        'title',
        'description',
        'location',
        'propertyType',
      ],
      attributesForFaceting: [
        'propertyType',
        'currency',
        'status',
      ],
      customRanking: [
        'desc(createdAt)',
      ],
    })
    console.log('Algolia index settings configured')

    // Sync existing listings from KV store to Algolia
    const existingListings = await kv.getByPrefix('listing_')
    if (existingListings.length > 0) {
      const objects = existingListings.map((listing: any) => ({
        objectID: listing.id,
        ...listing,
      }))
      
      await listingsIndex.saveObjects(objects)
      console.log(`Synced ${existingListings.length} existing listings to Algolia`)
    } else {
      console.log('No existing listings to sync to Algolia')
    }
  } catch (error) {
    console.error('Error initializing Algolia:', error)
  }
}

await initializeBuckets()
await initializeAlgolia()

// Health check
app.get('/make-server-f2a42ca2/', (c) => {
  return c.json({ status: 'ok', message: 'Remote Estate Server Running' })
})

// Sign up route
app.post('/make-server-f2a42ca2/signup', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name, userType, licenseNumber, barAssociation } = body

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400)
    }

    // Validate lawyer-specific fields
    if (userType === 'lawyer') {
      if (!licenseNumber || !barAssociation) {
        return c.json({ error: 'License number and bar association are required for lawyer accounts' }, 400)
      }
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some(user => user.email === email)
    
    if (userExists) {
      return c.json({ 
        error: 'A user with this email address has already been registered. Please login instead.' 
      }, 409)
    }

    const userMetadata: any = { name, userType: userType || 'seller' }
    
    // Add lawyer-specific metadata
    if (userType === 'lawyer') {
      userMetadata.licenseNumber = licenseNumber
      userMetadata.barAssociation = barAssociation
      userMetadata.verified = false // Lawyers need verification
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: userMetadata,
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.error('Signup error:', error)
      
      // Handle specific error codes
      if (error.message?.includes('already been registered') || error.status === 422) {
        return c.json({ 
          error: 'A user with this email address has already been registered. Please login instead.' 
        }, 409)
      }
      
      return c.json({ error: `Signup failed: ${error.message}` }, 400)
    }

    return c.json({ user: data.user })
  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle duplicate email error
    if (error.code === 'email_exists' || error.status === 422) {
      return c.json({ 
        error: 'A user with this email address has already been registered. Please login instead.' 
      }, 409)
    }
    
    return c.json({ error: `Server error during signup: ${error.message || error}` }, 500)
  }
})

// Get current user info
app.get('/make-server-f2a42ca2/user', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ error: `Error fetching user: ${error}` }, 500)
  }
})

// Create a new listing
app.post('/make-server-f2a42ca2/listings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { title, description, propertyType, price, currency, location, images, bedrooms, bathrooms, area, acceptCrypto, lawyerId, lawyerName, ownershipDocuments } = body

    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Extract contract document from ownership documents (if any)
    const contractDocument = ownershipDocuments && ownershipDocuments.length > 0 
      ? ownershipDocuments[0].url 
      : null

    const listing = {
      id: listingId,
      sellerId: user.id,
      sellerName: user.user_metadata.name || user.email,
      ownerEmail: user.email,
      title,
      description,
      propertyType,
      price,
      currency,
      location,
      images: images || [],
      bedrooms: bedrooms || 0,
      bathrooms: bathrooms || 0,
      area: area || 0,
      acceptCrypto: acceptCrypto || false,
      lawyerId: lawyerId || 'lawyer_verified_001',
      lawyerName: lawyerName || 'Sarah Johnson, Esq.',
      ownershipDocuments: ownershipDocuments || [],
      contractDocument: contractDocument,
      legalVerificationStatus: contractDocument ? 'pending' : null,
      status: 'active',
      createdAt: new Date().toISOString(),
      offers: []
    }

    await kv.set(listingId, listing)
    console.log(`Created listing: ${listingId}`)

    // Index listing in Algolia for search (if configured)
    const appId = Deno.env.get('ALGOLIA_APP_ID')
    const adminKey = Deno.env.get('ALGOLIA_ADMIN_API_KEY')
    
    if (appId && adminKey) {
      try {
        await listingsIndex.saveObject({
          objectID: listingId,
          ...listing,
        })
        console.log(`Indexed listing in Algolia: ${listingId}`)
      } catch (algoliaError) {
        console.error('Error indexing in Algolia:', algoliaError)
        // Don't fail the request if Algolia indexing fails
      }
    } else {
      console.log('Algolia not configured, skipping indexing')
    }

    return c.json({ listing })
  } catch (error) {
    console.error('Create listing error:', error)
    return c.json({ error: `Error creating listing: ${error}` }, 500)
  }
})

// Get all listings
app.get('/make-server-f2a42ca2/listings', async (c) => {
  try {
    const allListings = await kv.getByPrefix('listing_')
    return c.json({ listings: allListings })
  } catch (error) {
    console.error('Get listings error:', error)
    return c.json({ error: `Error fetching listings: ${error}` }, 500)
  }
})

// Get Algolia search credentials
app.get('/make-server-f2a42ca2/algolia-config', async (c) => {
  try {
    const appId = Deno.env.get('ALGOLIA_APP_ID') ?? ''
    const searchApiKey = Deno.env.get('ALGOLIA_SEARCH_API_KEY') ?? ''
    const isConfigured = !!(appId && searchApiKey)
    
    return c.json({
      appId,
      searchApiKey,
      enabled: isConfigured,
    })
  } catch (error) {
    console.error('Get Algolia config error:', error)
    return c.json({ error: `Error fetching Algolia config: ${error}` }, 500)
  }
})

// Search listings with Algolia
app.get('/make-server-f2a42ca2/search', async (c) => {
  try {
    const query = c.req.query('q') || ''
    const filters = c.req.query('filters') || ''
    
    // Check if Algolia is configured
    const appId = Deno.env.get('ALGOLIA_APP_ID')
    const adminKey = Deno.env.get('ALGOLIA_ADMIN_API_KEY')
    
    if (!appId || !adminKey) {
      console.log('Algolia not configured, falling back to KV search')
      // Fallback to KV store search
      const allListings = await kv.getByPrefix('listing_')
      const lowerQuery = query.toLowerCase()
      
      let results = allListings.filter((listing: any) => {
        const searchableText = `${listing.title} ${listing.description} ${listing.location}`.toLowerCase()
        return searchableText.includes(lowerQuery)
      })
      
      // Apply property type filter
      if (filters) {
        const propertyTypeMatch = filters.match(/propertyType:"([^"]+)"/)
        if (propertyTypeMatch) {
          const propertyType = propertyTypeMatch[1]
          results = results.filter((listing: any) => listing.propertyType === propertyType)
        }
      }
      
      return c.json({ 
        listings: results,
        nbHits: results.length,
        fallback: true,
      })
    }
    
    // Use Algolia search
    const searchResults = await listingsIndex.search(query, {
      filters,
      hitsPerPage: 100,
    })
    
    return c.json({ 
      listings: searchResults.hits,
      nbHits: searchResults.nbHits,
      fallback: false,
    })
  } catch (error) {
    console.error('Algolia search error, falling back to KV search:', error)
    
    // Fallback to KV store search on error
    try {
      const query = c.req.query('q') || ''
      const filters = c.req.query('filters') || ''
      const allListings = await kv.getByPrefix('listing_')
      const lowerQuery = query.toLowerCase()
      
      let results = allListings.filter((listing: any) => {
        const searchableText = `${listing.title} ${listing.description} ${listing.location}`.toLowerCase()
        return searchableText.includes(lowerQuery)
      })
      
      // Apply property type filter
      if (filters) {
        const propertyTypeMatch = filters.match(/propertyType:"([^"]+)"/)
        if (propertyTypeMatch) {
          const propertyType = propertyTypeMatch[1]
          results = results.filter((listing: any) => listing.propertyType === propertyType)
        }
      }
      
      return c.json({ 
        listings: results,
        nbHits: results.length,
        fallback: true,
      })
    } catch (fallbackError) {
      console.error('Fallback search error:', fallbackError)
      return c.json({ error: `Error searching listings: ${fallbackError}` }, 500)
    }
  }
})

// Get listings by seller
app.get('/make-server-f2a42ca2/listings/my', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const allListings = await kv.getByPrefix('listing_')
    const myListings = allListings.filter((listing: any) => listing.sellerId === user.id)

    return c.json({ listings: myListings })
  } catch (error) {
    console.error('Get my listings error:', error)
    return c.json({ error: `Error fetching user listings: ${error}` }, 500)
  }
})

// Get single listing
app.get('/make-server-f2a42ca2/listings/:id', async (c) => {
  try {
    const listingId = c.req.param('id')
    const listing = await kv.get(listingId)

    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    return c.json({ listing })
  } catch (error) {
    console.error('Get listing error:', error)
    return c.json({ error: `Error fetching listing: ${error}` }, 500)
  }
})

// Update listing verification status (lawyer only)
app.patch('/make-server-f2a42ca2/listings/:id/verify', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Verify the user is a lawyer
    if (user.user_metadata?.userType !== 'lawyer') {
      return c.json({ error: 'Only lawyers can verify listings' }, 403)
    }

    const listingId = c.req.param('id')
    const listing = await kv.get(listingId)

    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    // Verify this lawyer is assigned to this listing
    if (listing.lawyerId !== user.id) {
      return c.json({ error: 'You are not assigned to this listing' }, 403)
    }

    const body = await c.req.json()
    const { status, verificationNotes } = body

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return c.json({ error: 'Invalid verification status' }, 400)
    }

    // Update the listing
    const updatedListing = {
      ...listing,
      legalVerificationStatus: status,
      verificationNotes: verificationNotes || '',
      verifiedAt: status !== 'pending' ? new Date().toISOString() : null,
    }

    await kv.set(listingId, updatedListing)
    console.log(`Listing ${listingId} verification status updated to: ${status}`)

    return c.json({ listing: updatedListing })
  } catch (error) {
    console.error('Update listing verification error:', error)
    return c.json({ error: `Error updating listing verification: ${error}` }, 500)
  }
})

// Upload property image
app.post('/make-server-f2a42ca2/upload-image', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { imageData, fileName } = body

    if (!imageData || !fileName) {
      return c.json({ error: 'Image data and filename are required' }, 400)
    }

    // Decode base64 image data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    const bucketName = 'make-f2a42ca2-property-images'
    const filePath = `${user.id}/${Date.now()}_${fileName}`

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return c.json({ error: `Upload failed: ${error.message}` }, 400)
    }

    // Get signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000) // 1 year expiry

    if (signedError) {
      console.error('Signed URL error:', signedError)
      return c.json({ error: `Failed to create signed URL: ${signedError.message}` }, 400)
    }

    return c.json({ url: signedData.signedUrl, path: filePath })
  } catch (error) {
    console.error('Upload image error:', error)
    return c.json({ error: `Error uploading image: ${error}` }, 500)
  }
})

// Upload property document
app.post('/make-server-f2a42ca2/upload-document', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { documentData, fileName, fileSize } = body

    if (!documentData || !fileName) {
      return c.json({ error: 'Document data and filename are required' }, 400)
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (fileSize && fileSize > maxSize) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400)
    }

    // Decode base64 document data
    const base64Data = documentData.replace(/^data:[^;]+;base64,/, '')
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Verify buffer size
    if (buffer.length > maxSize) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400)
    }

    const bucketName = 'make-f2a42ca2-property-documents'
    
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false })
      console.log(`Created bucket: ${bucketName}`)
    }

    const filePath = `${user.id}/${Date.now()}_${fileName}`

    // Determine content type based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    if (extension === 'pdf') {
      contentType = 'application/pdf'
    } else if (extension === 'doc') {
      contentType = 'application/msword'
    } else if (extension === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return c.json({ error: `Upload failed: ${error.message}` }, 400)
    }

    // Get signed URL (1 year expiry)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000)

    if (signedError) {
      console.error('Signed URL error:', signedError)
      return c.json({ error: `Failed to create signed URL: ${signedError.message}` }, 400)
    }

    return c.json({ url: signedData.signedUrl, path: filePath, fileName })
  } catch (error) {
    console.error('Upload document error:', error)
    return c.json({ error: `Error uploading document: ${error}` }, 500)
  }
})

// Create an offer on a listing
app.post('/make-server-f2a42ca2/offers', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { listingId, amount, message } = body

    const listing = await kv.get(listingId)
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const offer = {
      id: offerId,
      listingId,
      buyerId: user.id,
      buyerName: user.user_metadata.name || user.email,
      amount,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    // Add offer to listing
    listing.offers = listing.offers || []
    listing.offers.push(offer)
    await kv.set(listingId, listing)

    // Store offer separately for buyer lookup
    await kv.set(offerId, offer)

    return c.json({ offer })
  } catch (error) {
    console.error('Create offer error:', error)
    return c.json({ error: `Error creating offer: ${error}` }, 500)
  }
})

// Get offers by buyer
app.get('/make-server-f2a42ca2/offers/my', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Get all offers
    const allOffers = await kv.getByPrefix('offer_')
    
    // Filter offers by buyer ID
    const myOffers = allOffers.filter((offer: any) => offer.buyerId === user.id)
    
    // Enrich offers with listing data
    const enrichedOffers = await Promise.all(
      myOffers.map(async (offer: any) => {
        const listing = await kv.get(offer.listingId)
        return {
          ...offer,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            location: listing.location,
            price: listing.price,
            currency: listing.currency,
            images: listing.images,
            propertyType: listing.propertyType,
            sellerName: listing.sellerName
          } : null
        }
      })
    )

    return c.json({ offers: enrichedOffers })
  } catch (error) {
    console.error('Get my offers error:', error)
    return c.json({ error: `Error fetching offers: ${error}` }, 500)
  }
})

// Update offer status (decline)
app.patch('/make-server-f2a42ca2/offers/:offerId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const offerId = c.req.param('offerId')
    const body = await c.req.json()
    const { status } = body

    // Try to get the offer from KV store first
    let offer = await kv.get(offerId)
    let listing = null

    // If offer not found in KV, search through listings
    if (!offer) {
      const allListings = await kv.getByPrefix('listing_')
      for (const l of allListings) {
        const foundOffer = l.offers?.find((o: any) => o.id === offerId)
        if (foundOffer) {
          offer = foundOffer
          listing = l
          break
        }
      }

      if (!offer) {
        return c.json({ error: 'Offer not found in any listing' }, 404)
      }
    }

    // Get the listing if we haven't already
    if (!listing) {
      listing = await kv.get(offer.listingId)
      if (!listing) {
        return c.json({ error: 'Listing not found' }, 404)
      }
    }

    // Verify the user is the seller
    if (listing.sellerId !== user.id) {
      return c.json({ error: 'You do not have permission to update this offer' }, 403)
    }

    // Update the offer in the listing's offers array
    const offerIndex = listing.offers.findIndex((o: any) => o.id === offerId)
    if (offerIndex !== -1) {
      listing.offers[offerIndex].status = status
      await kv.set(listing.id, listing)
    }

    // Update the standalone offer record if it exists
    const standaloneOffer = await kv.get(offerId)
    if (standaloneOffer) {
      standaloneOffer.status = status
      await kv.set(offerId, standaloneOffer)
    }

    console.log(`Updated offer ${offerId} to status: ${status} by seller: ${user.id}`)

    return c.json({ success: true, offer: { ...offer, status } })
  } catch (error) {
    console.error('Update offer error:', error)
    return c.json({ error: `Error updating offer: ${error}` }, 500)
  }
})

// Retract an offer
app.delete('/make-server-f2a42ca2/offers/:offerId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const offerId = c.req.param('offerId')
    const offer = await kv.get(offerId)

    if (!offer) {
      return c.json({ error: 'Offer not found' }, 404)
    }

    // Verify the offer belongs to the user
    if (offer.buyerId !== user.id) {
      return c.json({ error: 'You do not have permission to retract this offer' }, 403)
    }

    // Remove offer from listing
    const listing = await kv.get(offer.listingId)
    if (listing) {
      listing.offers = listing.offers.filter((o: any) => o.id !== offerId)
      await kv.set(offer.listingId, listing)
    }

    // Delete the offer
    await kv.del(offerId)
    console.log(`Retracted offer: ${offerId} by user: ${user.id}`)

    return c.json({ success: true, message: 'Offer retracted successfully' })
  } catch (error) {
    console.error('Retract offer error:', error)
    return c.json({ error: `Error retracting offer: ${error}` }, 500)
  }
})

// Get available lawyers
app.get('/make-server-f2a42ca2/lawyers', async (c) => {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Error fetching lawyers:', error)
      return c.json({ error: 'Failed to fetch lawyers' }, 500)
    }

    // Filter for lawyer users
    const lawyers = users.filter(u => u.user_metadata?.userType === 'lawyer').map(lawyer => ({
      id: lawyer.id,
      name: lawyer.user_metadata.name,
      email: lawyer.email,
      licenseNumber: lawyer.user_metadata.licenseNumber,
      barAssociation: lawyer.user_metadata.barAssociation,
      verified: lawyer.user_metadata.verified || false
    }))

    return c.json({ lawyers })
  } catch (error) {
    console.error('Get lawyers error:', error)
    return c.json({ error: `Error fetching lawyers: ${error}` }, 500)
  }
})

// Get listings assigned to a lawyer for document verification
app.get('/make-server-f2a42ca2/listings/lawyer/assigned', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Verify the user is a lawyer
    if (user.user_metadata?.userType !== 'lawyer') {
      return c.json({ error: 'Only lawyers can access this endpoint' }, 403)
    }

    // Get all listings
    const allListings = await kv.getByPrefix('listing_')
    
    // Filter listings assigned to this lawyer
    const assignedListings = allListings.filter(listing => listing.lawyerId === user.id)

    return c.json({ listings: assignedListings })
  } catch (error) {
    console.error('Get lawyer assigned listings error:', error)
    return c.json({ error: `Error fetching assigned listings: ${error}` }, 500)
  }
})

// Create a contract from an accepted offer
app.post('/make-server-f2a42ca2/contracts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { offerId, lawyerId } = body

    if (!offerId || !lawyerId) {
      return c.json({ error: 'Offer ID and Lawyer ID are required' }, 400)
    }

    // Get the offer
    const offer = await kv.get(offerId)
    if (!offer) {
      return c.json({ error: 'Offer not found' }, 404)
    }

    // Verify the user is the buyer
    if (offer.buyerId !== user.id) {
      return c.json({ error: 'Only the buyer can create a contract for this offer' }, 403)
    }

    // Check if offer is accepted
    if (offer.status !== 'accepted') {
      return c.json({ error: 'Only accepted offers can be converted to contracts' }, 400)
    }

    // Get the listing
    const listing = await kv.get(offer.listingId)
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    // Get lawyer details
    const { data: { user: lawyer }, error: lawyerError } = await supabase.auth.admin.getUserById(lawyerId)
    if (lawyerError || !lawyer) {
      return c.json({ error: 'Lawyer not found' }, 404)
    }

    if (lawyer.user_metadata?.userType !== 'lawyer') {
      return c.json({ error: 'Selected user is not a lawyer' }, 400)
    }

    // Create contract
    const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const contract = {
      id: contractId,
      offerId: offer.id,
      listingId: listing.id,
      buyerId: user.id,
      buyerName: user.user_metadata.name || user.email,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      lawyerId: lawyer.id,
      lawyerName: lawyer.user_metadata.name,
      lawyerEmail: lawyer.email,
      propertyTitle: listing.title,
      propertyLocation: listing.location,
      saleAmount: offer.amount,
      currency: listing.currency,
      status: 'pending_review', // pending_review, approved, rejected
      contractDocument: listing.contractDocument,
      legalNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await kv.set(contractId, contract)

    // Update offer with contract reference
    offer.contractId = contractId
    await kv.set(offerId, offer)

    console.log(`Created contract ${contractId} for offer ${offerId} with lawyer ${lawyerId}`)

    return c.json({ contract })
  } catch (error) {
    console.error('Create contract error:', error)
    return c.json({ error: `Error creating contract: ${error}` }, 500)
  }
})

// Get contracts for buyer
app.get('/make-server-f2a42ca2/contracts/my', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Get all contracts
    const allContracts = await kv.getByPrefix('contract_')
    
    // Filter contracts by buyer ID or seller ID
    const myContracts = allContracts.filter((contract: any) => 
      contract.buyerId === user.id || contract.sellerId === user.id
    )

    return c.json({ contracts: myContracts })
  } catch (error) {
    console.error('Get my contracts error:', error)
    return c.json({ error: `Error fetching contracts: ${error}` }, 500)
  }
})

// Get contracts for lawyer review
app.get('/make-server-f2a42ca2/contracts/review', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Verify user is a lawyer
    if (user.user_metadata?.userType !== 'lawyer') {
      return c.json({ error: 'Only lawyers can access this endpoint' }, 403)
    }

    // Get all contracts assigned to this lawyer
    const allContracts = await kv.getByPrefix('contract_')
    const lawyerContracts = allContracts.filter((contract: any) => contract.lawyerId === user.id)

    return c.json({ contracts: lawyerContracts })
  } catch (error) {
    console.error('Get contracts for review error:', error)
    return c.json({ error: `Error fetching contracts: ${error}` }, 500)
  }
})

// Update contract status (lawyer review)
app.patch('/make-server-f2a42ca2/contracts/:contractId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const contractId = c.req.param('contractId')
    const body = await c.req.json()
    const { status, legalNotes } = body

    const contract = await kv.get(contractId)
    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }

    // Verify the user is the assigned lawyer
    if (contract.lawyerId !== user.id) {
      return c.json({ error: 'You do not have permission to review this contract' }, 403)
    }

    // Update contract
    contract.status = status
    contract.legalNotes = legalNotes || contract.legalNotes
    contract.updatedAt = new Date().toISOString()
    contract.reviewedAt = new Date().toISOString()

    await kv.set(contractId, contract)

    console.log(`Updated contract ${contractId} to status: ${status} by lawyer: ${user.id}`)

    return c.json({ success: true, contract })
  } catch (error) {
    console.error('Update contract error:', error)
    return c.json({ error: `Error updating contract: ${error}` }, 500)
  }
})

// Upload contract document (lawyer)
app.patch('/make-server-f2a42ca2/contracts/:contractId/upload', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const contractId = c.req.param('contractId')
    const body = await c.req.json()
    const { contractDocument } = body

    if (!contractDocument) {
      return c.json({ error: 'Contract document URL is required' }, 400)
    }

    const contract = await kv.get(contractId)
    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }

    // Verify the user is the assigned lawyer
    if (contract.lawyerId !== user.id) {
      return c.json({ error: 'You do not have permission to upload documents for this contract' }, 403)
    }

    // Update contract with document
    contract.contractDocument = contractDocument
    contract.updatedAt = new Date().toISOString()

    await kv.set(contractId, contract)

    console.log(`Uploaded contract document for ${contractId} by lawyer: ${user.id}`)

    return c.json({ success: true, contract })
  } catch (error) {
    console.error('Upload contract document error:', error)
    return c.json({ error: `Error uploading contract document: ${error}` }, 500)
  }
})

// Delete a single listing
app.delete('/make-server-f2a42ca2/listings/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const listingId = c.req.param('id')
    const listing = await kv.get(listingId)

    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    // Verify the listing belongs to the user
    if (listing.sellerId !== user.id) {
      return c.json({ error: 'You do not have permission to delete this listing' }, 403)
    }

    // Delete the listing from KV store
    await kv.del(listingId)
    console.log(`Deleted listing: ${listingId} by user: ${user.id}`)

    // Note: We're not deleting images from storage to preserve them
    // Images are tied to the user account and will be cleaned up if the account is deleted

    return c.json({ success: true, message: 'Listing deleted successfully' })
  } catch (error) {
    console.error('Delete listing error:', error)
    return c.json({ error: `Error deleting listing: ${error}` }, 500)
  }
})

// Lawyer review contract endpoint
app.post('/make-server-f2a42ca2/lawyer/review', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Verify user is a lawyer
    if (user.user_metadata?.userType !== 'lawyer') {
      return c.json({ error: 'Only lawyers can review contracts' }, 403)
    }

    const body = await c.req.json()
    const { listingId, status, legalNotes, reviewedBy } = body

    if (!listingId || !status) {
      return c.json({ error: 'Listing ID and status are required' }, 400)
    }

    const listing = await kv.get(listingId)
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    // Update listing with legal verification
    listing.legalVerificationStatus = status
    listing.legalNotes = legalNotes || ''
    listing.reviewedBy = reviewedBy
    listing.reviewedAt = new Date().toISOString()

    await kv.set(listingId, listing)
    console.log(`Lawyer ${user.email} ${status} listing ${listingId}`)

    return c.json({ success: true, listing })
  } catch (error) {
    console.error('Lawyer review error:', error)
    return c.json({ error: `Error processing review: ${error}` }, 500)
  }
})

// Get all lawyers
app.get('/make-server-f2a42ca2/lawyers', async (c) => {
  try {
    // Get all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Error fetching users:', error)
      return c.json({ error: 'Failed to fetch lawyers' }, 500)
    }

    // Filter for lawyer accounts
    const lawyers = users
      .filter(user => user.user_metadata?.userType === 'lawyer')
      .map(user => ({
        id: user.id,
        name: user.user_metadata?.name || user.email,
        email: user.email,
        barLicense: user.user_metadata?.licenseNumber,
        barAssociation: user.user_metadata?.barAssociation,
        firmName: user.user_metadata?.firmName || null,
        verified: user.user_metadata?.verified || false,
      }))

    return c.json({ lawyers })
  } catch (error) {
    console.error('Get lawyers error:', error)
    return c.json({ error: `Error fetching lawyers: ${error}` }, 500)
  }
})

// Delete user account
app.delete('/make-server-f2a42ca2/account', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'No authorization token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = user.id

    // Delete user's listings from KV store
    const allListings = await kv.getByPrefix('listing_')
    const userListings = allListings.filter((listing: any) => listing.sellerId === userId)
    
    // Delete each listing
    for (const listing of userListings) {
      await kv.del(listing.id)
      console.log(`Deleted listing: ${listing.id}`)
    }

    // Delete user's images from storage
    const bucketName = 'make-f2a42ca2-property-images'
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(userId)

    if (!listError && files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/${file.name}`)
      await supabase.storage.from(bucketName).remove(filePaths)
      console.log(`Deleted ${filePaths.length} images for user: ${userId}`)
    }

    // Delete the user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('Delete user error:', deleteError)
      return c.json({ error: `Failed to delete account: ${deleteError.message}` }, 400)
    }

    console.log(`Successfully deleted user account: ${userId}`)
    return c.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Account deletion error:', error)
    return c.json({ error: `Error deleting account: ${error}` }, 500)
  }
})

// Create Stripe checkout session
app.post('/make-server-f2a42ca2/create-checkout-session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Authorization token required' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { offerId, lawyerId, amount } = body

    if (!offerId || !lawyerId || !amount) {
      return c.json({ error: 'Offer ID, lawyer ID, and amount are required' }, 400)
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return c.json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' }, 500)
    }

    // Get offer details
    const offer = await kv.get(offerId)
    if (!offer) {
      return c.json({ error: 'Offer not found' }, 404)
    }

    // Verify user is the buyer
    if (offer.buyerId !== user.id) {
      return c.json({ error: 'Unauthorized to process this offer' }, 403)
    }

    // Verify lawyer exists in Supabase Auth
    const { data: lawyerData, error: lawyerError } = await supabase.auth.admin.getUserById(lawyerId)
    if (lawyerError || !lawyerData || lawyerData.user?.user_metadata?.userType !== 'lawyer') {
      console.error('Lawyer validation error:', lawyerError)
      return c.json({ error: 'Invalid lawyer ID' }, 404)
    }

    // Get the listing to include in metadata
    const listing = await kv.get(offer.listingId)
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404)
    }

    // Construct proper URLs with protocol
    let origin = c.req.header('origin') || c.req.header('referer')?.split('?')[0].replace(/\/$/, '')
    
    // Default to localhost if no origin/referer
    if (!origin) {
      origin = 'http://localhost:3000'
    }
    
    // Ensure the origin has a protocol
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      // If running on localhost or 127.0.0.1, use http, otherwise https
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        origin = `http://${origin}`
      } else {
        origin = `https://${origin}`
      }
    }
    
    const successUrl = `${origin}?payment=success&offer_id=${offerId}&lawyer_id=${lawyerId}`
    const cancelUrl = `${origin}?payment=cancelled`

    console.log('Creating Stripe checkout session with URLs:', { origin, successUrl, cancelUrl })
    console.log('Stripe key present:', !!stripeSecretKey, 'Key prefix:', stripeSecretKey?.substring(0, 7))

    const stripeParams = {
      'mode': 'payment',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'Legal Service Fee - Property Purchase',
      'line_items[0][price_data][product_data][description]': `Legal services for ${listing.title}`,
      'line_items[0][price_data][unit_amount]': amount.toString(),
      'line_items[0][quantity]': '1',
      'metadata[offer_id]': offerId,
      'metadata[lawyer_id]': lawyerId,
      'metadata[buyer_id]': user.id,
      'customer_email': user.email || '',
    }

    console.log('Stripe request params:', stripeParams)

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(stripeParams).toString(),
    })

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text()
      console.error('Stripe API error response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText }
      }
      return c.json({ 
        error: `Failed to create Stripe checkout: ${errorData.error?.message || errorText}` 
      }, 500)
    }

    const session = await stripeResponse.json()
    console.log('Stripe checkout session created successfully:', session.id)

    // Return the checkout URL for direct redirect
    return c.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error('Create checkout session error:', error)
    return c.json({ error: `Error creating checkout session: ${error.message || error}` }, 500)
  }
})

// Create Stripe checkout session for listing verification fee
app.post('/make-server-f2a42ca2/create-listing-checkout', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Authorization token required' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const { lawyerId, amount, listingTitle } = body

    if (!lawyerId || !amount || !listingTitle) {
      return c.json({ error: 'Lawyer ID, amount, and listing title are required' }, 400)
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return c.json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' }, 500)
    }

    // Verify lawyer exists in Supabase Auth
    const { data: lawyerData, error: lawyerError } = await supabase.auth.admin.getUserById(lawyerId)
    if (lawyerError || !lawyerData || lawyerData.user?.user_metadata?.userType !== 'lawyer') {
      console.error('Lawyer validation error:', lawyerError)
      return c.json({ error: 'Invalid lawyer ID' }, 404)
    }

    // Construct proper URLs with protocol
    let origin = c.req.header('origin') || c.req.header('referer')?.split('?')[0].replace(/\/$/, '')
    
    // Default to localhost if no origin/referer
    if (!origin) {
      origin = 'http://localhost:3000'
    }
    
    // Ensure the origin has a protocol
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      // If running on localhost or 127.0.0.1, use http, otherwise https
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        origin = `http://${origin}`
      } else {
        origin = `https://${origin}`
      }
    }
    
    // Redirect back to create listing page with payment status
    const successUrl = `${origin}/create-listing?payment=success&lawyer_id=${lawyerId}`
    const cancelUrl = `${origin}/create-listing?payment=cancelled`

    console.log('Creating Stripe listing checkout session with URLs:', { origin, successUrl, cancelUrl })
    console.log('Stripe key present:', !!stripeSecretKey, 'Key prefix:', stripeSecretKey?.substring(0, 7))

    const stripeParams = {
      'mode': 'payment',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'Property Listing Verification Fee',
      'line_items[0][price_data][product_data][description]': `Lawyer verification fee for listing: ${listingTitle}`,
      'line_items[0][price_data][unit_amount]': amount.toString(),
      'line_items[0][quantity]': '1',
      'metadata[lawyer_id]': lawyerId,
      'metadata[seller_id]': user.id,
      'metadata[listing_title]': listingTitle,
      'customer_email': user.email || '',
    }

    console.log('Stripe request params:', stripeParams)

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(stripeParams).toString(),
    })

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text()
      console.error('Stripe API error response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText }
      }
      return c.json({ 
        error: `Failed to create Stripe checkout: ${errorData.error?.message || errorText}` 
      }, 500)
    }

    const session = await stripeResponse.json()
    console.log('Stripe listing checkout session created successfully:', session.id)

    // Return the checkout URL for direct redirect
    return c.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error('Create listing checkout session error:', error)
    return c.json({ error: `Error creating checkout session: ${error.message || error}` }, 500)
  }
})

Deno.serve(app.fetch)
