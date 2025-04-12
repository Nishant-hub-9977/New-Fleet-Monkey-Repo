# Render Deployment Configuration for Fleet Monkeys API

This file contains instructions for deploying the Fleet Monkeys API to Render.com.

## Prerequisites

1. A Render.com account
2. Access to the Fleet Monkeys backend code repository
3. Google Maps API key (for map functionality)

## Deployment Steps

1. Log in to your Render.com account
2. Create a new Web Service
3. Connect to your GitHub repository or upload the code directly
4. Configure the service using the settings in the `render.yaml` file
5. Set up the following environment variables:
   - NODE_ENV=production
   - PORT=10000
   - SERVER_HOST=0.0.0.0
   - CORS_ORIGIN=https://fleet-monkeys.netlify.app
   - ENABLE_CACHE=true
   - CACHE_TTL=3600
   - LOG_LEVEL=info
   - CLUSTER_MODE=true
   - WORKERS=auto
   - JWT_SECRET=[your-secure-jwt-secret]
   - JWT_EXPIRES_IN=24h
   - SSL_ENABLED=false
   - GOOGLE_MAPS_API_KEY=[your-google-maps-api-key]

6. Deploy the service

## Monitoring and Maintenance

- The service includes a health check endpoint at `/health`
- Logs can be viewed in the Render dashboard
- Auto-deployment is enabled, so the service will automatically redeploy when changes are pushed to the repository

## Connecting to Frontend

The backend API is configured to accept requests from the frontend deployed at https://fleet-monkeys.netlify.app. If you deploy the frontend to a different URL, update the CORS_ORIGIN environment variable accordingly.

## Scaling

The service is configured to use cluster mode with automatic worker allocation based on available CPU cores. This provides good performance scaling for most workloads. For higher traffic scenarios, you can adjust the instance type in the Render dashboard.
