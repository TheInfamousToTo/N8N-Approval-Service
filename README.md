# N8N Approval Service

A production-ready human-in-the-loop approval system for n8n workflows. This service acts as a bridge between your n8n content generation workflow and your posting workflow, allowing manual approval via Discord before content gets published.

![Dashboard Preview]()

## 🎯 Features

- **Post Submission API**: Receive posts from n8n with automatic Discord notifications
- **Discord Integration**: Rich embed notifications with clickable Approve/Reject buttons
- **Two-Workflow Model**: Separates content generation from posting for clean workflow design
- **Dashboard**: React-based UI with status filtering and post management
- **Configuration Page**: Easy setup for Discord webhooks and n8n integration
- **PostgreSQL Storage**: Reliable persistence for all posts and settings
- **Docker Ready**: Full containerization with docker-compose

## 🏗️ Architecture

```
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│  n8n Workflow 1 │────▶│  N8N Approval Service │────▶│     Discord     │
│ (Content Gen)   │     │                       │     │   (Approval)    │
└─────────────────┘     └───────────────────────┘     └────────┬────────┘
                                    │                          │
                                    │◀─────────────────────────┘
                                    │      (Approve/Reject)
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  n8n Workflow 2       │
                        │  (Post to LinkedIn)   │
                        └───────────────────────┘
```

## 📋 Prerequisites

- Docker and Docker Compose
- Discord server with webhook access
- n8n instance (self-hosted or cloud)

## 🚀 Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd N8N-Approval-Service

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 2. Start with Docker Compose

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 3. Access the Dashboard

Open your browser and navigate to `http://localhost:3001`

### 4. Configure Discord

1. Go to the **Setup** page (`/setup`)
2. Enter your Discord Webhook URL
3. Click **Save Settings**

## 📡 API Endpoints

### Submit a Post (from n8n Workflow 1)

```http
POST /api/v1/posts/submit
Content-Type: application/json

{
  "content": "Your post content here...",
  "source": "LinkedIn AI Generator",
  "n8n_callback_url": "https://your-n8n.com/webhook/abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post submitted successfully and pending approval",
  "data": {
    "id": 1,
    "status": "PENDING",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Approve a Post (Discord Link)

```http
GET /api/v1/posts/{post_id}/approve
```

Returns HTML confirmation page and triggers callback to n8n Workflow 2.

### Reject a Post (Discord Link)

```http
GET /api/v1/posts/{post_id}/reject
```

Returns HTML confirmation page. No callback is sent.

### Mark Post as Posted (from n8n Workflow 2)

```http
PUT /api/v1/posts/{post_id}/posted
```

**Response:**
```json
{
  "success": true,
  "message": "Post marked as posted successfully",
  "data": {
    "id": 1,
    "status": "POSTED",
    "posted_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### List Posts

```http
GET /api/v1/posts?status=PENDING&limit=50&offset=0
```

### Get Post Statistics

```http
GET /api/v1/posts/stats/summary
```

## ⚙️ n8n Workflow Setup

### Workflow 1: Content Submission

1. **Content Generation Node**: Create your content (AI, manual, etc.)
2. **HTTP Request Node**:
   - Method: `POST`
   - URL: `http://your-approval-service:3001/api/v1/posts/submit`
   - Body:
     ```json
     {
       "content": "{{ $json.generated_content }}",
       "source": "My Content Workflow",
       "n8n_callback_url": "https://your-n8n.com/webhook/posting-workflow"
     }
     ```

### Workflow 2: Posting (Triggered by Approval)

1. **Webhook Trigger**: Create a webhook (use this URL as `n8n_callback_url`)
2. **LinkedIn Node**: Post the content from `{{ $json.post_content }}`
3. **HTTP Request Node** (after successful post):
   - Method: `PUT`
   - URL: `http://your-approval-service:3001/api/v1/posts/{{ $json.post_id }}/posted`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `APP_URL` | Public URL of the service | `http://localhost:3001` |
| `DATABASE_URL` | PostgreSQL connection string | (see docker-compose) |
| `DB_PASSWORD` | Database password | `approval_pass` |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | (optional) |
| `N8N_BASE_URL` | n8n base URL (reference only) | (optional) |

### Database

The service uses PostgreSQL with the following schema:

**Posts Table:**
- `id` - Primary key
- `content` - Post content (TEXT)
- `source` - Source/workflow name (VARCHAR)
- `status` - PENDING, APPROVED, REJECTED, POSTED
- `n8n_callback_url` - Callback URL for Workflow 2
- `created_at` - Creation timestamp
- `approved_at` - Approval timestamp
- `posted_at` - Posted timestamp

**Settings Table:**
- `key` - Setting key (unique)
- `value` - Setting value

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Reset database
docker-compose down -v
docker-compose up -d
```

## 🛠️ Development

### Local Development Setup

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Generate Prisma client
npm run prisma:generate

# Start PostgreSQL (or use docker-compose)
docker-compose up -d db

# Run database migrations
DATABASE_URL="postgresql://approval_user:approval_pass@localhost:5432/approval_db" npm run prisma:migrate:dev

# Start backend in dev mode
npm run dev

# In another terminal, start frontend
cd frontend && npm run dev
```

### Project Structure

```
N8N-Approval-Service/
├── src/
│   ├── index.ts              # Express server entry
│   ├── db/
│   │   └── prisma.ts         # Prisma client
│   ├── routes/
│   │   ├── posts.routes.ts   # Posts API endpoints
│   │   └── settings.routes.ts # Settings API endpoints
│   └── services/
│       └── discord.service.ts # Discord webhook integration
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # React entry point
│   │   ├── api/              # API client
│   │   ├── components/       # Shared components
│   │   ├── pages/            # Page components
│   │   └── types/            # TypeScript types
│   └── ...
├── prisma/
│   └── schema.prisma         # Database schema
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 📄 License

MIT License - see LICENSE file for details.

## ❤️ Support

If you find this project useful, consider supporting:

- ⭐ [Star on GitHub](https://github.com/TheInfamousToTo/N8N-Approval-Service)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/theinfamoustoto)
- ❤️ [Support on Ko-fi](https://ko-fi.com/theinfamoustoto)
- 💖 [GitHub Sponsors](https://github.com/sponsors/TheInfamousToTo)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
