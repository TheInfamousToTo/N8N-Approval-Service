import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Grid,
  Snackbar,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Send as PostedIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
} from '@mui/icons-material'
import { postsApi } from '../api'
import { Post, Stats } from '../types'

const statusConfig = {
  PENDING: { color: 'warning' as const, icon: <PendingIcon />, label: 'Pending' },
  APPROVED: { color: 'info' as const, icon: <ApprovedIcon />, label: 'Approved' },
  REJECTED: { color: 'error' as const, icon: <RejectedIcon />, label: 'Rejected' },
  POSTED: { color: 'success' as const, icon: <PostedIcon />, label: 'Posted' },
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(1)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const statusFilters = ['', 'PENDING', 'APPROVED', 'REJECTED', 'POSTED']

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const statusFilter = statusFilters[activeTab]
      const [postsResponse, statsResponse] = await Promise.all([
        postsApi.getAll({ status: statusFilter || undefined }),
        postsApi.getStats(),
      ])

      setPosts(postsResponse.data)
      setStats(statsResponse.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return

    try {
      await postsApi.delete(id)
      setSnackbar({ open: true, message: 'Post deleted successfully', severity: 'success' })
      loadData()
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete post',
        severity: 'error',
      })
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await postsApi.approve(id)
      setSnackbar({ open: true, message: 'Post approved and sent for posting!', severity: 'success' })
      loadData()
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to approve post',
        severity: 'error',
      })
    }
  }

  const handleReject = async (id: number) => {
    if (!window.confirm('Are you sure you want to reject this post?')) return

    try {
      await postsApi.reject(id)
      setSnackbar({ open: true, message: 'Post rejected', severity: 'success' })
      loadData()
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to reject post',
        severity: 'error',
      })
    }
  }

  const handleViewDetails = (post: Post) => {
    setSelectedPost(post)
    setDetailsOpen(true)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>
          Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  Pending
                </Typography>
                <Typography variant="h4" color="warning.main" fontWeight={600}>
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  Approved
                </Typography>
                <Typography variant="h4" color="info.main" fontWeight={600}>
                  {stats.approved}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  Rejected
                </Typography>
                <Typography variant="h4" color="error.main" fontWeight={600}>
                  {stats.rejected}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  Posted
                </Typography>
                <Typography variant="h4" color="success.main" fontWeight={600}>
                  {stats.posted}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Posts Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab label="All" />
            <Tab label="Pending" />
            <Tab label="Approved" />
            <Tab label="Rejected" />
            <Tab label="Posted" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : posts.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No posts found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Content</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} hover>
                      <TableCell>{post.id}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" noWrap>
                          {truncateContent(post.content)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {post.source || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusConfig[post.status].label}
                          color={statusConfig[post.status].color}
                          icon={statusConfig[post.status].icon}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(post.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {post.status === 'PENDING' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApprove(post.id)}
                              >
                                <ThumbUpIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleReject(post.id)}
                              >
                                <ThumbDownIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(post)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(post.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Post Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Post Details</DialogTitle>
        <DialogContent>
          {selectedPost && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ID
                  </Typography>
                  <Typography>{selectedPost.id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    size="small"
                    label={statusConfig[selectedPost.status].label}
                    color={statusConfig[selectedPost.status].color}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography>{selectedPost.source || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography>{formatDate(selectedPost.created_at)}</Typography>
                </Grid>
                {selectedPost.approved_at && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Approved At
                    </Typography>
                    <Typography>{formatDate(selectedPost.approved_at)}</Typography>
                  </Grid>
                )}
                {selectedPost.posted_at && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Posted At
                    </Typography>
                    <Typography>{formatDate(selectedPost.posted_at)}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    n8n Callback URL
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      backgroundColor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                    }}
                  >
                    {selectedPost.n8n_callback_url}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Content
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mt: 1,
                      maxHeight: 300,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedPost.content}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
