import { Request, Response, Router } from 'express';
import prisma from '../db/prisma';
import { DiscordService } from '../services/discord.service';
import fetch from 'node-fetch';

const router = Router();

/**
 * POST /api/v1/posts/submit
 * Ingestion endpoint from n8n Workflow 1 (Submission)
 * Accepts: { content, source?, n8n_callback_url }
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { content, source, n8n_callback_url } = req.body;

    // Validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required and must be a string'
      });
    }

    if (!n8n_callback_url || typeof n8n_callback_url !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'n8n_callback_url is required and must be a string'
      });
    }

    // Create the post in the database
    const post = await prisma.post.create({
      data: {
        content,
        source: source || null,
        n8nCallbackUrl: n8n_callback_url,
        status: 'PENDING'
      }
    });

    // Trigger Discord notification (non-blocking)
    DiscordService.sendApprovalNotification(post.id, content, source)
      .catch(err => console.error('Discord notification failed:', err));

    // Respond with 202 Accepted
    return res.status(202).json({
      success: true,
      message: 'Post submitted successfully and pending approval',
      data: {
        id: post.id,
        status: post.status,
        created_at: post.createdAt
      }
    });
  } catch (error) {
    console.error('Error submitting post:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit post'
    });
  }
});

/**
 * GET /api/v1/posts/:id/approve
 * Approval endpoint - triggers n8n Workflow 2 (Posting)
 */
router.get('/:id/approve', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const wantsJson = req.headers.accept?.includes('application/json');

    if (isNaN(postId)) {
      if (wantsJson) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid post ID' });
      }
      return res.status(400).send(generateHtmlResponse('Error', 'Invalid post ID', 'error'));
    }

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      if (wantsJson) {
        return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
      }
      return res.status(404).send(generateHtmlResponse('Not Found', 'Post not found', 'error'));
    }

    if (post.status !== 'PENDING') {
      if (wantsJson) {
        return res.status(400).json({ error: 'Bad Request', message: `This post has already been ${post.status.toLowerCase()}.` });
      }
      return res.status(400).send(generateHtmlResponse(
        'Already Processed',
        `This post has already been ${post.status.toLowerCase()}.`,
        'warning'
      ));
    }

    // Update status to APPROVED
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });

    // Send callback to n8n Workflow 2
    try {
      const callbackResponse = await fetch(post.n8nCallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: post.id,
          status: 'APPROVED',
          post_content: post.content
        })
      });

      if (!callbackResponse.ok) {
        console.error('n8n callback failed:', callbackResponse.status);
      }
    } catch (callbackError) {
      console.error('Failed to call n8n callback URL:', callbackError);
    }

    // Send Discord status update (non-blocking)
    DiscordService.sendStatusUpdate(postId, 'APPROVED', post.content)
      .catch(err => console.error('Discord status update failed:', err));

    if (wantsJson) {
      return res.status(200).json({
        success: true,
        message: 'Post approved and sent for posting',
        data: { id: updatedPost.id, status: updatedPost.status, approved_at: updatedPost.approvedAt }
      });
    }

    return res.status(200).send(generateHtmlResponse(
      'Post Approved',
      'Post Approved. Pushing to LinkedIn.',
      'success'
    ));
  } catch (error) {
    console.error('Error approving post:', error);
    const wantsJson = req.headers.accept?.includes('application/json');
    if (wantsJson) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to approve post' });
    }
    return res.status(500).send(generateHtmlResponse('Error', 'Failed to approve post', 'error'));
  }
});

/**
 * GET /api/v1/posts/:id/reject
 * Rejection endpoint
 */
router.get('/:id/reject', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const wantsJson = req.headers.accept?.includes('application/json');

    if (isNaN(postId)) {
      if (wantsJson) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid post ID' });
      }
      return res.status(400).send(generateHtmlResponse('Error', 'Invalid post ID', 'error'));
    }

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      if (wantsJson) {
        return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
      }
      return res.status(404).send(generateHtmlResponse('Not Found', 'Post not found', 'error'));
    }

    if (post.status !== 'PENDING') {
      if (wantsJson) {
        return res.status(400).json({ error: 'Bad Request', message: `This post has already been ${post.status.toLowerCase()}.` });
      }
      return res.status(400).send(generateHtmlResponse(
        'Already Processed',
        `This post has already been ${post.status.toLowerCase()}.`,
        'warning'
      ));
    }

    // Update status to REJECTED
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'REJECTED'
      }
    });

    // Send Discord status update (non-blocking)
    DiscordService.sendStatusUpdate(postId, 'REJECTED', post.content)
      .catch(err => console.error('Discord status update failed:', err));

    if (wantsJson) {
      return res.status(200).json({
        success: true,
        message: 'Post rejected',
        data: { id: updatedPost.id, status: updatedPost.status }
      });
    }

    return res.status(200).send(generateHtmlResponse(
      'Post Rejected',
      'Post Rejected. No action taken.',
      'success'
    ));
  } catch (error) {
    console.error('Error rejecting post:', error);
    const wantsJson = req.headers.accept?.includes('application/json');
    if (wantsJson) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to reject post' });
    }
    return res.status(500).send(generateHtmlResponse('Error', 'Failed to reject post', 'error'));
  }
});

/**
 * PUT/POST /api/v1/posts/:id/posted
 * Confirmation endpoint from n8n Workflow 2 after LinkedIn post is successful
 */
router.put('/:id/posted', handlePostedConfirmation);
router.post('/:id/posted', handlePostedConfirmation);

async function handlePostedConfirmation(req: Request, res: Response) {
  try {
    const postId = parseInt(req.params.id, 10);

    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid post ID'
      });
    }

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Post not found'
      });
    }

    if (post.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Cannot mark post as posted. Current status: ${post.status}`
      });
    }

    // Update status to POSTED
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'POSTED',
        postedAt: new Date()
      }
    });

    // Send Discord status update (non-blocking)
    DiscordService.sendStatusUpdate(postId, 'POSTED', post.content)
      .catch(err => console.error('Discord status update failed:', err));

    return res.status(200).json({
      success: true,
      message: 'Post marked as posted successfully',
      data: {
        id: updatedPost.id,
        status: updatedPost.status,
        posted_at: updatedPost.postedAt
      }
    });
  } catch (error) {
    console.error('Error marking post as posted:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark post as posted'
    });
  }
}

/**
 * GET /api/v1/posts
 * List all posts with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status.toUpperCase();
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10) || 50, 100),
      skip: parseInt(offset as string, 10) || 0
    });

    const total = await prisma.post.count({ where });

    return res.status(200).json({
      success: true,
      data: posts.map(post => ({
        id: post.id,
        content: post.content,
        source: post.source,
        status: post.status,
        n8n_callback_url: post.n8nCallbackUrl,
        created_at: post.createdAt,
        approved_at: post.approvedAt,
        posted_at: post.postedAt
      })),
      pagination: {
        total,
        limit: parseInt(limit as string, 10) || 50,
        offset: parseInt(offset as string, 10) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch posts'
    });
  }
});

/**
 * GET /api/v1/posts/:id
 * Get a single post by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10);

    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid post ID'
      });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Post not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: post.id,
        content: post.content,
        source: post.source,
        status: post.status,
        n8n_callback_url: post.n8nCallbackUrl,
        created_at: post.createdAt,
        approved_at: post.approvedAt,
        posted_at: post.postedAt
      }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch post'
    });
  }
});

/**
 * DELETE /api/v1/posts/:id
 * Delete a post by ID
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id, 10);

    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid post ID'
      });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Post not found'
      });
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete post'
    });
  }
});

/**
 * GET /api/v1/posts/stats/summary
 * Get summary statistics
 */
router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const [pending, approved, rejected, posted] = await Promise.all([
      prisma.post.count({ where: { status: 'PENDING' } }),
      prisma.post.count({ where: { status: 'APPROVED' } }),
      prisma.post.count({ where: { status: 'REJECTED' } }),
      prisma.post.count({ where: { status: 'POSTED' } })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        posted,
        total: pending + approved + rejected + posted
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * Helper function to generate HTML response pages
 */
function generateHtmlResponse(title: string, message: string, type: 'success' | 'error' | 'warning'): string {
  const colors = {
    success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    warning: { bg: '#fff3cd', border: '#ffeeba', text: '#856404' }
  };

  const color = colors[type];
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - N8N Approval Service</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .emoji {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #333;
      margin-bottom: 16px;
      font-size: 24px;
    }
    .message {
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: ${color.text};
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 16px;
    }
    .back-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${emoji}</div>
    <h1>${title}</h1>
    <div class="message">${message}</div>
    <a href="/" class="back-link">← Back to Dashboard</a>
  </div>
</body>
</html>
  `.trim();
}

export default router;
