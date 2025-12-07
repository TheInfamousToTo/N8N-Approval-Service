import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Link,
} from '@mui/material'
import { Save as SaveIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material'
import { settingsApi } from '../api'

export default function Setup() {
  const [settings, setSettings] = useState({
    discord_webhook_url: '',
    n8n_base_url: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsApi.getAll()
      setSettings({
        discord_webhook_url: response.data.discord_webhook_url || '',
        n8n_base_url: response.data.n8n_base_url || '',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to load settings',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await settingsApi.update(settings)
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to save settings',
        severity: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const appUrl = window.location.origin

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
        Setup
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Configuration
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Discord Webhook URL"
              value={settings.discord_webhook_url}
              onChange={(e) =>
                setSettings({ ...settings, discord_webhook_url: e.target.value })
              }
              placeholder="https://discord.com/api/webhooks/..."
              fullWidth
              helperText="Used to send approval notifications to your Discord channel"
            />

            <TextField
              label="n8n Base URL (Optional)"
              value={settings.n8n_base_url}
              onChange={(e) =>
                setSettings({ ...settings, n8n_base_url: e.target.value })
              }
              placeholder="https://your-n8n-instance.com"
              fullWidth
              helperText="For reference only - callback URLs are passed per-post"
            />

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ alignSelf: 'flex-start' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            API Endpoints
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Use these endpoints to integrate with your n8n workflows
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Submit Post (n8n Workflow 1)
              </Typography>
              <Box
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  p: 1.5,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  overflowX: 'auto',
                }}
              >
                <Box component="span" sx={{ color: '#4ade80', fontWeight: 600 }}>POST</Box> {appUrl}/api/v1/posts/submit
              </Box>
              <Typography variant="caption" color="text.secondary">
                Send: {`{ "content": "...", "source": "...", "n8n_callback_url": "..." }`}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Approve Post (Discord Link)
              </Typography>
              <Box
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  p: 1.5,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  overflowX: 'auto',
                }}
              >
                <Box component="span" sx={{ color: '#60a5fa', fontWeight: 600 }}>GET</Box> {appUrl}/api/v1/posts/{'{post_id}'}/approve
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Reject Post (Discord Link)
              </Typography>
              <Box
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  p: 1.5,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  overflowX: 'auto',
                }}
              >
                <Box component="span" sx={{ color: '#60a5fa', fontWeight: 600 }}>GET</Box> {appUrl}/api/v1/posts/{'{post_id}'}/reject
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Mark as Posted (n8n Workflow 2)
              </Typography>
              <Box
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  p: 1.5,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  overflowX: 'auto',
                }}
              >
                <Box component="span" sx={{ color: '#f59e0b', fontWeight: 600 }}>PUT</Box> {appUrl}/api/v1/posts/{'{post_id}'}/posted
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            n8n Workflow Setup Guide
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="primary">
                Workflow 1: Post Submission
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Create your content generation workflow
                <br />
                2. Add an HTTP Request node to POST to the Submit endpoint
                <br />
                3. Include the content, source name, and the Webhook URL of Workflow 2
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="primary">
                Workflow 2: Post to LinkedIn
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Create a Webhook trigger node (this URL goes in n8n_callback_url)
                <br />
                2. Add your LinkedIn posting logic
                <br />
                3. After successful post, call the /posted endpoint to update status
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="primary">
                Discord Setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Go to your Discord server settings → Integrations → Webhooks
                <br />
                2. Create a new webhook and copy the URL
                <br />
                3. Paste it in the Discord Webhook URL field above
              </Typography>
              <Link
                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                target="_blank"
                rel="noopener"
                sx={{ display: 'inline-flex', alignItems: 'center', mt: 1 }}
              >
                Discord Webhooks Guide <OpenInNewIcon sx={{ ml: 0.5, fontSize: 16 }} />
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
