# Vantro Launch Page

## Required Environment Variables

Create a `.env.local` file with:

```
CLOUDINARY_CLOUD_NAME=d58eqxhp
CLOUDINARY_API_KEY=961696397527337
CLOUDINARY_API_SECRET=sD8bvK_x0Upjt4y1P5722lhNzl8
ADMIN_PASSWORD=your_chosen_admin_password
```

On Vercel, set these in the project Environment Variables settings.

## Routes

- `/` – Launch page (dynamic Cloudinary images in scrolling section)
- `/admin` – Image management (password protected)
- `/api/images` – GET list / POST upload signature
- `/api/images/delete` – POST delete image

## Deploy

Push to GitHub and connect to Vercel. Set environment variables in Vercel project settings.
