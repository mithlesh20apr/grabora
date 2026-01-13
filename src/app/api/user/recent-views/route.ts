import { NextRequest, NextResponse } from 'next/server';

// Example API route for syncing recent views to database
// Place this file at: src/app/api/user/recent-views/route.ts

interface RecentViewRequest {
  userId?: string;
  views: {
    productId: string;
    viewedAt: number;
  }[];
}

// POST /api/user/recent-views - Save recent views to database
export async function POST(request: NextRequest) {
  try {
    const body: RecentViewRequest = await request.json();
    const { userId, views } = body;

    // Validate request
    if (!views || !Array.isArray(views)) {
      return NextResponse.json(
        { error: 'Invalid views data' },
        { status: 400 }
      );
    }

    // TODO: Replace with your actual database logic
    // Example with MongoDB/Mongoose:
    /*
    const session = await getServerSession();
    const actualUserId = userId || session?.user?.id;

    if (!actualUserId) {
      // For anonymous users, you might want to use a session ID
      // or skip database storage
      return NextResponse.json(
        { success: true, message: 'Views saved locally only' },
        { status: 200 }
      );
    }

    // Save to database
    await RecentView.updateMany(
      { userId: actualUserId },
      {
        $set: {
          views: views.map(v => ({
            productId: v.productId,
            viewedAt: new Date(v.viewedAt)
          })),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    */

    // For now, just return success (views are stored in localStorage on client)

    return NextResponse.json({
      success: true,
      message: 'Recent views saved successfully',
      count: views.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save recent views' },
      { status: 500 }
    );
  }
}

// GET /api/user/recent-views - Get recent views from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // TODO: Replace with your actual database logic
    /*
    const session = await getServerSession();
    const actualUserId = userId || session?.user?.id;

    if (!actualUserId) {
      return NextResponse.json({ views: [] });
    }

    const userViews = await RecentView.findOne({ userId: actualUserId })
      .populate('views.productId')
      .lean();

    if (!userViews) {
      return NextResponse.json({ views: [] });
    }

    const formattedViews = userViews.views.map(view => ({
      _id: view.productId._id,
      title: view.productId.title,
      slug: view.productId.slug,
      price: view.productId.price,
      salePrice: view.productId.salePrice,
      imageUrl: view.productId.images[0],
      brand: view.productId.brand,
      viewedAt: view.viewedAt.getTime()
    }));

    return NextResponse.json({ views: formattedViews });
    */

    // For now, return empty array
    return NextResponse.json({
      views: [],
      message: 'Database integration pending'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recent views' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/recent-views - Clear all recent views
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // TODO: Replace with your actual database logic
    /*
    const session = await getServerSession();
    const actualUserId = userId || session?.user?.id;

    if (!actualUserId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    await RecentView.deleteOne({ userId: actualUserId });
    */


    return NextResponse.json({
      success: true,
      message: 'Recent views cleared successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear recent views' },
      { status: 500 }
    );
  }
}
