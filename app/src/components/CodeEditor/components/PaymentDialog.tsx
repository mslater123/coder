import React, { useState, useEffect } from 'react'
import './PaymentDialog.css'

interface PaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string | null
}

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'payment' | 'billing'>('plans')
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false)
  
  // Payment form state
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCVC, setCardCVC] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZip, setBillingZip] = useState('')
  const [billingCountry, setBillingCountry] = useState('US')

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'USD',
      interval: 'month',
      features: [
        '5 projects',
        '10GB storage',
        'Basic AI assistance',
        'Community support'
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited projects',
        '50GB storage',
        'Advanced AI assistance',
        'Priority support',
        'Custom themes'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
      popular: true,
      features: [
        'Unlimited projects',
        '200GB storage',
        'Premium AI assistance',
        '24/7 priority support',
        'Custom themes',
        'Team collaboration',
        'Advanced analytics'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited projects',
        '1TB storage',
        'Premium AI assistance',
        'Dedicated support',
        'Custom themes',
        'Team collaboration',
        'Advanced analytics',
        'Custom integrations',
        'SLA guarantee'
      ]
    }
  ]

  useEffect(() => {
    if (isOpen && currentUserId) {
      loadPaymentMethods()
      loadCurrentSubscription()
    }
  }, [isOpen, currentUserId])

  const loadPaymentMethods = async () => {
    // TODO: Implement API call to load payment methods
    // For now, use mock data
    setPaymentMethods([
      {
        id: '1',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true
      }
    ])
  }

  const loadCurrentSubscription = async () => {
    // TODO: Implement API call to load current subscription
  }

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setActiveTab('payment')
  }

  const handleAddPaymentMethod = async () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
      setError('Please fill in all card details')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // TODO: Implement API call to add payment method
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Payment method added successfully')
      setShowAddPaymentMethod(false)
      setCardNumber('')
      setCardName('')
      setCardExpiry('')
      setCardCVC('')
      await loadPaymentMethods()
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError('Please select a subscription plan')
      return
    }

    if (paymentMethods.length === 0) {
      setError('Please add a payment method first')
      setShowAddPaymentMethod(true)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // TODO: Implement API call to create subscription
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess(`Successfully subscribed to ${selectedPlan.name} plan!`)
      setSelectedPlan(null)
      setActiveTab('billing')
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // TODO: Implement API call to cancel subscription
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess('Subscription cancelled successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription')
    } finally {
      setLoading(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Payment & Subscriptions</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="payment-tabs">
          <button
            className={`payment-tab ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            Subscription Plans
          </button>
          <button
            className={`payment-tab ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            Payment Methods
          </button>
          <button
            className={`payment-tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            Billing History
          </button>
        </div>

        <div className="payment-content">
          {error && (
            <div className="payment-error">
              {error}
            </div>
          )}

          {success && (
            <div className="payment-success">
              {success}
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="subscription-plans">
              <h3>Choose Your Plan</h3>
              <p className="plans-description">Select a subscription plan that fits your needs</p>
              
              <div className="plans-grid">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`plan-card ${plan.popular ? 'popular' : ''} ${plan.id === 'free' ? 'free-plan' : ''}`}
                  >
                    {plan.popular && (
                      <div className="popular-badge">Most Popular</div>
                    )}
                    <div className="plan-header">
                      <h4>{plan.name}</h4>
                      <div className="plan-price">
                        <span className="price-amount">
                          ${plan.price.toFixed(2)}
                        </span>
                        <span className="price-interval">/{plan.interval}</span>
                      </div>
                    </div>
                    <ul className="plan-features">
                      {plan.features.map((feature, idx) => (
                        <li key={idx}>
                          <span className="feature-check">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`plan-select-btn ${plan.id === 'free' ? 'free-btn' : ''}`}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={plan.id === 'free'}
                    >
                      {plan.id === 'free' ? 'Current Plan' : 'Select Plan'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="payment-methods">
              <div className="payment-methods-header">
                <h3>Payment Methods</h3>
                <button
                  className="add-payment-btn"
                  onClick={() => setShowAddPaymentMethod(!showAddPaymentMethod)}
                >
                  + Add Payment Method
                </button>
              </div>

              {showAddPaymentMethod && (
                <div className="add-payment-form">
                  <h4>Add Credit Card</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-row form-row-split">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardCVC}
                        onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        maxLength={4}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className="btn-primary"
                      onClick={handleAddPaymentMethod}
                      disabled={loading}
                    >
                      {loading ? 'Adding...' : 'Add Payment Method'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setShowAddPaymentMethod(false)
                        setCardNumber('')
                        setCardName('')
                        setCardExpiry('')
                        setCardCVC('')
                        setError(null)
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="payment-methods-list">
                {paymentMethods.length === 0 ? (
                  <div className="empty-state">
                    <p>No payment methods added yet</p>
                    <p className="empty-hint">Add a payment method to subscribe to a plan</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div key={method.id} className="payment-method-item">
                      <div className="payment-method-info">
                        <div className="payment-method-icon">
                          {method.type === 'card' ? '💳' : method.type === 'paypal' ? '🅿️' : '🏦'}
                        </div>
                        <div className="payment-method-details">
                          {method.type === 'card' && (
                            <>
                              <div className="method-brand">{method.brand}</div>
                              <div className="method-number">•••• •••• •••• {method.last4}</div>
                              {method.expiryMonth && method.expiryYear && (
                                <div className="method-expiry">
                                  Expires {method.expiryMonth}/{method.expiryYear}
                                </div>
                              )}
                            </>
                          )}
                          {method.type === 'paypal' && (
                            <div className="method-brand">PayPal</div>
                          )}
                          {method.isDefault && (
                            <span className="default-badge">Default</span>
                          )}
                        </div>
                      </div>
                      <div className="payment-method-actions">
                        {!method.isDefault && (
                          <button className="set-default-btn">Set as Default</button>
                        )}
                        <button className="remove-method-btn">Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedPlan && (
                <div className="selected-plan-summary">
                  <h4>Selected Plan: {selectedPlan.name}</h4>
                  <div className="plan-summary-details">
                    <div className="summary-row">
                      <span>Price:</span>
                      <span>${selectedPlan.price.toFixed(2)}/{selectedPlan.interval}</span>
                    </div>
                    <div className="summary-row">
                      <span>Billing:</span>
                      <span>{selectedPlan.interval === 'month' ? 'Monthly' : 'Yearly'}</span>
                    </div>
                  </div>
                  <button
                    className="subscribe-btn"
                    onClick={handleSubscribe}
                    disabled={loading || paymentMethods.length === 0}
                  >
                    {loading ? 'Processing...' : `Subscribe to ${selectedPlan.name}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="billing-history">
              <h3>Billing History</h3>
              
              <div className="current-subscription">
                <h4>Current Subscription</h4>
                <div className="subscription-info">
                  <div className="subscription-details">
                    <div className="detail-row">
                      <span>Plan:</span>
                      <span>Free</span>
                    </div>
                    <div className="detail-row">
                      <span>Status:</span>
                      <span className="status-active">Active</span>
                    </div>
                    <div className="detail-row">
                      <span>Next Billing:</span>
                      <span>N/A</span>
                    </div>
                  </div>
                  <button
                    className="cancel-subscription-btn"
                    onClick={handleCancelSubscription}
                    disabled={loading}
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>

              <div className="billing-invoices">
                <h4>Invoice History</h4>
                <div className="empty-state">
                  <p>No invoices yet</p>
                  <p className="empty-hint">Your billing history will appear here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
