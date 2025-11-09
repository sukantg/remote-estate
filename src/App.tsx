import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase/client'
import LandingPage from './components/LandingPage'
import SignUp from './components/SignUp'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import BuyerDashboard from './components/BuyerDashboard'
import LawyerDashboard from './components/LawyerDashboard'
import CreateListing from './components/CreateListing'
import ListingView from './components/ListingView'
import PurchaseProcess from './components/PurchaseProcess'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner@2.0.3'
import { projectId } from './utils/supabase/info'

type Page = 'landing' | 'signup' | 'login' | 'dashboard' | 'buyer-dashboard' | 'lawyer-dashboard' | 'create-listing' | 'listing-view' | 'purchase-process'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<'seller' | 'buyer' | 'lawyer' | null>(null)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)

  useEffect(() => {
    checkSession()
    handlePaymentRedirect()
  }, [])

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setUser(data.session.user)
      // Check user type from metadata or localStorage
      const storedUserType = localStorage.getItem(`user_type_${data.session.user.id}`)
      if (storedUserType === 'buyer') {
        setUserType('buyer')
        setCurrentPage('buyer-dashboard')
      } else if (storedUserType === 'lawyer') {
        setUserType('lawyer')
        setCurrentPage('lawyer-dashboard')
      } else {
        setUserType('seller')
        setCurrentPage('dashboard')
      }
    }
  }

  const handlePaymentRedirect = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    const offerId = urlParams.get('offer_id')
    const lawyerId = urlParams.get('lawyer_id')

    if (paymentStatus === 'success' && offerId && lawyerId) {
      // Payment successful - create contract
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-f2a42ca2/contracts`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                offerId,
                lawyerId,
              }),
            }
          )

          if (response.ok) {
            toast.success('Payment successful! Contract created and sent for lawyer review.')
            // Clear URL parameters
            window.history.replaceState({}, '', window.location.pathname)
          } else {
            const errorData = await response.json()
            console.error('Contract creation failed:', errorData)
            toast.error('Payment received but contract creation failed. Please contact support.')
          }
        }
      } catch (error) {
        console.error('Error creating contract after payment:', error)
        toast.error('Payment received but contract creation failed. Please contact support.')
      }
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment cancelled. You can try again when ready.')
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserType(null)
    setCurrentPage('landing')
  }

  const handleLoginSuccess = (user: any, type: 'seller' | 'buyer' | 'lawyer') => {
    setUser(user)
    setUserType(type)
    localStorage.setItem(`user_type_${user.id}`, type)
    if (type === 'buyer') {
      setCurrentPage('buyer-dashboard')
    } else if (type === 'lawyer') {
      setCurrentPage('lawyer-dashboard')
    } else {
      setCurrentPage('dashboard')
    }
  }

  const navigateTo = (page: Page, listingId?: string, offerId?: string) => {
    setCurrentPage(page)
    if (listingId) {
      setSelectedListingId(listingId)
    }
    if (offerId) {
      setSelectedOfferId(offerId)
    }
  }

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onNavigate={navigateTo} />
      )}
      {currentPage === 'signup' && (
        <SignUp onNavigate={navigateTo} />
      )}
      {currentPage === 'login' && (
        <Login onNavigate={navigateTo} setUser={setUser} onLoginSuccess={handleLoginSuccess} />
      )}
      {currentPage === 'dashboard' && user && userType === 'seller' && (
        <Dashboard 
          user={user} 
          onNavigate={navigateTo} 
          onLogout={handleLogout}
        />
      )}
      {currentPage === 'buyer-dashboard' && user && userType === 'buyer' && (
        <BuyerDashboard 
          user={user} 
          onNavigate={navigateTo} 
          onLogout={handleLogout}
        />
      )}
      {currentPage === 'lawyer-dashboard' && user && userType === 'lawyer' && (
        <LawyerDashboard 
          user={user} 
          onNavigate={navigateTo} 
          onLogout={handleLogout}
        />
      )}
      {currentPage === 'create-listing' && user && (
        <CreateListing 
          user={user}
          onNavigate={navigateTo} 
        />
      )}
      {currentPage === 'listing-view' && selectedListingId && (
        <ListingView 
          listingId={selectedListingId}
          onNavigate={navigateTo}
          user={user}
        />
      )}
      {currentPage === 'purchase-process' && selectedOfferId && user && (
        <PurchaseProcess 
          offerId={selectedOfferId}
          onNavigate={navigateTo}
          user={user}
        />
      )}
      <Toaster />
    </>
  )
}
