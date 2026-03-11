# Background Video

Place your food motion background video here.

## Instructions:

1. **Video File Requirements:**
   - Filename: `food-bg.mp4`
   - Format: MP4 (H.264 codec)
   - Resolution: 1920x1080 (Full HD) or higher
   - Duration: 5-10 seconds (will loop)
   - File size: Keep under 10MB for optimal performance

2. **How to add:**
   - Place your `food-bg.mp4` video in this directory

3. **Recommended Sources:**
   - Pexels (pexels.com) - Free stock videos
   - Pixabay (pixabay.com) - Free stock videos
   - Search for: "food background video", "cooking video background", "food motion"

4. **Video Optimization:**
   ```bash
   # If you have ffmpeg installed, optimize the video:
   ffmpeg -i input-video.mp4 -vcodec h264 -acodec aac -crf 28 food-bg.mp4
   ```

The video will automatically play on all login pages with a semi-transparent dark overlay for better text readability.
