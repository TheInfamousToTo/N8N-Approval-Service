import { Request, Response, Router } from 'express';
import prisma from '../db/prisma';

const router = Router();

/**
 * GET /api/v1/settings
 * Get all settings
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findMany();
    
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return res.status(200).json({
      success: true,
      data: settingsMap
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/v1/settings
 * Update multiple settings at once
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Settings must be an object'
      });
    }

    const allowedKeys = ['discord_webhook_url', 'n8n_base_url'];
    const updates: Promise<any>[] = [];

    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key)) {
        continue;
      }

      if (typeof value !== 'string') {
        continue;
      }

      updates.push(
        prisma.settings.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      );
    }

    await Promise.all(updates);

    const updatedSettings = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    updatedSettings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settingsMap
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update settings'
    });
  }
});

/**
 * GET /api/v1/settings/:key
 * Get a specific setting
 */
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const setting = await prisma.settings.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Setting not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        key: setting.key,
        value: setting.value
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch setting'
    });
  }
});

/**
 * PUT /api/v1/settings/:key
 * Update a specific setting
 */
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const allowedKeys = ['discord_webhook_url', 'n8n_base_url'];
    
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid setting key'
      });
    }

    if (typeof value !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Value must be a string'
      });
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    return res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: {
        key: setting.key,
        value: setting.value
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update setting'
    });
  }
});

export default router;
