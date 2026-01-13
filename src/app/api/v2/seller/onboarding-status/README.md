# Seller Onboarding Status API

This API route returns the onboarding status for the seller. It requires a Bearer token in the Authorization header.

- **Endpoint:** `/api/v2/seller/onboarding-status`
- **Method:** GET
- **Authorization:** Bearer token required
- **Response:**
  - `statusCode`: 200 on success
  - `success`: true/false
  - `data`: onboarding steps and completion status

## Environment Variables
- `NEXT_PUBLIC_ADD_PRODUCT_URL` (default: `/seller/products/add`)
- `NEXT_PUBLIC_KYC_URL` (default: `/seller/kyc`)
- `NEXT_PUBLIC_PICKUP_ADDRESS_URL` (default: `/seller/settings/address`)
- `NEXT_PUBLIC_PAYMENTS_URL` (default: `/seller/payments`)

## Example Response
```
{
  "statusCode": 200,
  "success": true,
  "data": {
    "allCompleted": false,
    "steps": {
      "addProduct": { "completed": false, "cta": "/seller/products/add" },
      "kyc": { "completed": false, "cta": "/seller/kyc" },
      "pickupAddress": { "completed": true, "cta": "/seller/settings/address" },
      "payments": { "completed": false, "cta": "/seller/payments" }
    }
  }
}
```

## Notes
- Update the environment variables in your `.env` file to customize the CTA URLs.
- Implement real token validation and onboarding logic as needed.
