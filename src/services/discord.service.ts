import fetch from 'node-fetch';
import prisma from '../db/prisma';

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds: DiscordEmbed[];
}

export class DiscordService {
  /**
   * Get the Discord webhook URL from settings
   */
  static async getWebhookUrl(): Promise<string | null> {
    const setting = await prisma.settings.findUnique({
      where: { key: 'discord_webhook_url' }
    });
    return setting?.value || process.env.DISCORD_WEBHOOK_URL || null;
  }

  /**
   * Send a notification to Discord for a new pending post
   */
  static async sendApprovalNotification(
    postId: number,
    content: string,
    source?: string
  ): Promise<boolean> {
    const webhookUrl = await this.getWebhookUrl();
    
    if (!webhookUrl) {
      console.warn('Discord webhook URL not configured');
      return false;
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const approveUrl = `${appUrl}/api/v1/posts/${postId}/approve`;
    const rejectUrl = `${appUrl}/api/v1/posts/${postId}/reject`;

    // Truncate content for display if too long
    const displayContent = content.length > 1000 
      ? content.substring(0, 997) + '...' 
      : content;

    const embed: DiscordEmbed = {
      title: '📝 New Post Pending Approval',
      description: displayContent,
      color: 0xFFA500, // Orange color for pending
      fields: [
        {
          name: '🔗 Actions',
          value: `[✅ Approve](${approveUrl}) | [❌ Reject](${rejectUrl})`,
          inline: false
        }
      ],
      footer: {
        text: `Post ID: ${postId}${source ? ` | Source: ${source}` : ''}`
      },
      timestamp: new Date().toISOString()
    };

    if (source) {
      embed.fields?.unshift({
        name: '📁 Source',
        value: source,
        inline: true
      });
    }

    const message: DiscordMessage = {
      embeds: [embed]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        console.error('Discord webhook failed:', response.status, await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      return false;
    }
  }

  /**
   * Send a status update notification
   */
  static async sendStatusUpdate(
    postId: number,
    status: 'APPROVED' | 'REJECTED' | 'POSTED',
    content?: string
  ): Promise<boolean> {
    const webhookUrl = await this.getWebhookUrl();
    
    if (!webhookUrl) {
      return false;
    }

    const statusConfig = {
      APPROVED: { emoji: '✅', color: 0x00FF00, text: 'Approved' },
      REJECTED: { emoji: '❌', color: 0xFF0000, text: 'Rejected' },
      POSTED: { emoji: '🚀', color: 0x0099FF, text: 'Posted to LinkedIn' }
    };

    const config = statusConfig[status];
    
    const embed: DiscordEmbed = {
      title: `${config.emoji} Post ${config.text}`,
      description: content ? (content.length > 500 ? content.substring(0, 497) + '...' : content) : `Post #${postId} has been ${status.toLowerCase()}.`,
      color: config.color,
      footer: {
        text: `Post ID: ${postId}`
      },
      timestamp: new Date().toISOString()
    };

    const message: DiscordMessage = {
      embeds: [embed]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Discord status update:', error);
      return false;
    }
  }
}
