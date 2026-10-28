# Deploy Pathwise to Render and Vercel

The repository is a monorepo with three deployable directories:

- `frontend`: Vite/React site for Vercel
- `python-backend`: resume-analysis API for Render
- `backend`: career matching and quality-scoring API for Render

## 1. Deploy the APIs on Render

Create a new Render Blueprint from this repository and select the root
`render.yaml`. It creates these services in the Singapore region:

- `pathwise-python-api-dhruv`
- `pathwise-node-api-dhruv`

When Render prompts for `GROQ_API_KEY`, enter the key in the Render dashboard.
Never add the key to this repository.

After both health checks pass, record the two public `onrender.com` URLs.

## 2. Deploy the frontend on Vercel

Import the same GitHub repository into Vercel and set the project Root Directory
to `frontend`. Vercel will use `frontend/vercel.json` and build the Vite app into
`dist`.

Add these environment variables for Production, Preview, and Development:

```text
VITE_PYTHON_API_URL=https://<python-service>.onrender.com
VITE_NODE_API_URL=https://<node-service>.onrender.com
```

Redeploy the Vercel project after adding or changing environment variables.

## 3. Verify production

1. Open the Vercel URL and upload a supported resume.
2. Confirm the Python health endpoint returns HTTP 200 at `/api/health`.
3. Confirm the Node health endpoint returns HTTP 200 at `/api/health`.
4. Open a deep frontend route directly and confirm the SPA rewrite loads it.

For a custom frontend domain, add its exact origin to the Python Render
service as `FRONTEND_ORIGINS`. Multiple origins can be comma-separated.
