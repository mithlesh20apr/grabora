import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Check for Authorization header (but be lenient for development)
  const authHeader = req.headers.get('authorization');

  // Log for debugging
  console.log('🔍 Activation Status API called', {
    hasAuth: !!authHeader,
    authHeader: authHeader?.substring(0, 20) + '...'
  });

  // For development, allow requests even without proper auth
  // In production, you would enforce this:
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return NextResponse.json({ statusCode: 401, success: false, message: 'Unauthorized' }, { status: 401 });
  // }

  // Mock activation status response
  // Set isActive to false to show the activation banner and onboarding card
  return NextResponse.json({
    isActive: false,
    reason: 'KYC_PENDING',
    nextStep: '/seller/kyc',
  });
}
