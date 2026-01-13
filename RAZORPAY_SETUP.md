# Razorpay Payment Integration Guide

This project uses Razorpay for secure online payments with support for:
- **Credit Cards** (Visa, Mastercard, RuPay, etc.)
- **Debit Cards** (All major banks)
- **UPI** (Google Pay, PhonePe, Paytm, etc.)
- **Net Banking** (All major banks)
- **Cash on Delivery** (COD)

## 🚀 Quick Setup

### 1. Get Razorpay API Keys

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/signup)
2. Complete KYC verification (for live mode)
3. Navigate to **Settings → API Keys**
4. Generate **Test Mode** keys for development
5. Note down:
   - Key ID (starts with `rzp_test_` or `rzp_live_`)
   - Key Secret (keep this confidential)

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
```

⚠️ **Important:** Never commit `.env.local` to version control!

### 3. Install Dependencies (Production)

For production deployment, install the official Razorpay Node.js SDK:

```bash
npm install razorpay
```

### 4. Backend Integration

Update the API route at `src/app/api/razorpay/create-order/route.ts`:

```typescript
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Use razorpay.orders.create() to create orders
```

## 🔒 Security Features

- **PCI DSS Compliant** - Razorpay handles card data securely
- **3D Secure Authentication** - Additional verification for card payments
- **256-bit SSL Encryption** - All transactions are encrypted
- **Payment Signature Verification** - Ensures payment authenticity
- **Webhook Support** - Real-time payment notifications

## 💳 Supported Payment Methods

### Credit/Debit Cards
- Visa
- Mastercard
- RuPay
- Maestro
- American Express
- Diners Club

### UPI (Unified Payments Interface)
- Google Pay
- PhonePe
- Paytm
- BHIM
- Amazon Pay
- Any UPI app

### Net Banking
- All major Indian banks supported
- 50+ banks available

### Other Methods
- EMI Options (for eligible cards)
- Wallets (Paytm, Mobikwik, etc.)
- Cash on Delivery (COD)

## 🧪 Testing

### Test Mode Credentials

Use these test card details in **Test Mode**:

**Successful Payment:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failed Payment:**
- Card Number: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

**UPI Test:**
- UPI ID: `success@razorpay`

For more test credentials, visit: [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)

## 📱 Payment Flow

1. **User selects payment method** (Card/UPI/Net Banking)
2. **Click "Proceed to Payment"** button
3. **Razorpay checkout modal opens**
4. **User completes payment**
5. **Payment verification** on backend
6. **Order confirmation** page displayed

## 🔧 Configuration Options

### Customize Payment Methods

Edit `src/app/(shop)/checkout/page.tsx`:

```typescript
method: {
  netbanking: true,  // Enable/disable net banking
  card: true,        // Enable/disable cards
  upi: true,         // Enable/disable UPI
  wallet: false,     // Enable/disable wallets
}
```

### Theme Customization

```typescript
theme: {
  color: '#184979',           // Brand color
  backdrop_color: '#00000080' // Modal backdrop
}
```

## 📊 Order Management

Orders are stored with payment details:

```typescript
{
  orderId: 'ORD1234567890',
  paymentMethod: 'online',
  paymentDetails: {
    razorpay_payment_id: 'pay_xxxxx',
    razorpay_order_id: 'order_xxxxx',
    razorpay_signature: 'signature_xxxxx'
  }
}
```

## 🚨 Troubleshooting

### Payment Modal Not Opening
- Check if Razorpay script is loaded: `window.Razorpay`
- Verify environment variables are set correctly
- Check browser console for errors

### Payment Fails
- Verify test card details
- Check if in Test Mode
- Ensure amount is greater than ₹1

### Signature Verification Fails
- Confirm `RAZORPAY_KEY_SECRET` is correct
- Check order ID and payment ID match

## 📚 Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [API Reference](https://razorpay.com/docs/api/)
- [Webhooks Guide](https://razorpay.com/docs/webhooks/)
- [Dashboard](https://dashboard.razorpay.com/)

## 🔄 Going Live

1. Complete KYC verification in Razorpay dashboard
2. Generate **Live Mode** API keys
3. Update environment variables with live keys
4. Test thoroughly with small amounts
5. Enable production mode
6. Set up webhooks for payment notifications

## ⚠️ Important Notes

- **Never expose** `RAZORPAY_KEY_SECRET` in frontend code
- Always verify payment signature on backend
- Use webhooks for reliable payment updates
- Keep SDK and dependencies updated
- Monitor payment logs in Razorpay dashboard

## 💡 Best Practices

1. **Always verify payments on backend** before fulfilling orders
2. **Handle payment failures gracefully** with retry options
3. **Send email confirmations** for successful payments
4. **Log all transactions** for audit trail
5. **Use webhooks** for asynchronous payment updates
6. **Test edge cases** (network failures, timeouts, etc.)

---

**Need Help?**
- Email: support@grabora.com
- Razorpay Support: [help.razorpay.com](https://help.razorpay.com/)
