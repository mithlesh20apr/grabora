import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Check for Authorization header (but be lenient for development)
  const authHeader = req.headers.get('authorization');

  // Log for debugging
  console.log('🔍 Onboarding Status API called', {
    hasAuth: !!authHeader,
    authHeader: authHeader?.substring(0, 20) + '...'
  });

  // For development, allow requests even without proper auth
  // In production, you would enforce this:
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return NextResponse.json({ statusCode: 401, success: false, message: 'Unauthorized' }, { status: 401 });
  // }

  // Mock onboarding status response
  return NextResponse.json({
    statusCode: 200,
    success: true,
    data: {
      allCompleted: false,
      steps: {
        addProduct: {
          completed: false,
          cta: process.env.NEXT_PUBLIC_ADD_PRODUCT_URL || '/seller/products/add',
        },
        kyc: {
          completed: false,
          cta: process.env.NEXT_PUBLIC_KYC_URL || '/seller/kyc',
        },
        pickupAddress: {
          completed: false,
          cta: process.env.NEXT_PUBLIC_PICKUP_ADDRESS_URL || '/seller/settings/address',
        },
        payments: {
          completed: false,
          cta: process.env.NEXT_PUBLIC_PAYMENTS_URL || '/seller/payments',
        },
      },
    },
  });
}
